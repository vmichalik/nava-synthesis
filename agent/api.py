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
    attestation = AttestationClient()

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

    # Attest
    attest_data = None
    attest_result = attestation.record(
        intent=intent,
        decision=result.decision,
        passed_nodes=len(result.passed_nodes),
        failed_nodes=len(result.failed_nodes),
        skipped_nodes=len(result.skipped_nodes),
        execution_tx_hash=exec_tx_hash,
        protocol=result.protocol or "uniswap",
    )
    attest_data = {
        "success": attest_result.success,
        "attestation_id": attest_result.attestation_id,
        "tx_hash": attest_result.tx_hash,
        "explorer_url": attest_result.explorer_url,
        "error": attest_result.error,
    }

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
        "name": "No slippage protection",
        "build": lambda: (
            "Swap 0.1 WETH for USDC on Uniswap V3, no minimum output",
            {**_base_tx(), **{
                "slippage_bps": 0,
                "call": {**_base_tx()["call"], "params": {
                    **_base_tx()["call"]["params"],
                    "amountOutMinimum": 0,
                    "amountIn": 100000000000000000,
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


@app.get("/api/latest")
def get_latest():
    """Return accumulated trades, newest first."""
    return {
        "run": {
            "run_timestamp": datetime.now(timezone.utc).isoformat(),
            "uniswap_mode": "live",
            "uniswap_chain_id": UNISWAP_CHAIN_ID,
            "attestation_contract": "0x708c3848f99a80732124344AebE6e9bBb5dA31D5",
            "portfolio": {
                "balances": {"WETH": 0.41, "USDC": 497.0},
                "prices": {"WETH": 2500.0, "USDC": 1.0},
                "total_value_usd": 1522.0,
                "allocation": {"WETH": 0.6735, "USDC": 0.3265},
            },
            "trades": _trades,
        }
    }


@app.post("/api/run")
def trigger_rebalance():
    """Run a real rebalance: verify, execute on Uniswap, attest on-chain."""
    tokens = TOKENS.get(UNISWAP_CHAIN_ID, {})
    router = UNISWAP_ROUTERS.get(UNISWAP_CHAIN_ID, {}).get("v3", "")
    now = int(time.time())
    amount = 5000000000000000  # 0.005 WETH (small to conserve balance)

    intent = "Swap 0.005 WETH for USDC on Uniswap V3, slippage protection enabled, deadline 30 minutes"
    tx = {
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

    record = _verify_and_record(intent, tx, execute=True)
    _trades.insert(0, record)  # newest first
    return {"trade": record}


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
