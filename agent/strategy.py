"""
Simple portfolio rebalancing strategy.
Given current balances and target allocation, computes required swaps.
"""

import time
from dataclasses import dataclass

from agent.config import (
    TARGET_ALLOCATION,
    REBALANCE_THRESHOLD,
    MAX_SLIPPAGE_BPS,
    SWAP_DEADLINE_SECS,
    TOKENS,
    UNISWAP_CHAIN_ID,
    UNISWAP_ROUTERS,
    AGENT_WALLET,
)


@dataclass
class SwapIntent:
    """A proposed swap to rebalance the portfolio."""
    human_intent: str
    token_in: str           # symbol
    token_in_address: str
    token_out: str          # symbol
    token_out_address: str
    amount_in: float        # human-readable
    amount_in_raw: int      # raw units (wei/smallest unit)
    slippage_bps: int
    deadline: int           # unix timestamp
    router: str             # contract address
    chain_id: int

    def to_proposed_tx(self) -> dict:
        """Format as a proposed_tx for arbiter-core validation."""
        return {
            "protocol": "uniswap",
            "to": self.router,
            "from": AGENT_WALLET,
            "value": "0",
            "call": {
                "function": "exactInputSingle",
                "params": {
                    "tokenIn": self.token_in_address,
                    "tokenOut": self.token_out_address,
                    "fee": 3000,
                    "recipient": AGENT_WALLET,
                    "deadline": self.deadline,
                    "amountIn": self.amount_in_raw,
                    "amountOutMinimum": 0,  # set by slippage calc in real version
                    "sqrtPriceLimitX96": 0,
                },
            },
            "slippage_bps": self.slippage_bps,
            "validTo": self.deadline,
            "metadata": {
                "ttl_secs": SWAP_DEADLINE_SECS,
                "generated_at_unix": int(time.time()),
            },
        }


@dataclass
class Portfolio:
    """Current portfolio state with balances and prices."""
    balances: dict[str, float]   # symbol -> amount (human-readable)
    prices: dict[str, float]     # symbol -> USD price

    @property
    def total_value_usd(self) -> float:
        return sum(self.balances.get(t, 0) * self.prices.get(t, 0) for t in self.balances)

    def current_allocation(self) -> dict[str, float]:
        total = self.total_value_usd
        if total == 0:
            return {t: 0 for t in self.balances}
        return {t: (self.balances.get(t, 0) * self.prices.get(t, 0)) / total for t in self.balances}

    def drift(self) -> dict[str, float]:
        current = self.current_allocation()
        return {t: current.get(t, 0) - TARGET_ALLOCATION.get(t, 0) for t in TARGET_ALLOCATION}


def compute_rebalance_swaps(
    portfolio: Portfolio,
    slippage_bps: int = MAX_SLIPPAGE_BPS,
) -> list[SwapIntent]:
    """
    Determine what swaps are needed to bring the portfolio back to target allocation.
    Returns a list of SwapIntent objects, one per required swap.
    """
    drift = portfolio.drift()
    total_usd = portfolio.total_value_usd
    tokens = TOKENS.get(UNISWAP_CHAIN_ID, {})
    routers = UNISWAP_ROUTERS.get(UNISWAP_CHAIN_ID, {})
    router = routers.get("v3", "")
    deadline = int(time.time()) + SWAP_DEADLINE_SECS

    # Find overweight and underweight tokens
    overweight = {t: d for t, d in drift.items() if d > REBALANCE_THRESHOLD}
    underweight = {t: abs(d) for t, d in drift.items() if d < -REBALANCE_THRESHOLD}

    if not overweight or not underweight:
        return []

    swaps = []
    for sell_token, sell_drift in overweight.items():
        for buy_token, buy_drift in underweight.items():
            # Amount to swap (in USD) is the minimum of the two drifts
            swap_usd = min(sell_drift, buy_drift) * total_usd
            sell_price = portfolio.prices.get(sell_token, 1)
            sell_amount = swap_usd / sell_price if sell_price > 0 else 0

            if sell_amount <= 0:
                continue

            # Convert to raw units (18 decimals for WETH, 6 for USDC)
            decimals = 6 if sell_token == "USDC" else 18
            amount_raw = int(sell_amount * (10 ** decimals))

            slippage_pct = slippage_bps / 10000
            intent_text = (
                f"Swap {sell_amount:.6f} {sell_token} for {buy_token} on Uniswap V3, "
                f"max slippage {slippage_pct:.2%}, deadline {SWAP_DEADLINE_SECS // 60} minutes"
            )

            swaps.append(SwapIntent(
                human_intent=intent_text,
                token_in=sell_token,
                token_in_address=tokens.get(sell_token, ""),
                token_out=buy_token,
                token_out_address=tokens.get(buy_token, ""),
                amount_in=sell_amount,
                amount_in_raw=amount_raw,
                slippage_bps=slippage_bps,
                deadline=deadline,
                router=router,
                chain_id=UNISWAP_CHAIN_ID,
            ))

    return swaps


def demo_portfolio() -> Portfolio:
    """Returns a sample unbalanced portfolio for demo/testing."""
    return Portfolio(
        balances={"WETH": 1.0, "USDC": 500.0},
        prices={"WETH": 3500.0, "USDC": 1.0},
        # Total: $4000. WETH = $3500 (87.5%), USDC = $500 (12.5%)
        # Target: 60/40 → need to sell ~$1100 WETH for USDC
    )
