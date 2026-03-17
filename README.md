# Arbiter Guard

**Verified autonomous trading on Uniswap, powered by Nava's Arbiter.**

Built for [The Synthesis](https://synthesis.md/) hackathon (March 2026).

## What it does

An autonomous trading agent that verifies every transaction through Nava's Arbiter verification engine before executing on Uniswap. No trade goes on-chain without passing multi-node safety checks.

1. Agent evaluates portfolio drift against target allocation
2. Constructs a Uniswap V3 swap intent (token pair, amount, slippage, deadline)
3. Sends the intent to the Arbiter's `/validate` endpoint
4. **If PASS** -- executes the swap via Uniswap V3 SwapRouter on Sepolia
5. **If REJECT** -- adjusts parameters (widens slippage), retries within bounds
6. Full audit trail logged: intent, per-node verification results, execution outcome

## Architecture

```
+-------------------+     +----------------+     +-------------------+
|  Trading Agent    |---->|  Arbiter       |---->|  Uniswap V3       |
|  (Python)         |     |  (FastAPI)     |     |  SwapRouter       |
|                   |<----|  /validate     |     |  (Sepolia)        |
|  Strategy +       |     |                |     |                   |
|  retry logic      |     |  PASS/REJECT   |     |  Real quotes +   |
+--------+----------+     +----------------+     |  TxIDs            |
         |                                       +-------------------+
         v
+-------------------+     +----------------+
|  Dashboard API    |---->|  React UI      |
|  (FastAPI :8001)  |     |  (Vite + MUI)  |
|  /api/latest      |     |  Nava brand    |
|  /api/run         |     |  theme         |
+-------------------+     +----------------+
```

The Arbiter runs as external infrastructure -- it's not part of this repo. It's a live verification engine that checks intent alignment, token legitimacy, slippage tolerance, sanctions compliance, and adversarial manipulation before allowing execution.

## How the Arbiter works

[Nava's Arbiter](https://navalabs.ai) is a transaction intent verification engine that runs 18 validation nodes across four categories:

| Category | What it checks |
|----------|---------------|
| **Intent Alignment** | Token matching, amount matching, slippage tolerance, deadline, fee alignment |
| **Technical Invariants** | Format validation, protocol compatibility, sequence checks |
| **Adversarial Detection** | MEV risk parameters, intent manipulation, parameter manipulation |
| **Legal Compliance** | Sanctions screening, token legitimacy |

Each node returns PASS, FAIL, or SKIP with a confidence score. Any critical FAIL triggers an early stop -- the trade is rejected before reaching Uniswap.

## Quick start

### Prerequisites

- Python 3.11+
- Node.js 18+ (for dashboard)
- [arbiter-core](https://github.com/navalabs-dev/arbiter-core) running locally

### 1. Start the Arbiter

```bash
cd /path/to/arbiter-core
pip install -e .
python -m uvicorn api.server:app --port 8000
```

### 2. Run the trading agent

```bash
cd nava-synthesis
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings

python -m agent.trader
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

Open http://localhost:5173 to see the dashboard.

### Live mode (real on-chain execution)

Set `AGENT_PRIVATE_KEY` in `.env` with a funded Sepolia wallet to execute real swaps:

```bash
# .env
AGENT_PRIVATE_KEY=0x...  # Sepolia testnet wallet only!
```

The agent will approve tokens, execute swaps via the V3 SwapRouter, and log real TxIDs.

## Project structure

```
nava-synthesis/
  agent/
    trader.py          # Main trading loop: strategy -> verify -> execute -> log
    strategy.py        # Portfolio rebalancing (target allocation, drift detection)
    arbiter_client.py  # HTTP client for arbiter-core /validate
    uniswap_client.py  # Uniswap V3 quoting + swap execution (web3.py)
    config.py          # Configuration (tokens, routers, strategy params)
    api.py             # Dashboard API server
  dashboard/
    src/App.tsx        # React dashboard with @navalabs-dev/brand-mui
  examples/
    sample_audit.json  # Example verification + execution trace
  logs/                # Audit trail output
```

## How this addresses "Agents that pay" + "Agents that trust"

**Agents that pay**: The agent operates within scoped spending permissions (target allocation, max slippage, deadline). Every transaction is auditable on-chain. The human defines the boundaries; the agent operates freely within them.

**Agents that trust**: Before any on-chain action, the Arbiter independently verifies the transaction intent. The agent can't execute anything the verification engine hasn't approved. Other agents or protocols can query the verification history to assess trustworthiness.

## Tech stack

| Component | Technology |
|-----------|-----------|
| Trading agent | Python (autonomous decision loop) |
| Verification | [Nava Arbiter](https://navalabs.ai) (FastAPI, 18-node validation graph) |
| Execution | Uniswap V3 SwapRouter via web3.py |
| Quoting | Uniswap V3 Quoter V2 (real on-chain quotes) |
| Dashboard | React + Vite + MUI + [@navalabs-dev/brand-mui](https://github.com/navalabs-dev/brand) |
| Network | Ethereum Sepolia testnet |
| Audit | Structured JSON logs with full verification trace |

## Why this matters

AI agents are moving money autonomously. Today, there's no independent verification layer between an agent's decision and on-chain execution. The Arbiter fills that gap:

- Every trade is checked against 18 validation nodes before execution
- The human stays in control via configurable rules (not just trust)
- Full audit trail -- every decision is inspectable after the fact
- The verification engine is external infrastructure, not embedded in the agent

We didn't build the Arbiter at this hackathon -- we used it. It's live infrastructure for the agentic economy.

**Learn more**: [navalabs.ai](https://navalabs.ai) | [Testnet](https://testnet.navalabs.ai)

---

Built by Vijay Michalik + Claude (Opus 4.6) for [The Synthesis](https://synthesis.md/).
