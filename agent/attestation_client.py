"""
Client for the ArbiterAttestation contract on Sepolia.
Posts verification results as on-chain attestations after each trade.
"""

import hashlib
import json
import os
import threading
from dataclasses import dataclass

from web3 import Web3

from agent.config import UNISWAP_CHAIN_ID

# Deployed on Sepolia
ATTESTATION_CONTRACT = os.getenv(
    "ATTESTATION_CONTRACT",
    "0x708c3848f99a80732124344AebE6e9bBb5dA31D5",
)

ATTESTATION_ABI = json.loads("""[
    {
        "inputs": [
            {"name": "intentHash", "type": "bytes32"},
            {"name": "decision", "type": "uint8"},
            {"name": "passedNodes", "type": "uint16"},
            {"name": "failedNodes", "type": "uint16"},
            {"name": "skippedNodes", "type": "uint16"},
            {"name": "executionTxHash", "type": "bytes32"},
            {"name": "protocol", "type": "string"}
        ],
        "name": "recordAttestation",
        "outputs": [{"name": "attestationId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "agent", "type": "address"}],
        "name": "getAgentReputation",
        "outputs": [
            {"name": "attestationCount", "type": "uint256"},
            {"name": "passCount", "type": "uint256"},
            {"name": "rejectCount", "type": "uint256"},
            {"name": "nodesChecked", "type": "uint256"},
            {"name": "nodesPassed", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "agent", "type": "address"}],
        "name": "getAgentAttestationCount",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalAttestations",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]""")

EXPLORER = {
    11155111: "https://sepolia.etherscan.io",
}


@dataclass
class AttestationResult:
    success: bool
    attestation_id: int | None
    tx_hash: str | None
    explorer_url: str | None
    error: str | None = None


class AttestationClient:
    """Posts Arbiter verification results to the ArbiterAttestation contract."""

    def __init__(
        self,
        rpc_url: str | None = None,
        private_key: str | None = None,
        chain_id: int = UNISWAP_CHAIN_ID,
        contract_address: str = ATTESTATION_CONTRACT,
    ):
        self.chain_id = chain_id

        if rpc_url is None:
            rpc_url = os.getenv("RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com")

        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.private_key = private_key or os.getenv("AGENT_PRIVATE_KEY", "")

        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=ATTESTATION_ABI,
        )

        if self.private_key:
            self.wallet = self.w3.eth.account.from_key(self.private_key).address
        else:
            self.wallet = None

        self.explorer_base = EXPLORER.get(chain_id, "https://sepolia.etherscan.io")
        self._tx_lock = threading.Lock()

    def record(
        self,
        intent: str,
        decision: str,
        passed_nodes: int,
        failed_nodes: int,
        skipped_nodes: int,
        execution_tx_hash: str | None = None,
        protocol: str = "uniswap",
    ) -> AttestationResult:
        """Record an attestation on-chain."""
        if not self.private_key:
            return AttestationResult(
                success=False, attestation_id=None, tx_hash=None,
                explorer_url=None, error="No private key configured",
            )

        try:
            with self._tx_lock:
                return self._record_inner(intent, decision, passed_nodes, failed_nodes, skipped_nodes, execution_tx_hash, protocol)
        except Exception as e:
            import traceback
            return AttestationResult(
                success=False, attestation_id=None, tx_hash=None,
                explorer_url=None, error=f"{type(e).__name__}: {e}\n{traceback.format_exc()}",
            )

    def _record_inner(self, intent, decision, passed_nodes, failed_nodes, skipped_nodes, execution_tx_hash, protocol):
        try:
            intent_hash = Web3.keccak(text=intent)

            # Convert decision
            decision_uint = 1 if decision == "PASS" else 0

            # Convert execution tx hash (or 0x0)
            if execution_tx_hash:
                exec_hash = bytes.fromhex(execution_tx_hash.replace("0x", "").ljust(64, "0")[:64])
            else:
                exec_hash = b'\x00' * 32

            account = self.w3.eth.account.from_key(self.private_key)
            nonce = self.w3.eth.get_transaction_count(account.address, "pending")

            tx = self.contract.functions.recordAttestation(
                intent_hash,
                decision_uint,
                passed_nodes,
                failed_nodes,
                skipped_nodes,
                exec_hash,
                protocol,
            ).build_transaction({
                "from": account.address,
                "nonce": nonce,
                "chainId": self.chain_id,
                "gas": 300000,
                "maxFeePerGas": self.w3.to_wei(30, "gwei"),
                "maxPriorityFeePerGas": self.w3.to_wei(2, "gwei"),
            })

            signed = account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

            # Parse attestation ID from logs
            attestation_id = None
            for log in receipt.get("logs", []):
                if len(log.get("topics", [])) >= 1:
                    # AttestationRecorded event topic
                    attestation_id = int(log["topics"][1].hex(), 16) if len(log["topics"]) > 1 else None
                    break

            return AttestationResult(
                success=receipt["status"] == 1,
                attestation_id=attestation_id,
                tx_hash=f"0x{tx_hash.hex()}",
                explorer_url=f"{self.explorer_base}/tx/0x{tx_hash.hex()}",
            )
        except Exception as e:
            import traceback
            return AttestationResult(
                success=False, attestation_id=None, tx_hash=None,
                explorer_url=None, error=f"{type(e).__name__}: {e}\n{traceback.format_exc()}",
            )

    def get_reputation(self) -> dict:
        """Query the agent's on-chain verification track record."""
        if not self.wallet:
            return {"error": "No wallet configured"}

        try:
            result = self.contract.functions.getAgentReputation(
                Web3.to_checksum_address(self.wallet)
            ).call()

            return {
                "attestation_count": result[0],
                "pass_count": result[1],
                "reject_count": result[2],
                "nodes_checked": result[3],
                "nodes_passed": result[4],
                "pass_rate": f"{result[1] / result[0] * 100:.0f}%" if result[0] > 0 else "N/A",
            }
        except Exception as e:
            return {"error": str(e)}
