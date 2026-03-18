# Arbiter Guard

**Verified autonomous trading on Uniswap, with on-chain attestations.**

Built for [The Synthesis](https://synthesis.md/) hackathon (March 2026) by Vijay Michalik + Claude (Opus 4.6).

## What it does

A fully autonomous trading agent that verifies every transaction through Nava's Arbiter verification engine before executing on Uniswap -- and posts every verification result as an on-chain attestation. No trade goes on-chain without passing 18 safety checks. Every decision is permanently auditable.

1. Agent evaluates portfolio drift against target allocation
2. Constructs a Uniswap V3 swap intent (token pair, amount, slippage, deadline)
3. Sends the intent to the Arbiter's `/validate` endpoint (18-node verification graph)
4. **If PASS** -- executes the swap via Uniswap V3 SwapRouter on Sepolia
5. **If REJECT** -- adjusts parameters (widens slippage), retries within bounds
6. **Posts attestation on-chain** -- verification result recorded to ArbiterAttestation contract
7. Full audit trail logged: intent, per-node results, execution outcome, attestation tx

In **autonomous mode**, the agent runs this loop continuously without human intervention.

## Architecture

```
                                     +-------------------------+
                                     |  ArbiterAttestation     |
                                     |  Contract (Sepolia)     |
                                     |                         |
                                     |  recordAttestation()    |
                                     |  getAgentReputation()   |
+-------------------+                |                         |
|  Trading Agent    |     +----------+--->                     |
|  (Python)         |     |          +-------------------------+
|                   |     |
|  Strategy +       |     |
|  retry logic +    |     |
|  autonomous mode  |     |
+--------+----------+     |
         |                |
         v                |
+-------------------+     |          +-------------------+
|  Arbiter          |-----+--------->|  Uniswap V3       |
|  (FastAPI)        |                |  SwapRouter       |
|  /validate        |                |  (Sepolia)        |
|                   |                |                   |
|  18-node graph    |                |  Real quotes +    |
|  PASS/REJECT      |                |  TxIDs            |
+-------------------+                +-------------------+
         |
         v
+-------------------+     +-------------------+
|  Dashboard API    |---->|  React UI         |
|  (FastAPI :8001)  |     |  Nava brand theme |
+-------------------+     +-------------------+
```

## On-chain artifacts

| Artifact | Address / TX | Chain |
|----------|-------------|-------|
| **ArbiterAttestation contract** | [`0x708c3848f99a80732124344AebE6e9bBb5dA31D5`](https://sepolia.etherscan.io/address/0x708c3848f99a80732124344AebE6e9bBb5dA31D5) | Sepolia |
| **ERC-8004 agent identity** | [`0x3ded5141...`](https://basescan.org/tx/0x3ded5141bd9af5533b69d236e0821089c1806923ce3fb3aaf83fa755e431506e) | Base Mainnet |
| **Example attestation TX** | [`0x310169a5...`](https://sepolia.etherscan.io/tx/0x310169a50d8247ca444d59b6722b1ba3a150aec816af004862930c8310793b92) | Sepolia |
| **Example swap TX** | [`0x7ea48782...`](https://sepolia.etherscan.io/tx/0x7ea4878204a110f1f2d9f2b4e4572332c976e13caabbbff2522d718e0b27242f) | Sepolia |

The agent's on-chain reputation is queryable by any contract or agent via `getAgentReputation(address)`.

## How the Arbiter works

Nava's Arbiter is a transaction intent verification engine that runs 18 validation nodes across four categories:

| Category | What it checks |
|----------|---------------|
| **Intent Alignment** | Token matching, amount matching, slippage tolerance, deadline, fee alignment |
| **Technical Invariants** | Format validation, protocol compatibility, sequence checks |
| **Adversarial Detection** | MEV risk parameters, intent manipulation, parameter manipulation |
| **Legal Compliance** | Sanctions screening, token legitimacy |

Each node returns PASS, FAIL, or SKIP with a confidence score. Any critical FAIL triggers an early stop -- the trade is rejected before reaching Uniswap. With LLM semantic checks enabled, 14 of 18 nodes actively verify each trade.

## Quick start

### Prerequisites

- Python 3.11+
- Node.js 18+ (for dashboard)
- [arbiter-core](https://github.com/navalabs-dev/arbiter-core) running locally

### 1. Start the Arbiter

```bash
cd /path/to/arbiter-core
pip install -e .
# Set OPENAI_API_KEY in .env for LLM semantic checks
python -m uvicorn api.server:app --port 8000
```

### 2. Run the trading agent

```bash
cd nava-synthesis
pip install -r requirements.txt
cp .env.example .env
# Edit .env: add AGENT_PRIVATE_KEY for live execution + attestations

# Single run
python -m agent.trader

# Autonomous mode (continuous rebalancing)
python -m agent.trader --autonomous --interval 60 --max-cycles 10
```

### 3. Start the dashboard

```bash
# Terminal 1: API server
python -m agent.api

# Terminal 2: React dashboard
cd dashboard
npm install
npm run dev
```

## Autonomous mode

The agent runs fully autonomously with `--autonomous`:

```bash
python -m agent.trader --autonomous --interval 60 --max-cycles 5
```

Each cycle: monitor portfolio drift -> compute swaps -> verify with Arbiter -> execute on Uniswap -> post attestation. No human in the loop.

| Flag | Default | Description |
|------|---------|-------------|
| `--autonomous` | off | Enable continuous operation |
| `--interval` | 60 | Seconds between cycles |
| `--max-cycles` | 0 | Max cycles (0 = unlimited) |

Safety guardrails:
- Max slippage hard cap (1.5%)
- Arbiter verification required before every execution
- Retry limit (3 attempts per swap)
- All decisions attested on-chain

## ArbiterAttestation contract

Every verification result is posted on-chain as an attestation, following the ERC-8004 Validation Registry pattern.

```solidity
// Record a verification result
function recordAttestation(
    bytes32 intentHash,      // keccak256 of human intent
    uint8 decision,          // 1 = PASS, 0 = REJECT
    uint16 passedNodes,
    uint16 failedNodes,
    uint16 skippedNodes,
    bytes32 executionTxHash, // swap tx (0x0 if not executed)
    string protocol          // e.g. "uniswap"
) external returns (uint256 attestationId)

// Query an agent's trust record
function getAgentReputation(address agent) external view returns (
    uint256 attestationCount,
    uint256 passCount,
    uint256 rejectCount,
    uint256 nodesChecked,
    uint256 nodesPassed
)
```

Any agent or protocol can query `getAgentReputation(agentAddress)` to assess whether this agent has a track record of verified, safe trading.

## Project structure

```
nava-synthesis/
  agent/
    trader.py              # Main loop: verify -> execute -> attest -> log
    strategy.py            # Portfolio rebalancing (drift detection)
    arbiter_client.py      # HTTP client for arbiter-core /validate
    uniswap_client.py      # Uniswap V3 quoting + swap execution
    attestation_client.py  # Posts attestations to ArbiterAttestation contract
    config.py              # Configuration (tokens, routers, strategy params)
    api.py                 # Dashboard API server
  contracts/
    src/ArbiterAttestation.sol  # On-chain attestation contract
  dashboard/
    src/App.tsx            # React dashboard with Nava brand theme
  agent.json               # ERC-8004 agent manifest
  examples/
    sample_audit.json      # Real verification + execution + attestation trace
  logs/                    # Audit trail output
```

## Hackathon tracks

### Agents that pay + Agents that trust (Open Track)

The agent operates within scoped spending permissions (target allocation, max slippage, deadline). Every transaction is auditable on-chain. The human defines the boundaries; the agent operates freely within them. Before any on-chain action, the Arbiter independently verifies the intent.

### Agents With Receipts -- ERC-8004 (Protocol Labs)

Every verification result is posted as an on-chain attestation. The agent's trust history is queryable by any contract or agent. The ArbiterAttestation contract follows the ERC-8004 Validation Registry pattern -- receipts are permanent and composable.

### Let the Agent Cook (Protocol Labs)

Autonomous mode runs the full decision loop without human intervention: monitor -> decide -> verify -> execute -> attest -> log. The agent has an ERC-8004 identity, a capability manifest (`agent.json`), and structured execution logs. Safety guardrails prevent runaway behavior.

## Tech stack

| Component | Technology |
|-----------|-----------|
| Trading agent | Python (autonomous decision loop) |
| Verification | Nava Arbiter (FastAPI, 18-node validation graph) |
| Execution | Uniswap V3 SwapRouter02 via web3.py |
| Quoting | Uniswap V3 Quoter V2 (real on-chain quotes) |
| Attestation | ArbiterAttestation.sol (Solidity, Foundry) |
| Dashboard | React + Vite + Nava brand theme |
| Identity | ERC-8004 on Base Mainnet |
| Network | Ethereum Sepolia testnet |
| Audit | Structured JSON logs with full trace |

## Why this matters

AI agents are moving money autonomously. Today, there's no independent verification layer between an agent's decision and on-chain execution, and no way to prove an agent's track record. Arbiter Guard fills both gaps:

- Every trade is checked against 18 validation nodes before execution
- Every verification result is attested on-chain -- permanent, queryable receipts
- The human stays in control via configurable rules (not just trust)
- Other agents and protocols can query the agent's trust history before interacting
- Full audit trail -- every decision is inspectable after the fact

We didn't build the Arbiter at this hackathon -- we used it. It's live infrastructure for the agentic economy.

**Follow Nava**: [@navaai on X](https://x.com/navaai)
