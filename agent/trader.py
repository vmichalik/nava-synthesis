"""
Main trading agent loop.
Strategy -> construct intent -> verify with Arbiter -> execute on Uniswap -> log.
"""

import json
import os
import time
from datetime import datetime, timezone

from agent.arbiter_client import ArbiterClient
from agent.config import (
    LOG_DIR,
    MAX_RETRIES,
    MAX_SLIPPAGE_BPS,
    RETRY_SLIPPAGE_INCREASE_BPS,
)
from agent.strategy import Portfolio, SwapIntent, compute_rebalance_swaps, demo_portfolio
from agent.uniswap_client import UniswapClient


def _log_path() -> str:
    os.makedirs(LOG_DIR, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return os.path.join(LOG_DIR, f"audit_{ts}.json")


def _build_trade_record(
    swap: SwapIntent,
    result,
    attempt: int,
    execution: dict | None = None,
) -> dict:
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "attempt": attempt,
        "intent": swap.human_intent,
        "token_in": swap.token_in,
        "token_out": swap.token_out,
        "amount_in": swap.amount_in,
        "slippage_bps": swap.slippage_bps,
        "chain_id": swap.chain_id,
        "proposed_tx": swap.to_proposed_tx(),
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
    }


def run_once(
    portfolio: Portfolio | None = None,
    arbiter: ArbiterClient | None = None,
    uniswap: UniswapClient | None = None,
    execute: bool = True,
) -> list[dict]:
    """
    Run one rebalancing cycle:
    1. Evaluate portfolio drift
    2. Compute required swaps
    3. Verify each swap with Arbiter
    4. If verified, execute on Uniswap (or simulate)
    5. Log full audit trail

    Returns list of trade records (for dashboard consumption).
    """
    if portfolio is None:
        portfolio = demo_portfolio()
    if arbiter is None:
        arbiter = ArbiterClient()
    if uniswap is None:
        uniswap = UniswapClient()

    print(f"\n{'='*60}")
    print(f"ARBITER GUARD - Rebalancing Cycle")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print(f"Uniswap mode: {uniswap.mode}")
    print(f"{'='*60}")

    # Show portfolio state
    alloc = portfolio.current_allocation()
    print(f"\nPortfolio: ${portfolio.total_value_usd:,.2f}")
    for token, pct in alloc.items():
        balance = portfolio.balances.get(token, 0)
        print(f"  {token}: {balance:.6f} ({pct:.1%})")

    # Compute swaps
    swaps = compute_rebalance_swaps(portfolio)
    if not swaps:
        print("\nPortfolio within tolerance - no rebalancing needed.")
        return []

    print(f"\n{len(swaps)} swap(s) needed for rebalancing:")
    for s in swaps:
        print(f"  > {s.human_intent}")

    # Verify and execute each swap
    trade_records = []
    for swap in swaps:
        current_slippage = swap.slippage_bps

        for attempt in range(1, MAX_RETRIES + 1):
            # Update slippage for retries
            if attempt > 1:
                current_slippage = min(
                    swap.slippage_bps + (attempt - 1) * RETRY_SLIPPAGE_INCREASE_BPS,
                    MAX_SLIPPAGE_BPS * 3,  # hard cap at 1.5%
                )
                swap.slippage_bps = current_slippage
                slippage_pct = current_slippage / 10000
                swap.human_intent = (
                    f"Swap {swap.amount_in:.6f} {swap.token_in} for {swap.token_out} "
                    f"on Uniswap V3, max slippage {slippage_pct:.2%}, deadline 30 minutes"
                )

            print(f"\n--- Verifying swap (attempt {attempt}/{MAX_RETRIES}) ---")
            print(f"Intent: {swap.human_intent}")

            # Step 1: Arbiter verification
            try:
                result = arbiter.validate(
                    human_intent=swap.human_intent,
                    proposed_tx=swap.to_proposed_tx(),
                    metadata={
                        "prices": {
                            swap.token_in: portfolio.prices.get(swap.token_in, 0),
                            swap.token_out: portfolio.prices.get(swap.token_out, 0),
                        },
                    },
                )
            except Exception as e:
                print(f"  [ERROR] Arbiter error: {e}")
                record = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "attempt": attempt,
                    "intent": swap.human_intent,
                    "error": str(e),
                }
                trade_records.append(record)
                continue

            print(f"  Decision: {result.decision}")
            print(f"  Reason: {result.reason}")
            print(f"  Passed: {len(result.passed_nodes)} | Failed: {len(result.failed_nodes)} | Skipped: {len(result.skipped_nodes)}")

            if result.passed:
                print(f"  [PASS] VERIFIED")

                # Step 2: Execute on Uniswap
                execution = None
                if execute:
                    print(f"\n--- Executing on Uniswap ({uniswap.mode} mode) ---")

                    # Get quote first
                    try:
                        quote = uniswap.get_quote(
                            token_in=swap.token_in,
                            token_out=swap.token_out,
                            amount_in=swap.amount_in_raw,
                            slippage_bps=swap.slippage_bps,
                        )
                        print(f"  Quote: {quote.amount_in} {swap.token_in} -> ~{quote.amount_out} {swap.token_out}")
                        print(f"  Min output (after slippage): {quote.amount_out_minimum}")
                    except Exception as e:
                        print(f"  [WARN] Quote failed: {e}")
                        quote = None

                    # Execute swap
                    swap_result = uniswap.execute_swap(
                        token_in=swap.token_in,
                        token_out=swap.token_out,
                        amount_in=swap.amount_in_raw,
                        amount_out_minimum=quote.amount_out_minimum if quote else 0,
                        deadline=swap.deadline,
                    )

                    if swap_result.success:
                        print(f"  [OK] Swap {'executed' if swap_result.mode == 'live' else 'simulated'}")
                        print(f"  TxHash: {swap_result.tx_hash}")
                        if swap_result.explorer_url:
                            print(f"  Explorer: {swap_result.explorer_url}")
                        if swap_result.block_number:
                            print(f"  Block: {swap_result.block_number}")
                        if swap_result.gas_used:
                            print(f"  Gas used: {swap_result.gas_used}")
                    else:
                        print(f"  [FAIL] Swap failed: {swap_result.error}")

                    execution = {
                        "mode": swap_result.mode,
                        "success": swap_result.success,
                        "tx_hash": swap_result.tx_hash,
                        "block_number": swap_result.block_number,
                        "gas_used": swap_result.gas_used,
                        "explorer_url": swap_result.explorer_url,
                        "error": swap_result.error,
                    }

                record = _build_trade_record(swap, result, attempt, execution)
                trade_records.append(record)
                break
            else:
                print(f"  [FAIL] REJECTED - {result.primary_failure_node}")
                record = _build_trade_record(swap, result, attempt)
                trade_records.append(record)
                if attempt < MAX_RETRIES:
                    print(f"  > Retrying with wider slippage...")
        else:
            print(f"  [FAIL] All {MAX_RETRIES} attempts failed for this swap.")

    # Save audit log
    log_file = _log_path()
    audit = {
        "run_timestamp": datetime.now(timezone.utc).isoformat(),
        "uniswap_mode": uniswap.mode,
        "uniswap_chain_id": uniswap.chain_id,
        "portfolio": {
            "balances": portfolio.balances,
            "prices": portfolio.prices,
            "total_value_usd": portfolio.total_value_usd,
            "allocation": portfolio.current_allocation(),
        },
        "trades": trade_records,
    }
    with open(log_file, "w") as f:
        json.dump(audit, f, indent=2, default=str)
    print(f"\nAudit log saved: {log_file}")

    return trade_records


