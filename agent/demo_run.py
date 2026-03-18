"""
Generate demo data: a sequence of real on-chain transactions showing
different Arbiter scenarios. Each one verifies, (optionally) executes,
and attests on Sepolia.
"""

import json
import os
import time
from datetime import datetime, timezone

from agent.arbiter_client import ArbiterClient
from agent.attestation_client import AttestationClient
from agent.config import (
    LOG_DIR, TOKENS, UNISWAP_CHAIN_ID, UNISWAP_ROUTERS, AGENT_WALLET,
)
from agent.uniswap_client import UniswapClient


TOKEN_DECIMALS = {"WETH": 18, "USDC": 6}


def build_tx(token_in, token_out, amount_raw):
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


SCENARIOS = [
    # 1. Clean rebalance WETH -> USDC (should PASS + execute)
    {
        "name": "Rebalance: sell WETH",
        "intent": "Rebalance portfolio: swap WETH for USDC on Uniswap V3, slippage protection enabled, deadline 30 minutes",
        "token_in": "WETH", "token_out": "USDC",
        "amount_raw": 5000000000000000,  # 0.005 WETH
        "execute": True,
    },
    # 2. Sanctioned address (should REJECT)
    {
        "name": "Sanctioned recipient",
        "intent": "Swap 0.5 WETH for USDC, send to 0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c",
        "token_in": "WETH", "token_out": "USDC",
        "amount_raw": 500000000000000000,
        "execute": False,
        "override_recipient": "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c",
    },
    # 3. Intent mismatch (should REJECT)
    {
        "name": "Intent mismatch",
        "intent": "Buy 100 DAI with USDC on Uniswap V3, slippage protection enabled",
        "token_in": "WETH", "token_out": "USDC",
        "amount_raw": 50000000000000000,
        "execute": False,
    },
    # 4. Expired deadline (should REJECT)
    {
        "name": "Expired deadline",
        "intent": None,  # set dynamically
        "token_in": "WETH", "token_out": "USDC",
        "amount_raw": 10000000000000000,
        "execute": False,
        "expired": True,
    },
    # 5. Unknown router (should REJECT)
    {
        "name": "Unknown router",
        "intent": "Rebalance portfolio: swap WETH for USDC on Uniswap V3, slippage protection enabled",
        "token_in": "WETH", "token_out": "USDC",
        "amount_raw": 100000000000000000,
        "execute": False,
        "override_router": "0xdead000000000000000000000000000000000000",
    },
    # 6. Clean rebalance USDC -> WETH (should PASS + execute)
    {
        "name": "Rebalance: buy WETH",
        "intent": "Rebalance portfolio: swap USDC for WETH on Uniswap V3, slippage protection enabled, deadline 30 minutes",
        "token_in": "USDC", "token_out": "WETH",
        "amount_raw": 25000000,  # 25 USDC
        "execute": True,
    },
]


