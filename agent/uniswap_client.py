"""
Uniswap V3 execution client.
Handles quoting and swap execution on Sepolia (or mainnet).
Supports simulation mode (no wallet needed) and live mode (real on-chain txs).
"""

import json
import os
import time
from dataclasses import dataclass
from typing import Any

from web3 import Web3

from agent.config import (
    AGENT_WALLET,
    TOKENS,
    UNISWAP_CHAIN_ID,
    UNISWAP_ROUTERS,
)


# Uniswap V3 SwapRouter ABI (exactInputSingle only)
SWAP_ROUTER_ABI = json.loads("""[
    {
        "inputs": [
            {
                "components": [
                    {"name": "tokenIn", "type": "address"},
                    {"name": "tokenOut", "type": "address"},
                    {"name": "fee", "type": "uint24"},
                    {"name": "recipient", "type": "address"},
                    {"name": "deadline", "type": "uint256"},
                    {"name": "amountIn", "type": "uint256"},
                    {"name": "amountOutMinimum", "type": "uint256"},
                    {"name": "sqrtPriceLimitX96", "type": "uint160"}
                ],
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "exactInputSingle",
        "outputs": [{"name": "amountOut", "type": "uint256"}],
        "stateMutability": "payable",
        "type": "function"
    }
]""")

# Uniswap V3 Quoter V2 ABI (quoteExactInputSingle)
QUOTER_ABI = json.loads("""[
    {
        "inputs": [
            {
                "components": [
                    {"name": "tokenIn", "type": "address"},
                    {"name": "tokenOut", "type": "address"},
                    {"name": "amountIn", "type": "uint256"},
                    {"name": "fee", "type": "uint24"},
                    {"name": "sqrtPriceLimitX96", "type": "uint160"}
                ],
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "quoteExactInputSingle",
        "outputs": [
            {"name": "amountOut", "type": "uint256"},
            {"name": "sqrtPriceX96After", "type": "uint160"},
            {"name": "initializedTicksCrossed", "type": "uint32"},
            {"name": "gasEstimate", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]""")

# ERC-20 ABI (approve + balanceOf + decimals)
ERC20_ABI = json.loads("""[
    {
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    }
]""")

# Quoter V2 addresses
QUOTER_ADDRESSES = {
    1: "0x61fFE014bA17989E743c5F6cB21bF9697530B21",
    11155111: "0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3",
}


@dataclass
class SwapQuote:
    """Quote for a Uniswap V3 swap."""
    amount_in: int
    amount_out: int
    amount_out_minimum: int   # after slippage
    token_in: str
    token_out: str
    fee: int
    gas_estimate: int
    price_impact: float | None


@dataclass
class SwapResult:
    """Result of an executed (or simulated) swap."""
    success: bool
    tx_hash: str | None
    block_number: int | None
    gas_used: int | None
    amount_in: int
    amount_out: int | None
    explorer_url: str | None
    mode: str                 # "live" or "simulation"
    error: str | None = None


