"""
Dashboard API server for Arbiter Guard.
Keeps trades in memory, supports rebalancing and adversarial test generation.
"""

import glob
import json
import os
import random
import time
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent.config import (
    LOG_DIR, TOKENS, UNISWAP_CHAIN_ID, UNISWAP_ROUTERS, AGENT_WALLET,
)

app = FastAPI(title="Arbiter Guard Dashboard API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory trade list (newest first)
_trades: list[dict] = []
_initialized = False

# Singleton attestation client (shared lock prevents nonce collisions)
_attestation_client = None
def _get_attestation_client():
    global _attestation_client
    if _attestation_client is None:
        from agent.attestation_client import AttestationClient
        _attestation_client = AttestationClient()
    return _attestation_client


def _load_initial_trades():
    """Load trades from the most recent audit log on startup."""
    global _trades, _initialized
    if _initialized:
        return
    pattern = os.path.join(LOG_DIR, "audit_*.json")
    files = sorted(glob.glob(pattern), reverse=True)
    for f in files:
        try:
            with open(f) as fh:
                data = json.load(fh)
                if data.get("trades"):
                    _trades = list(reversed(data["trades"]))  # newest first
                    break
        except Exception:
            continue
    _initialized = True


def _verify_and_record(intent: str, proposed_tx: dict, execute: bool = False) -> dict:
    """Run a single intent through verify -> execute -> attest and return the record."""
    from agent.arbiter_client import ArbiterClient
    from agent.attestation_client import AttestationClient
    from agent.uniswap_client import UniswapClient

    arbiter = ArbiterClient()
    uniswap = UniswapClient()
    attestation = _get_attestation_client()

    # Verify
    try:
        result = arbiter.validate(
            human_intent=intent,
            proposed_tx=proposed_tx,
        )
    except Exception as e:
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "attempt": 1,
            "intent": intent,
            "error": str(e),
        }

    # Execute if passed and requested
    execution = None
    exec_tx_hash = None
    if execute and result.passed:
        ex_params = proposed_tx.get("call", {}).get("params", {})
        swap_result = uniswap.execute_swap(
            token_in="WETH",
            token_out="USDC",
            amount_in=ex_params.get("amountIn", 0),
            amount_out_minimum=0,
            fee=ex_params.get("fee", 3000),
            deadline=ex_params.get("deadline", int(time.time()) + 1800),
        )
        if swap_result.success:
            exec_tx_hash = swap_result.tx_hash
        execution = {
            "mode": swap_result.mode,
            "success": swap_result.success,
            "tx_hash": swap_result.tx_hash,
            "block_number": swap_result.block_number,
            "gas_used": swap_result.gas_used,
            "explorer_url": swap_result.explorer_url,
            "error": swap_result.error,
        }

    # Attest (fire-and-forget -- don't block on block confirmation)
    import threading
    attest_data = {"success": True, "attestation_id": None, "tx_hash": None, "explorer_url": None, "error": None, "pending": True}

    # We'll store attest_data ref so the background thread can update it in place
    attest_ref = attest_data

    def _attest_background():
        try:
            ar = attestation.record(
                intent=intent,
                decision=result.decision,
                passed_nodes=len(result.passed_nodes),
                failed_nodes=len(result.failed_nodes),
                skipped_nodes=len(result.skipped_nodes),
                execution_tx_hash=exec_tx_hash,
                protocol=result.protocol or "uniswap",
            )
            # Update the trade record in place (picked up by next poll)
            attest_ref["success"] = ar.success
            attest_ref["attestation_id"] = ar.attestation_id
            attest_ref["tx_hash"] = ar.tx_hash
            attest_ref["explorer_url"] = ar.explorer_url
            attest_ref["error"] = ar.error
            attest_ref.pop("pending", None)
        except Exception as e:
            attest_ref["success"] = False
            attest_ref["error"] = str(e)
            attest_ref.pop("pending", None)

    threading.Thread(target=_attest_background, daemon=True).start()

    tx_params = proposed_tx.get("call", {}).get("params", {})
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "attempt": 1,
        "intent": intent,
        "token_in": "WETH",
        "token_out": "USDC",
        "amount_in": tx_params.get("amountIn", 0) / 1e18,
        "slippage_bps": proposed_tx.get("slippage_bps", 0),
        "chain_id": UNISWAP_CHAIN_ID,
        "proposed_tx": proposed_tx,
        "verification": {
            "decision": result.decision,
            "reason": result.reason,
            "protocol": result.protocol,
            "primary_failure_node": result.primary_failure_node,
            "llm_calls": result.llm_calls,
            "passed_nodes": result.passed_nodes,
            "failed_nodes": result.failed_nodes,
            "skipped_nodes": result.skipped_nodes,
            "explanation": result.explanation,
        },
        "execution": execution,
        "attestation": attest_data,
    }


# ── Adversarial scenario generators ─────────────────────