def run():
    arbiter = ArbiterClient()
    uniswap = UniswapClient()
    attestation = AttestationClient()

    health = arbiter.health()
    print(f"Arbiter: {health['status']} (LLM: {health['llm']})")
    print(f"Uniswap: {uniswap.mode}")
    print(f"Running {len(SCENARIOS)} scenarios...\n")

    records = []

    for i, s in enumerate(SCENARIOS):
        print(f"{'='*60}")
        print(f"[{i+1}/{len(SCENARIOS)}] {s['name']}")
        print(f"{'='*60}")

        # Build tx
        tx = build_tx(s["token_in"], s["token_out"], s["amount_raw"])

        if s.get("override_recipient"):
            tx["call"]["params"]["recipient"] = s["override_recipient"]
        if s.get("override_router"):
            tx["to"] = s["override_router"]
        if s.get("expired"):
            expired_time = int(time.time()) - 600
            tx["validTo"] = expired_time
            tx["call"]["params"]["deadline"] = expired_time
            tx["metadata"]["generated_at_unix"] = int(time.time()) - 900
            utc_str = datetime.fromtimestamp(expired_time, tz=timezone.utc).strftime('%H:%M UTC')
            s["intent"] = f"Swap 0.01 WETH for USDC on Uniswap V3, deadline {utc_str}"

        intent = s["intent"]
        print(f"Intent: {intent}")

        # Verify
        result = arbiter.validate(human_intent=intent, proposed_tx=tx)
        print(f"  Decision: {result.decision} ({len(result.passed_nodes)}P/{len(result.failed_nodes)}F/{len(result.skipped_nodes)}S)")
        if result.primary_failure_node:
            print(f"  Failed: {result.primary_failure_node}")
            print(f"  Reason: {result.reason}")

        # Execute
        execution = None
        exec_tx_hash = None
        if s["execute"] and result.passed:
            print(f"  Executing {s['token_in']} -> {s['token_out']}...")
            swap_result = uniswap.execute_swap(
                token_in=s["token_in"],
                token_out=s["token_out"],
                amount_in=s["amount_raw"],
                amount_out_minimum=0,
                fee=3000,
                deadline=int(time.time()) + 1800,
            )
            if swap_result.success:
                print(f"  Executed: {swap_result.tx_hash}")
                exec_tx_hash = swap_result.tx_hash
            else:
                print(f"  Swap failed: {swap_result.error}")
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
        if attest_result.success:
            print(f"  Attested: {attest_result.tx_hash}")
        else:
            print(f"  Attestation: {str(attest_result.error)[:60]}")

        dec_in = TOKEN_DECIMALS.get(s["token_in"], 18)
        records.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "attempt": 1,
            "scenario": s["name"],
            "intent": intent,
            "token_in": s["token_in"],
            "token_out": s["token_out"],
            "amount_in": s["amount_raw"] / (10 ** dec_in),
            "slippage_bps": 50,
            "chain_id": UNISWAP_CHAIN_ID,
            "proposed_tx": tx,
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
        })
        print()
        time.sleep(1)  # small gap between scenarios

    # Get final portfolio
    weth = uniswap.get_balance("WETH") / 1e18
    usdc = uniswap.get_balance("USDC") / 1e6
    total = weth * 2500 + usdc

    # Save
    os.makedirs(LOG_DIR, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join(LOG_DIR, f"audit_{ts}.json")

    audit = {
        "run_timestamp": datetime.now(timezone.utc).isoformat(),
        "uniswap_mode": uniswap.mode,
        "uniswap_chain_id": UNISWAP_CHAIN_ID,
        "attestation_contract": attestation.contract.address,
        "portfolio": {
            "balances": {"WETH": round(weth, 6), "USDC": round(usdc, 2)},
            "prices": {"WETH": 2500.0, "USDC": 1.0},
            "total_value_usd": round(total, 2),
            "allocation": {
                "WETH": round(weth * 2500 / total, 4) if total else 0,
                "USDC": round(usdc / total, 4) if total else 0,
            },
        },
        "trades": records,
    }

    with open(log_file, "w") as f:
        json.dump(audit, f, indent=2, default=str)

    import shutil
    shutil.copy(log_file, os.path.join("examples", "sample_audit.json"))

    print(f"Saved: {log_file}")
    print(f"Updated: examples/sample_audit.json")

    passed = sum(1 for r in records if r["verification"]["decision"] == "PASS")
    rejected = sum(1 for r in records if r["verification"]["decision"] == "REJECT")
    executed = sum(1 for r in records if (r.get("execution") or {}).get("success"))
    print(f"\nResults: {passed} passed, {rejected} rejected, {executed} executed")
    print(f"Portfolio: WETH {weth:.4f} ({weth*2500/total*100:.1f}%) | USDC {usdc:.0f} ({usdc/total*100:.1f}%)")

    rep = attestation.get_reputation()
    if "error" not in rep:
        print(f"On-chain: {rep['attestation_count']} attestations, {rep['pass_rate']} pass rate")


if __name__ == "__main__":
    run()