def main():
    """Entry point - run one rebalancing cycle with the demo portfolio."""
    # Check arbiter health
    arbiter = ArbiterClient()
    try:
        health = arbiter.health()
        print(f"Arbiter status: {health['status']} (LLM: {health['llm']})")
    except Exception as e:
        print(f"Cannot reach Arbiter at {arbiter.base_url}: {e}")
        print("Make sure arbiter-core is running: python -m uvicorn api.server:app --port 8000")
        return

    # Initialize Uniswap client
    uniswap = UniswapClient()
    conn = uniswap.check_connection()
    print(f"Uniswap: {'connected' if conn.get('connected') else 'disconnected'} "
          f"(chain {conn.get('chain_id')}, {uniswap.mode} mode)")

    records = run_once(arbiter=arbiter, uniswap=uniswap)
    print(f"\n{'='*60}")
    print(f"Cycle complete. {len(records)} trade(s) processed.")

    verified = sum(1 for r in records if r.get("verification", {}).get("decision") == "PASS")
    rejected = sum(1 for r in records if r.get("verification", {}).get("decision") == "REJECT")
    executed = sum(1 for r in records if (r.get("execution") or {}).get("success"))
    errors = sum(1 for r in records if "error" in r)
    print(f"Verified: {verified} | Rejected: {rejected} | Executed: {executed} | Errors: {errors}")


if __name__ == "__main__":
    main()