def _base_tx():
    tokens = TOKENS.get(UNISWAP_CHAIN_ID, {})
    router = UNISWAP_ROUTERS.get(UNISWAP_CHAIN_ID, {}).get("v3", "")
    now = int(time.time())
    amount = random.randint(5, 50) * 10**15  # 0.005 - 0.05 WETH
    return {
        "protocol": "uniswap",
        "to": router,
        "from": AGENT_WALLET,
        "value": "0",
        "call": {
            "function": "exactInputSingle",
            "params": {
                "tokenIn": tokens.get("WETH", ""),
                "tokenOut": tokens.get("USDC", ""),
                "fee": 3000,
                "recipient": AGENT_WALLET,
                "deadline": now + 1800,
                "amountIn": amount,
                "amountOutMinimum": int(amount * 0.995),
                "sqrtPriceLimitX96": 0,
            },
        },
        "slippage_bps": 50,
        "validTo": now + 1800,
        "metadata": {"ttl_secs": 1800, "generated_at_unix": now},
    }


ADVERSARIAL_SCENARIOS = [
    {
        "name": "Sanctioned address",
        "build": lambda: (
            "Swap 0.5 WETH for USDC, send to 0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c",
            {**_base_tx(), **{
                "call": {**_base_tx()["call"], "params": {
                    **_base_tx()["call"]["params"],
                    "recipient": "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c",
                    "amountIn": 500000000000000000,
                }},
            }},
        ),
    },
    {
        "name": "Wrong recipient",
        "build": lambda: (
            "Swap 0.05 WETH for USDC on Uniswap V3, send to my wallet",
            {**_base_tx(), **{
                "call": {**_base_tx()["call"], "params": {
                    **_base_tx()["call"]["params"],
                    "recipient": "0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b",  # OFAC (Tornado Cash deployer)
                    "amountIn": 50000000000000000,
                }},
            }},
        ),
    },
    {
        "name": "Intent mismatch (wrong tokens)",
        "build": lambda: (
            "Buy 100 DAI with USDC on Uniswap V3, slippage protection enabled",
            _base_tx(),  # tx swaps WETH->USDC but intent says DAI<->USDC
        ),
    },
    {
        "name": "Expired deadline",
        "build": lambda: (
            "Swap 0.01 WETH for USDC on Uniswap V3, deadline was 10 minutes ago",
            {**_base_tx(), **{
                "validTo": int(time.time()) - 600,
                "call": {**_base_tx()["call"], "params": {
                    **_base_tx()["call"]["params"],
                    "deadline": int(time.time()) - 600,
                    "amountIn": 10000000000000000,
                }},
                "metadata": {"ttl_secs": 1800, "generated_at_unix": int(time.time()) - 900},
            }},
        ),
    },
    {
        "name": "Unknown router contract",
        "build": lambda: (
            "Swap 0.05 WETH for USDC on Uniswap V3, slippage protection enabled",
            {**_base_tx(), "to": "0xdead000000000000000000000000000000000000"},
        ),
    },
    {
        "name": "Mismatched amounts",
        "build": lambda: (
            "Swap 0.001 WETH for USDC on Uniswap V3, slippage protection enabled",
            {**_base_tx(), **{
                "call": {**_base_tx()["call"], "params": {
                    **_base_tx()["call"]["params"],
                    "amountIn": 999000000000000000000,  # 999 WETH, way more than stated
                }},
            }},
        ),
    },
]


@app.on_event("startup")
def startup():
    _load_initial_trades()


@app.get("/api/status")
def status():
    return {"status": "ok", "trade_count": len(_trades)}


def _get_portfolio():
    """Read real balances from Sepolia."""
    try:
        from agent.uniswap_client import UniswapClient
        uc = UniswapClient()
        weth_raw = uc.get_balance("WETH")
        usdc_raw = uc.get_balance("USDC")
        weth = weth_raw / 1e18
        usdc = usdc_raw / 1e6
        weth_price = 2500.0
        usdc_price = 1.0
        total = weth * weth_price + usdc * usdc_price
        return {
            "balances": {"WETH": round(weth, 6), "USDC": round(usdc, 2)},
            "prices": {"WETH": weth_price, "USDC": usdc_price},
            "total_value_usd": round(total, 2),
            "allocation": {
                "WETH": round(weth * weth_price / total, 4) if total > 0 else 0,
                "USDC": round(usdc * usdc_price / total, 4) if total > 0 else 0,
            },
        }
    except Exception:
        return {
            "balances": {"WETH": 0, "USDC": 0},
            "prices": {"WETH": 2500.0, "USDC": 1.0},
            "total_value_usd": 0,
            "allocation": {"WETH": 0, "USDC": 0},
        }


@app.get("/api/latest")
def get_latest():
    """Return accumulated trades, newest first."""
    return {
        "run": {
            "run_timestamp": datetime.now(timezone.utc).isoformat(),
            "uniswap_mode": "live",
            "uniswap_chain_id": UNISWAP_CHAIN_ID,
            "attestation_contract": "0x708c3848f99a80732124344AebE6e9bBb5dA31D5",
            "portfolio": _get_portfolio(),
            "trades": _trades,
        }
    }


