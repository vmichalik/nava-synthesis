"""
Run multiple verification scenarios against the Arbiter to demonstrate
different safety checks. Produces a rich audit log with PASS, REJECT,
and various failure modes.
"""

import json
import os
import time
from datetime import datetime, timezone

from agent.arbiter_client import ArbiterClient
from agent.attestation_client import AttestationClient
from agent.config import LOG_DIR, TOKENS, UNISWAP_CHAIN_ID, UNISWAP_ROUTERS, AGENT_WALLET
from agent.uniswap_client import UniswapClient


SCENARIOS = [
    # 1. Clean swap - should PASS
    {
        "name": "Normal rebalance",
        "intent": "Swap 0.02 WETH for USDC on Uniswap V3, slippage protection enabled, deadline 30 minutes",
        "tx": {
            "protocol": "uniswap",
            "to": UNISWAP_ROUTERS.get(UNISWAP_CHAIN_ID, {}).get("v3", ""),
            "from": AGENT_WALLET,
            "value": "0",
            "call": {
                "function": "exactInputSingle",
                "params": {
                    "tokenIn": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("WETH", ""),
                    "tokenOut": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("USDC", ""),
                    "fee": 3000,
                    "recipient": AGENT_WALLET,
                    "deadline": int(time.time()) + 1800,
                    "amountIn": 20000000000000000,
                    "amountOutMinimum": 19900000000000000,
                    "sqrtPriceLimitX96": 0,
                },
            },
            "slippage_bps": 50,
            "validTo": int(time.time()) + 1800,
            "metadata": {"ttl_secs": 1800, "generated_at_unix": int(time.time())},
        },
        "execute": True,
    },

    # 2. Sanctioned address - should FAIL on sanctions_screening
    {
        "name": "Sanctioned recipient",
        "intent": "Swap 0.5 WETH for USDC on Uniswap V3, send to 0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c",
        "tx": {
            "protocol": "uniswap",
            "to": UNISWAP_ROUTERS.get(UNISWAP_CHAIN_ID, {}).get("v3", ""),
            "from": AGENT_WALLET,
            "value": "0",
            "call": {
                "function": "exactInputSingle",
                "params": {
                    "tokenIn": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("WETH", ""),
                    "tokenOut": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("USDC", ""),
                    "fee": 3000,
                    "recipient": "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c",  # OFAC sanctioned (Tornado Cash)
                    "deadline": int(time.time()) + 1800,
                    "amountIn": 500000000000000000,
                    "amountOutMinimum": 497500000000000000,
                    "sqrtPriceLimitX96": 0,
                },
            },
            "slippage_bps": 50,
            "validTo": int(time.time()) + 1800,
            "metadata": {"ttl_secs": 1800, "generated_at_unix": int(time.time())},
        },
        "execute": False,
    },

    # 3. Wrong recipient (sanctioned deployer) - should FAIL on sanctions_screening
    {
        "name": "Wrong recipient",
        "intent": "Swap 0.05 WETH for USDC on Uniswap V3, send to my wallet",
        "tx": {
            "protocol": "uniswap",
            "to": UNISWAP_ROUTERS.get(UNISWAP_CHAIN_ID, {}).get("v3", ""),
            "from": AGENT_WALLET,
            "value": "0",
            "call": {
                "function": "exactInputSingle",
                "params": {
                    "tokenIn": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("WETH", ""),
                    "tokenOut": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("USDC", ""),
                    "fee": 3000,
                    "recipient": "0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b",  # OFAC sanctioned
                    "deadline": int(time.time()) + 1800,
                    "amountIn": 50000000000000000,
                    "amountOutMinimum": 49750000000000000,
                    "sqrtPriceLimitX96": 0,
                },
            },
            "slippage_bps": 50,
            "validTo": int(time.time()) + 1800,
            "metadata": {"ttl_secs": 1800, "generated_at_unix": int(time.time())},
        },
        "execute": False,
    },

    # 4. Intent mismatch - says buy but tx sells
    {
        "name": "Intent mismatch",
        "intent": "Buy 100 USDC with DAI on Uniswap V3, slippage protection enabled",
        "tx": {
            "protocol": "uniswap",
            "to": UNISWAP_ROUTERS.get(UNISWAP_CHAIN_ID, {}).get("v3", ""),
            "from": AGENT_WALLET,
            "value": "0",
            "call": {
                "function": "exactInputSingle",
                "params": {
                    "tokenIn": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("WETH", ""),
                    "tokenOut": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("USDC", ""),
                    "fee": 3000,
                    "recipient": AGENT_WALLET,
                    "deadline": int(time.time()) + 1800,
                    "amountIn": 500000000000000000,
                    "amountOutMinimum": 497500000000000000,
                    "sqrtPriceLimitX96": 0,
                },
            },
            "slippage_bps": 50,
            "validTo": int(time.time()) + 1800,
            "metadata": {"ttl_secs": 1800, "generated_at_unix": int(time.time())},
        },
        "execute": False,
    },

    # 5. Expired deadline - should FAIL on deadline_consistency
    {
        "name": "Expired deadline",
        "intent": "Swap 0.01 WETH for USDC on Uniswap V3, deadline 5 minutes ago",
        "tx": {
            "protocol": "uniswap",
            "to": UNISWAP_ROUTERS.get(UNISWAP_CHAIN_ID, {}).get("v3", ""),
            "from": AGENT_WALLET,
            "value": "0",
            "call": {
                "function": "exactInputSingle",
                "params": {
                    "tokenIn": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("WETH", ""),
                    "tokenOut": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("USDC", ""),
                    "fee": 3000,
                    "recipient": AGENT_WALLET,
                    "deadline": int(time.time()) - 300,  # 5 minutes ago
                    "amountIn": 10000000000000000,
                    "amountOutMinimum": 9950000000000000,
                    "sqrtPriceLimitX96": 0,
                },
            },
            "slippage_bps": 50,
            "validTo": int(time.time()) - 300,
            "metadata": {"ttl_secs": 1800, "generated_at_unix": int(time.time()) - 600},
        },
        "execute": False,
    },

    # 6. Unknown protocol / wrong router
    {
        "name": "Unknown router address",
        "intent": "Swap 0.1 WETH for USDC on Uniswap V3, slippage protection enabled",
        "tx": {
            "protocol": "uniswap",
            "to": "0xdead000000000000000000000000000000000000",
            "from": AGENT_WALLET,
            "value": "0",
            "call": {
                "function": "exactInputSingle",
                "params": {
                    "tokenIn": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("WETH", ""),
                    "tokenOut": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("USDC", ""),
                    "fee": 3000,
                    "recipient": AGENT_WALLET,
                    "deadline": int(time.time()) + 1800,
                    "amountIn": 100000000000000000,
                    "amountOutMinimum": 99500000000000000,
                    "sqrtPriceLimitX96": 0,
                },
            },
            "slippage_bps": 50,
            "validTo": int(time.time()) + 1800,
            "metadata": {"ttl_secs": 1800, "generated_at_unix": int(time.time())},
        },
        "execute": False,
    },

    # 7. Clean small swap - should PASS (second success case)
    {
        "name": "Small verified swap",
        "intent": "Swap 0.005 WETH for USDC on Uniswap V3, slippage protection enabled, deadline 30 minutes",
        "tx": {
            "protocol": "uniswap",
            "to": UNISWAP_ROUTERS.get(UNISWAP_CHAIN_ID, {}).get("v3", ""),
            "from": AGENT_WALLET,
            "value": "0",
            "call": {
                "function": "exactInputSingle",
                "params": {
                    "tokenIn": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("WETH", ""),
                    "tokenOut": TOKENS.get(UNISWAP_CHAIN_ID, {}).get("USDC", ""),
                    "fee": 3000,
                    "recipient": AGENT_WALLET,
                    "deadline": int(time.time()) + 1800,
                    "amountIn": 5000000000000000,
                    "amountOutMinimum": 4975000000000000,
                    "sqrtPriceLimitX96": 0,
                },
            },
            "slippage_bps": 50,
            "validTo": int(time.time()) + 1800,
            "metadata": {"ttl_secs": 1800, "generated_at_unix": int(time.time())},
        },
        "execute": True,
    },
]


