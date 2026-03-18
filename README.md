# Arbiter Guard

An autonomous trading agent that won't execute a trade unless an independent safety check says it's OK. If the check passes, the trade goes through and the result gets written on-chain as a permanent receipt. If it fails, the agent adjusts and tries again.

Built for [The Synthesis](https://synthesis.md/) by Vijay Michalik + Claude (Opus 4.6).

## How it works

The agent wants to rebalance a portfolio on Uniswap. Before any swap hits the chain, the proposed trade goes through the Arbiter, a verification engine that checks the transaction against 18 independent safety rules. Things like: does this swap match what the user actually asked for? Is the slippage reasonable? Are the tokens legitimate? Is the recipient address sanctioned?

Only trades that pass all checks get executed. Every result, pass or fail, gets recorded on-chain as an attestation. That means anyone can look up this agent's track record and decide whether to trust it.

```
    Agent decides to trade
            |
            v
    +---------------+
    |   Arbiter     |  18 safety checks:
    |   Verification|  intent alignment, slippage,
    |               |  sanctions, MEV risk, token
    |   PASS / FAIL |  legitimacy, manipulation...
    +-------+-------+
            |
       +---------+---------+
       |                   |
     PASS                FAIL
       |                   |
       v                   v
  Execute swap       Adjust params
  on Uniswap         and retry
       |              (up to 3x)
       v
  Record attestation
  on-chain
       |
       v
  Anyone can query
  this agent's
  verification history
```

In autonomous mode, the agent runs this loop continuously without anyone steering it.

## What's deployed

| What | Where |
|------|-------|
| Attestation contract | [`0x708c384...`](https://sepolia.etherscan.io/address/0x708c3848f99a80732124344AebE6e9bBb5dA31D5) on Sepolia |
| Agent identity (ERC-8004) | [`0x3ded514...`](https://basescan.org/tx/0x3ded5141bd9af5533b69d236e0821089c1806923ce3fb3aaf83fa755e431506e) on Base |
| Example swap | [`0x7ea4878...`](https://sepolia.etherscan.io/tx/0x7ea4878204a110f1f2d9f2b4e4572332c976e13caabbbff2522d718e0b27242f) on Sepolia |
| Example attestation | [`0x310169a...`](https://sepolia.etherscan.io/tx/0x310169a50d8247ca444d59b6722b1ba3a150aec816af004862930c8310793b92) on Sepolia |

The attestation contract exposes `getAgentReputation(address)`, so any other contract or agent can check this agent's pass rate, number of verified trades, and total nodes checked before deciding to interact.

## What the Arbiter checks

The Arbiter runs 18 validation nodes. With LLM reasoning enabled, 14 of them actively fire on each trade. They fall into four groups:

- **Does the trade match the intent?** Token pairs, amounts, slippage bounds, deadlines, fee tiers
- **Is the transaction well-formed?** Format validation, protocol compatibility, sequencing
- **Is someone trying to exploit this?** MEV risk, parameter manipulation, intent tampering, consistency
- **Is it legal?** Sanctions screening, token legitimacy

A single critical failure stops everything. The trade never reaches Uniswap.

## Running it

### Prerequisites

- Python 3.11+
- Node.js 18+ (for the dashboard)
- [arbiter-core](https://github.com/navalabs-dev/arbiter-core) running on port 8000

### Setup

```bash
cd nava-synthesis
pip install -r requirements.txt
cp .env.example .env
```

Add to `.env`:
```
OPENAI_API_KEY=sk-...          # Enables LLM semantic checks in the Arbiter
AGENT_PRIVATE_KEY=0x...        # Sepolia wallet for live swaps + attestations
```

### Single run

```bash
python -m agent.trader
```

### Autonomous mode

```bash
python -m agent.trader --autonomous --interval 60 --max-cycles 10
```

Runs the full loop (check portfolio, compute swaps, verify, execute, attest) every 60 seconds, up to 10 cycles. Drop `--max-cycles` to run indefinitely.

### Dashboard

```bash
python -m agent.api          # API server on :8001
cd dashboard && npm install && npm run dev   # React UI
```

## Guardrails

The agent can't go off the rails even in autonomous mode:

- Slippage hard cap at 1.5%
- Every swap must pass Arbiter verification before execution
- 3 retry attempts max per swap, then it moves on
- All decisions (pass and fail) get attested on-chain

## Attestation contract

The contract is simple. Two main functions:

```solidity
// Write: record a verification result
function recordAttestation(
    bytes32 intentHash,
    uint8 decision,           // 1 = pass, 0 = reject
    uint16 passedNodes,
    uint16 failedNodes,
    uint16 skippedNodes,
    bytes32 executionTxHash,
    string protocol
) external returns (uint256 attestationId)

// Read: check an agent's track record
function getAgentReputation(address agent) external view returns (
    uint256 attestationCount,
    uint256 passCount,
    uint256 rejectCount,
    uint256 nodesChecked,
    uint256 nodesPassed
)
```

## Project structure

```
agent/
  trader.py              Main loop: verify, execute, attest, log
  strategy.py            Portfolio rebalancing logic
  arbiter_client.py      Talks to the Arbiter's /validate endpoint
  uniswap_client.py      Uniswap V3 quotes and swaps via web3.py
  attestation_client.py  Posts results to the attestation contract
  api.py                 Serves audit data to the dashboard
contracts/
  src/ArbiterAttestation.sol
dashboard/
  src/App.tsx            React UI with Nava brand theme
agent.json               ERC-8004 agent manifest
```

## Tracks

**Open Track** (Agents that pay + Agents that trust): The human sets the rules (target allocation, max slippage, deadline). The agent trades within those boundaries. Every trade is independently verified and auditable on-chain.

**Agents With Receipts, ERC-8004** (Protocol Labs): Verification results are posted as on-chain attestations. The agent builds a queryable trust history over time. Other agents can check the record before interacting.

**Let the Agent Cook** (Protocol Labs): Autonomous mode. Full decision loop, no human in the loop. ERC-8004 identity, agent manifest, structured logs, safety guardrails.

## Stack

| | |
|-|-|
| Agent | Python, autonomous decision loop |
| Verification | Nava Arbiter, 18-node validation graph |
| Execution | Uniswap V3 SwapRouter02, web3.py |
| Attestation | ArbiterAttestation.sol, Foundry |
| Identity | ERC-8004 on Base |
| Dashboard | React, Vite |
| Network | Ethereum Sepolia |

---

[@navaai](https://x.com/navaai)