TARGET_ALLOC = {"WETH": 0.6, "USDC": 0.4}
REBALANCE_THRESHOLD = 0.05
SWAP_AMOUNT_WETH = 10000000000000000   # 0.01 WETH
SWAP_AMOUNT_USDC = 25000000             # 25 USDC (6 decimals)


def _build_swap_tx(token_in: str, token_out: str, amount_raw: int):
    """Build a proposed_tx for a swap in either direction."""
    tokens = TOKENS.get(UNISWAP_CHAIN_ID, {})
    router = UNISWAP_ROUTERS.get(UNISWAP_CHAIN_ID, {}).get("v3", "")
    now = int(time.time())
    return {
        "protocol": "uniswap",
        "to": router,
        "from": AGENT_WALLET,
        "value": "0",
        "call": {
            "function": "exactInputSingle",
            "params": {
                "tokenIn": tokens.get(token_in, ""),
                "tokenOut": tokens.get(token_out, ""),
                "fee": 3000,
                "recipient": AGENT_WALLET,
                "deadline": now + 1800,
                "amountIn": amount_raw,
                "amountOutMinimum": int(amount_raw * 0.995),
                "sqrtPriceLimitX96": 0,
            },
        },
        "slippage_bps": 50,
        "validTo": now + 1800,
        "metadata": {"ttl_secs": 1800, "generated_at_unix": now},
    }


@app.post("/api/run")
def trigger_rebalance():
    """Rebalance toward target allocation. Direction determined by current drift."""
    portfolio = _get_portfolio()
    alloc = portfolio["allocation"]
    weth_alloc = alloc.get("WETH", 0)
    usdc_alloc = alloc.get("USDC", 0)
    weth_drift = weth_alloc - TARGET_ALLOC["WETH"]

    if abs(weth_drift) < REBALANCE_THRESHOLD:
        return {"trade": None, "message": "Portfolio within tolerance, no rebalance needed"}

    if weth_drift > 0:
        # Overweight WETH -> sell WETH for USDC
        token_in, token_out = "WETH", "USDC"
        amount = SWAP_AMOUNT_WETH
        amount_human = f"{amount / 1e18:.4f}"
    else:
        # Overweight USDC -> sell USDC for WETH
        token_in, token_out = "USDC", "WETH"
        amount = SWAP_AMOUNT_USDC
        amount_human = f"{amount / 1e6:.2f}"

    intent = f"Swap {amount_human} {token_in} for {token_out} on Uniswap V3, slippage protection enabled, deadline 30 minutes"
    tx = _build_swap_tx(token_in, token_out, amount)

    record = _verify_and_record(intent, tx, execute=True)
    record["token_in"] = token_in
    record["token_out"] = token_out
    _trades.insert(0, record)
    return {"trade": record}


@app.post("/api/unbalance")
def trigger_unbalance():
    """Deliberately unbalance the portfolio (sell USDC for WETH or vice versa) to create rebalance opportunity."""
    portfolio = _get_portfolio()
    alloc = portfolio["allocation"]
    weth_alloc = alloc.get("WETH", 0)

    # Push away from target: if close to balanced, sell whichever is closer to target
    if weth_alloc < 0.7:
        # Buy more WETH to make it overweight
        token_in, token_out = "USDC", "WETH"
        amount = 50000000  # 50 USDC
        amount_human = "50.00"
    else:
        # Sell WETH to make USDC overweight
        token_in, token_out = "WETH", "USDC"
        amount = 30000000000000000  # 0.03 WETH
        amount_human = "0.0300"

    intent = f"Swap {amount_human} {token_in} for {token_out} on Uniswap V3, slippage protection enabled, deadline 30 minutes"
    tx = _build_swap_tx(token_in, token_out, amount)

    record = _verify_and_record(intent, tx, execute=True)
    record["token_in"] = token_in
    record["token_out"] = token_out
    record["scenario"] = "Deliberate unbalance"
    _trades.insert(0, record)
    return {"trade": record}


@app.get("/api/wallet")
def get_wallet():
    """Return the agent's wallet address."""
    from agent.uniswap_client import UniswapClient
    uc = UniswapClient()
    return {"wallet": uc.wallet, "chain_id": UNISWAP_CHAIN_ID}


@app.post("/api/adversarial")
def trigger_adversarial():
    """Generate a random adversarial transaction designed to fail Arbiter checks."""
    scenario = random.choice(ADVERSARIAL_SCENARIOS)
    intent, tx = scenario["build"]()

    record = _verify_and_record(intent, tx, execute=False)
    record["scenario"] = scenario["name"]
    _trades.insert(0, record)  # newest first
    return {"trade": record, "scenario": scenario["name"]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("agent.api:app", host="0.0.0.0", port=8001, reload=True)