def run_scenarios():
    arbiter = ArbiterClient()
    uniswap = UniswapClient()
    attestation = AttestationClient()

    health = arbiter.health()
    print(f"Arbiter: {health['status']} (LLM: {health['llm']})")
    print(f"Uniswap: {uniswap.mode} mode")
    print(f"Running {len(SCENARIOS)} scenarios...\n")

    records = []

    for i, scenario in enumerate(SCENARIOS):
        print(f"{'='*60}")
        print(f"Scenario {i+1}/{len(SCENARIOS)}: {scenario['name']}")
        print(f"{'='*60}")
        print(f"Intent: {scenario['intent']}")

        # Verify
        try:
            result = arbiter.validate(
                human_intent=scenario["intent"],
                proposed_tx=scenario["tx"],
            )
        except Exception as e:
            print(f"  [ERROR] {e}")
            records.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "scenario": scenario["name"],
                "intent": scenario["intent"],
                "error": str(e),
            })
            continue

        print(f"  Decision: {result.decision}")
        print(f"  Reason: {result.reason}")
        print(f"  Passed: {len(result.passed_nodes)} | Failed: {len(result.failed_nodes)} | Skipped: {len(result.skipped_nodes)}")
        if result.primary_failure_node:
            print(f"  Failed at: {result.primary_failure_node}")

        # Execute if scenario says to and verification passed
        execution = None
        exec_tx_hash = None
        if scenario.get("execute") and result.passed:
            print(f"\n  Executing on Uniswap ({uniswap.mode})...")
            params = scenario["tx"]["call"]["params"]
            swap_result = uniswap.execute_swap(
                token_in="WETH",
                token_out="USDC",
                amount_in=params["amountIn"],
                amount_out_minimum=0,
                fee=params["fee"],
                deadline=params["deadline"],
            )
            if swap_result.success:
                print(f"  [OK] {swap_result.tx_hash}")
                exec_tx_hash = swap_result.tx_hash
            else:
                print(f"  [FAIL] {swap_result.error}")
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
            intent=scenario["intent"],
            decision=result.decision,
            passed_nodes=len(result.passed_nodes),
            failed_nodes=len(result.failed_nodes),
            skipped_nodes=len(result.skipped_nodes),
            execution_tx_hash=exec_tx_hash,
            protocol=result.protocol or "uniswap",
        )
        if attest_result.success:
            print(f"  Attested: {attest_result.tx_hash}")
        else:
            print(f"  Attestation: {attest_result.error and attest_result.error[:80]}")
        attest_data = {
            "success": attest_result.success,
            "attestation_id": attest_result.attestation_id,
            "tx_hash": attest_result.tx_hash,
            "explorer_url": attest_result.explorer_url,
            "error": attest_result.error,
        }

        records.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "attempt": 1,
            "scenario": scenario["name"],
            "intent": scenario["intent"],
            "token_in": "WETH",
            "token_out": "USDC",
            "amount_in": scenario["tx"]["call"]["params"]["amountIn"] / 1e18,
            "slippage_bps": scenario["tx"].get("slippage_bps", 0),
            "chain_id": UNISWAP_CHAIN_ID,
            "proposed_tx": scenario["tx"],
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

    # Save
    os.makedirs(LOG_DIR, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join(LOG_DIR, f"audit_{ts}.json")

    audit = {
        "run_timestamp": datetime.now(timezone.utc).isoformat(),
        "uniswap_mode": uniswap.mode,
        "uniswap_chain_id": uniswap.chain_id,
        "attestation_contract": attestation.contract.address,
        "portfolio": {
            "balances": {"WETH": 0.41, "USDC": 497.0},
            "prices": {"WETH": 2500.0, "USDC": 1.0},
            "total_value_usd": 1522.0,
            "allocation": {"WETH": 0.6735, "USDC": 0.3265},
        },
        "trades": records,
    }

    with open(log_file, "w") as f:
        json.dump(audit, f, indent=2, default=str)
    print(f"Saved: {log_file}")

    # Also save as the example
    import shutil
    shutil.copy(log_file, os.path.join("examples", "sample_audit.json"))
    print(f"Updated examples/sample_audit.json")

    # Summary
    passed = sum(1 for r in records if r.get("verification", {}).get("decision") == "PASS")
    rejected = sum(1 for r in records if r.get("verification", {}).get("decision") == "REJECT")
    executed = sum(1 for r in records if (r.get("execution") or {}).get("success"))
    print(f"\nResults: {passed} passed, {rejected} rejected, {executed} executed out of {len(records)} scenarios")

    rep = attestation.get_reputation()
    if "error" not in rep:
        print(f"On-chain: {rep['attestation_count']} attestations, {rep['pass_rate']} pass rate")


if __name__ == "__main__":
    run_scenarios()