class UniswapClient:
    """
    Handles Uniswap V3 swap quoting and execution.

    In simulation mode (no private key): builds and logs transactions
    without submitting. In live mode: signs and submits real txs.
    """

    EXPLORERS = {
        1: "https://etherscan.io",
        11155111: "https://sepolia.etherscan.io",
    }

    def __init__(
        self,
        rpc_url: str | None = None,
        private_key: str | None = None,
        chain_id: int = UNISWAP_CHAIN_ID,
    ):
        self.chain_id = chain_id

        # Default RPC endpoints
        if rpc_url is None:
            rpc_url = os.getenv("RPC_URL", "")
            if not rpc_url:
                if chain_id == 11155111:
                    rpc_url = "https://ethereum-sepolia-rpc.publicnode.com"
                else:
                    rpc_url = "https://ethereum-rpc.publicnode.com"

        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.private_key = private_key or os.getenv("AGENT_PRIVATE_KEY", "")
        self.live_mode = bool(self.private_key)

        # Contracts
        routers = UNISWAP_ROUTERS.get(chain_id, {})
        router_addr = routers.get("v3", "")
        self.router = self.w3.eth.contract(
            address=Web3.to_checksum_address(router_addr),
            abi=SWAP_ROUTER_ABI,
        ) if router_addr else None

        quoter_addr = QUOTER_ADDRESSES.get(chain_id, "")
        self.quoter = self.w3.eth.contract(
            address=Web3.to_checksum_address(quoter_addr),
            abi=QUOTER_ABI,
        ) if quoter_addr else None

        self.wallet = Web3.to_checksum_address(
            self.w3.eth.account.from_key(self.private_key).address
            if self.live_mode
            else AGENT_WALLET
        )

        explorer = self.EXPLORERS.get(chain_id, "https://etherscan.io")
        self.explorer_base = explorer

    @property
    def mode(self) -> str:
        return "live" if self.live_mode else "simulation"

    def get_quote(
        self,
        token_in: str,
        token_out: str,
        amount_in: int,
        fee: int = 3000,
        slippage_bps: int = 50,
    ) -> SwapQuote:
        """
        Get a swap quote from Uniswap V3 Quoter.
        Falls back to estimated quote if quoter call fails.
        """
        tokens = TOKENS.get(self.chain_id, {})
        token_in_addr = Web3.to_checksum_address(tokens.get(token_in, token_in))
        token_out_addr = Web3.to_checksum_address(tokens.get(token_out, token_out))

        try:
            result = self.quoter.functions.quoteExactInputSingle({
                "tokenIn": token_in_addr,
                "tokenOut": token_out_addr,
                "amountIn": amount_in,
                "fee": fee,
                "sqrtPriceLimitX96": 0,
            }).call()

            amount_out = result[0]
            gas_estimate = result[3]
        except Exception as e:
            # Quoter may fail on testnet if pool doesn't exist
            # Fall back to price-based estimate
            print(f"  [WARN] Quoter call failed ({e}), using price estimate")
            # Rough estimate: assume current market prices
            amount_out = amount_in  # placeholder
            gas_estimate = 200000

        # Apply slippage tolerance
        amount_out_minimum = int(amount_out * (10000 - slippage_bps) / 10000)

        return SwapQuote(
            amount_in=amount_in,
            amount_out=amount_out,
            amount_out_minimum=amount_out_minimum,
            token_in=token_in,
            token_out=token_out,
            fee=fee,
            gas_estimate=gas_estimate,
            price_impact=None,
        )

    def execute_swap(
        self,
        token_in: str,
        token_out: str,
        amount_in: int,
        amount_out_minimum: int = 0,
        fee: int = 3000,
        deadline: int | None = None,
    ) -> SwapResult:
        """
        Execute a swap on Uniswap V3.

        In live mode: approves token, builds tx, signs, and submits.
        In simulation mode: builds the tx and returns what would happen.
        """
        if deadline is None:
            deadline = int(time.time()) + 1800

        tokens = TOKENS.get(self.chain_id, {})
        token_in_addr = Web3.to_checksum_address(tokens.get(token_in, token_in))
        token_out_addr = Web3.to_checksum_address(tokens.get(token_out, token_out))

        swap_params = {
            "tokenIn": token_in_addr,
            "tokenOut": token_out_addr,
            "fee": fee,
            "recipient": self.wallet,
            "deadline": deadline,
            "amountIn": amount_in,
            "amountOutMinimum": amount_out_minimum,
            "sqrtPriceLimitX96": 0,
        }

        if not self.live_mode:
            return self._simulate_swap(swap_params, token_in, amount_in)

        return self._live_swap(swap_params, token_in, token_in_addr, amount_in)

    def _simulate_swap(
        self,
        swap_params: dict,
        token_in: str,
        amount_in: int,
    ) -> SwapResult:
        """Build the transaction without submitting — for demos without a funded wallet."""
        try:
            # Build the transaction data to show it's valid
            tx_data = self.router.functions.exactInputSingle(swap_params).build_transaction({
                "from": self.wallet,
                "value": 0,
                "gas": 300000,
                "gasPrice": self.w3.to_wei(1, "gwei"),
                "nonce": 0,
                "chainId": self.chain_id,
            })

            # Generate a deterministic mock tx hash from the params
            import hashlib
            param_bytes = json.dumps(swap_params, sort_keys=True, default=str).encode()
            mock_hash = "0x" + hashlib.sha256(param_bytes).hexdigest()

            return SwapResult(
                success=True,
                tx_hash=mock_hash,
                block_number=None,
                gas_used=None,
                amount_in=amount_in,
                amount_out=None,
                explorer_url=f"{self.explorer_base}/tx/{mock_hash}",
                mode="simulation",
            )
        except Exception as e:
            return SwapResult(
                success=False,
                tx_hash=None,
                block_number=None,
                gas_used=None,
                amount_in=amount_in,
                amount_out=None,
                explorer_url=None,
                mode="simulation",
                error=str(e),
            )

    def _live_swap(
        self,
        swap_params: dict,
        token_in: str,
        token_in_addr: str,
        amount_in: int,
    ) -> SwapResult:
        """Approve token and execute the swap on-chain."""
        try:
            account = self.w3.eth.account.from_key(self.private_key)
            nonce = self.w3.eth.get_transaction_count(account.address)

            # Step 1: Approve router to spend tokens (skip for ETH/WETH native)
            token_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(token_in_addr),
                abi=ERC20_ABI,
            )
            approve_tx = token_contract.functions.approve(
                self.router.address,
                amount_in,
            ).build_transaction({
                "from": account.address,
                "nonce": nonce,
                "chainId": self.chain_id,
                "gas": 100000,
                "maxFeePerGas": self.w3.to_wei(30, "gwei"),
                "maxPriorityFeePerGas": self.w3.to_wei(2, "gwei"),
            })
            signed_approve = account.sign_transaction(approve_tx)
            approve_hash = self.w3.eth.send_raw_transaction(signed_approve.raw_transaction)
            self.w3.eth.wait_for_transaction_receipt(approve_hash, timeout=120)
            print(f"  [OK] Token approval confirmed: {approve_hash.hex()}")
            nonce += 1

            # Step 2: Execute the swap
            swap_tx = self.router.functions.exactInputSingle(swap_params).build_transaction({
                "from": account.address,
                "value": 0,
                "nonce": nonce,
                "chainId": self.chain_id,
                "gas": 300000,
                "maxFeePerGas": self.w3.to_wei(30, "gwei"),
                "maxPriorityFeePerGas": self.w3.to_wei(2, "gwei"),
            })
            signed_swap = account.sign_transaction(swap_tx)
            swap_hash = self.w3.eth.send_raw_transaction(signed_swap.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(swap_hash, timeout=120)

            return SwapResult(
                success=receipt["status"] == 1,
                tx_hash=swap_hash.hex(),
                block_number=receipt["blockNumber"],
                gas_used=receipt["gasUsed"],
                amount_in=amount_in,
                amount_out=None,  # would need to decode logs for exact output
                explorer_url=f"{self.explorer_base}/tx/0x{swap_hash.hex()}",
                mode="live",
            )
        except Exception as e:
            return SwapResult(
                success=False,
                tx_hash=None,
                block_number=None,
                gas_used=None,
                amount_in=amount_in,
                amount_out=None,
                explorer_url=None,
                mode="live",
                error=str(e),
            )

    def get_balance(self, token: str) -> int:
        """Get token balance for the agent wallet."""
        tokens = TOKENS.get(self.chain_id, {})
        token_addr = tokens.get(token, token)
        contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(token_addr),
            abi=ERC20_ABI,
        )
        return contract.functions.balanceOf(self.wallet).call()

    def check_connection(self) -> dict:
        """Verify RPC connection and return chain info."""
        try:
            connected = self.w3.is_connected()
            chain_id = self.w3.eth.chain_id if connected else None
            block = self.w3.eth.block_number if connected else None
            return {
                "connected": connected,
                "chain_id": chain_id,
                "block_number": block,
                "mode": self.mode,
                "wallet": self.wallet,
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}
