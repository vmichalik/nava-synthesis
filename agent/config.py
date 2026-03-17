"""
Configuration for the Arbiter Guard trading agent.
Reads from environment variables with sensible defaults.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Arbiter
ARBITER_URL = os.getenv("ARBITER_URL", "http://localhost:8000")

# Uniswap
UNISWAP_API_KEY = os.getenv("UNISWAP_API_KEY", "")
UNISWAP_CHAIN_ID = int(os.getenv("UNISWAP_CHAIN_ID", "11155111"))  # Sepolia default

# Known Uniswap router addresses by chain
UNISWAP_ROUTERS = {
    1: {
        "v3": "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        "universal": "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
    },
    11155111: {
        "v3": "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
        "universal": "0x3a9D48AB9751398BbFa63aD67599Bb04e4BdF98b",
    },
}

# Common token addresses (Sepolia)
TOKENS = {
    11155111: {
        "WETH": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
        "USDC": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        "DAI": "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
    },
    1: {
        "WETH": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "DAI": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    },
}

# Agent wallet (for demo — NOT a real funded wallet)
AGENT_WALLET = os.getenv("AGENT_WALLET", "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18")

# Strategy
TARGET_ALLOCATION = {
    "WETH": 0.6,
    "USDC": 0.4,
}
REBALANCE_THRESHOLD = 0.05  # 5% drift triggers rebalance
MAX_SLIPPAGE_BPS = 50       # 0.5%
SWAP_DEADLINE_SECS = 1800   # 30 minutes
MAX_RETRIES = 3
RETRY_SLIPPAGE_INCREASE_BPS = 25  # widen slippage by 0.25% per retry

# Logging
LOG_DIR = os.getenv("LOG_DIR", "logs")
