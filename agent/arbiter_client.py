"""
HTTP client for Nava's Arbiter verification engine.
Sends transaction intents to arbiter-core /validate and parses results.
"""

import httpx
from dataclasses import dataclass, field
from typing import Any

from agent.config import ARBITER_URL


@dataclass
class ArbiterResult:
    decision: str               # "PASS" or "REJECT"
    reason: str
    protocol: str | None
    primary_failure_node: str | None
    llm_calls: int
    node_results: dict[str, dict]
    explanation: dict | None
    raw: dict

    @property
    def passed(self) -> bool:
        return self.decision == "PASS"

    @property
    def passed_nodes(self) -> list[str]:
        return [k for k, v in self.node_results.items() if v.get("status") == "PASS"]

    @property
    def failed_nodes(self) -> list[str]:
        return [k for k, v in self.node_results.items() if v.get("status") == "FAIL"]

    @property
    def skipped_nodes(self) -> list[str]:
        return [k for k, v in self.node_results.items() if v.get("status") == "SKIP"]

    def summary(self) -> str:
        lines = [
            f"Decision: {self.decision}",
            f"Reason: {self.reason}",
            f"Protocol: {self.protocol or 'unknown'}",
            f"Nodes — passed: {len(self.passed_nodes)}, failed: {len(self.failed_nodes)}, skipped: {len(self.skipped_nodes)}",
        ]
        if self.primary_failure_node:
            lines.append(f"Primary failure: {self.primary_failure_node}")
        if self.explanation and self.explanation.get("recommendations"):
            lines.append(f"Recommendations: {', '.join(self.explanation['recommendations'])}")
        return "\n".join(lines)


class ArbiterClient:
    """Talks to arbiter-core's /validate endpoint."""

    def __init__(self, base_url: str = ARBITER_URL, timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def health(self) -> dict:
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(f"{self.base_url}/health")
            resp.raise_for_status()
            return resp.json()

    def validate(
        self,
        human_intent: str,
        proposed_tx: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> ArbiterResult:
        """
        Send a transaction intent to the Arbiter for verification.

        Args:
            human_intent: Natural language description of what the user wants.
            proposed_tx: Structured transaction proposal (protocol, call, to, etc.)
            metadata: Optional extra context (prices, timestamps, etc.)

        Returns:
            ArbiterResult with decision, per-node breakdown, and explanation.
        """
        payload = {
            "human_intent": human_intent,
            "proposed_tx": proposed_tx,
            "metadata": metadata or {},
        }

        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(f"{self.base_url}/validate", json=payload)
            resp.raise_for_status()
            data = resp.json()

        return ArbiterResult(
            decision=data["decision"],
            reason=data["reason"],
            protocol=data.get("protocol"),
            primary_failure_node=data.get("primary_failure_node"),
            llm_calls=data.get("llm_calls", 0),
            node_results=data.get("results", {}),
            explanation=data.get("explanation"),
            raw=data,
        )
