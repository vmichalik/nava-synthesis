<p align="center">
  <img src="assets/nava-logo.svg" width="48" alt="Nava" />
</p>

<h1 align="center">Arbiter Guard</h1>

<p align="center">
  An autonomous trading agent that checks every transaction against 18 independent<br>
  safety rules before it touches the chain. Passes get executed. Failures get blocked.<br>
  Both outcomes are recorded on-chain as permanent, queryable receipts.
</p>

<p align="center">
  <a href="https://synthesis.md/">The Synthesis</a> &nbsp;|&nbsp;
  <a href="https://x.com/navaai">@navaai</a> &nbsp;|&nbsp;
  <a href="https://sepolia.etherscan.io/address/0x708c3848f99a80732124344AebE6e9bBb5dA31D5">Attestation Contract</a>
</p>

---

<p align="center">
  <img src="assets/demo.gif" alt="Arbiter Guard terminal demo" width="720" />
</p>

---

## How it works

The agent maintains a 60/40 WETH/USDC target allocation and rebalances when drift exceeds 5%. Before any swap goes through, the proposed transaction is sent to the Arbiter for verification.

The Arbiter checks whether the swap matches what was requested, whether the parameters are safe, whether the addresses are sanctioned, whether the routing contract is legitimate, and whether anyone has tampered with the intent. 18 checks in total. If any critical check fails, the trade is blocked.

After verification, the result is posted on-chain as an attestation. Other agents or contracts can query this history to decide whether to trust this agent.

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
  Execute swap       Block trade
  on Uniswap         (log reason)
       |
       v
  Record attestation
  on-chain
       |
       v
  Anyone can query
  this agent's
  verification history
```

In autonomous mode, the agent runs this loop continuously without human intervention.

---

## On-chain artifacts

| | |
|---|---|
| **Attestation contract** | [`0x708c3848...`](https://sepolia.etherscan.io/address/0x708c3848f99a80732124344AebE6e9bBb5dA31D5) on Sepolia |
| **Agent identity** (ERC-8004) | [`0x3ded5141...`](https://basescan.org/tx/0x3ded5141bd9af5533b69d236e0821089c1806923ce3fb3aaf83fa755e431506e) on Base |
| **Example swap** | [`0xaf9cb638...`](https://sepolia.etherscan.io/tx/0xaf9cb63873a68cb3ae9c5fe58c748b9fbb0731af77190d64196ed33e04523646) on Sepolia |
| **Example attestation** | [`0x883b9d23...`](https://sepolia.etherscan.io/tx/0x883b9d238c975418c4d0c2c833f502dca7f80feae14e037b685d142c1539d982) on Sepolia |
| **On-chain record** | 46 attestations, 39% pass rate |

Any contract can call `getAgentReputation(address)` to check the record.

---

## Demo transactions

Six sequential scenarios, each verified by the Arbiter and attested on Sepolia.

#### PASS -- Rebalance buy WETH
> USDC overweight, agent sells USDC for WETH

```
Intent:       Rebalance portfolio: swap USDC for WETH on Uniswap V3
Checks:       13 passed, 0 failed
Swap TX:      0xaf9cb63873a68cb3ae9c5fe58c748b9fbb0731af   (25 USDC -> WETH, block 10470537)
Attestation:  0x883b9d238c975418c4d0c2c833f502dca7f80fea
```

[View swap](https://sepolia.etherscan.io/tx/0xaf9cb63873a68cb3ae9c5fe58c748b9fbb0731af77190d64196ed33e04523646) | [View attestation](https://sepolia.etherscan.io/tx/0x883b9d238c975418c4d0c2c833f502dca7f80feae14e037b685d142c1539d982)

#### REJECT -- Sanctioned recipient
> Tornado Cash deposit address on OFAC deny list

```
Intent:       Swap 0.5 WETH for USDC, send to 0x8576a...91353c
Failed:       sanctions_screening -- address present in sanctions/deny registry
Attestation:  0x5db92cb50a14ef6a6bf5a1e6ac28073c6d5cc1a7
```

[View attestation](https://sepolia.etherscan.io/tx/0x5db92cb50a14ef6a6bf5a1e6ac28073c6d5cc1a7be0217fb30ccc8456911266e)

#### REJECT -- Intent mismatch
> Intent says DAI but the transaction swaps WETH

```
Intent:       Buy 100 DAI with USDC on Uniswap V3
Failed:       amount_matching -- intent does not match transaction
Attestation:  0x9e7820cc171d0a3331a70584074ff2d836ae92be
```

[View attestation](https://sepolia.etherscan.io/tx/0x9e7820cc171d0a3331a70584074ff2d836ae92bef7eac3db7389ea6635359f9a)

#### REJECT -- Unknown router
> Transaction targets a fake contract address

```
Intent:       Rebalance portfolio: swap WETH for USDC on Uniswap V3
Failed:       protocol_compatibility -- 0xdead... is not a registered Uniswap contract
Attestation:  0x821e996dc59d4a0ec54df2c4110c452f58c3e683
```

[View attestation](https://sepolia.etherscan.io/tx/0x821e996dc59d4a0ec54df2c4110c452f58c3e68394fd222b52607128fcd01b07)

> Every rejection is permanently recorded on-chain alongside the passes.

---

## What the Arbiter checks

18 validation nodes in four groups:

| | |
|---|---|
| **Intent alignment** | Does the trade match what was requested? Token pairs, amounts, slippage, deadlines, fees |
| **Technical invariants** | Is the transaction well-formed? Format validation, protocol compatibility, sequencing |
| **Adversarial detection** | Is someone trying to exploit it? MEV risk, parameter manipulation, intent tampering |
| **Legal compliance** | Is it legal? Sanctions screening, token legitimacy |

One critical failure stops everything. The trade never reaches Uniswap.

The LLM reasoning behind each check can run through Venice for private inference. The verification logic stays private. Only the pass/fail result goes on-chain.

---

## Running it

**Prerequisites:** Python 3.11+, Node.js 18+, [arbiter-core](https://github.com/navalabs-dev/arbiter-core) running on port 8000

```bash
cd nava-synthesis
pip install -r requirements.txt
cp .env.example .env
# Add OPENAI_API_KEY and AGENT_PRIVATE_KEY to .env
```

**Single run:**
```bash
python -m agent.trader
```

**Autonomous mode:**
```bash
python -m agent.trader --autonomous --interval 60 --max-cycles 10
```

**Dashboard:**
```bash
python -m agent.api                              # API server
cd dashboard && npm install && npm run dev       # React UI
```

The dashboard reads live balances from Sepolia, shows the verification status of every trade, and lets you trigger rebalances or adversarial tests interactively.

---

## Guardrails

Even in autonomous mode:
- Slippage hard cap at 1.5%
- Every swap must pass Arbiter verification before execution
- 3 retry attempts max per swap
- All decisions (pass and reject) get attested on-chain

---

## Attestation contract

```solidity
// Record a verification result
function recordAttestation(
    bytes32 intentHash,
    uint8 decision,           // 1 = pass, 0 = reject
    uint16 passedNodes,
    uint16 failedNodes,
    uint16 skippedNodes,
    bytes32 executionTxHash,
    string protocol
) external returns (uint256 attestationId)

// Check an agent's track record
function getAgentReputation(address agent) external view returns (
    uint256 attestationCount,
    uint256 passCount,
    uint256 rejectCount,
    uint256 nodesChecked,
    uint256 nodesPassed
)
```

---

## Project structure

```
agent/
  trader.py              Main loop: verify, execute, attest, log
  strategy.py            Portfolio rebalancing logic
  arbiter_client.py      Talks to the Arbiter's /validate endpoint
  uniswap_client.py      Uniswap V3 quotes and swaps via web3.py
  attestation_client.py  Posts results to the attestation contract
  api.py                 Dashboard API with live balances + adversarial tests
contracts/
  src/ArbiterAttestation.sol
dashboard/
  src/App.tsx            React dashboard with Nava brand theme
agent.json               ERC-8004 agent manifest
```

---

## Tracks

**Open Track** (Agents that pay + Agents that trust)
The human sets the rules. The agent trades within those boundaries. Every trade is independently verified and auditable on-chain.

**Agents With Receipts, ERC-8004** (Protocol Labs)
Verification results are posted as on-chain attestations. The agent builds a queryable trust history. Other agents can check the record before interacting.

**Let the Agent Cook** (Protocol Labs)
Autonomous mode. Full decision loop without human intervention. ERC-8004 identity, agent manifest, structured logs, safety guardrails.

**Private Agents, Trusted Actions** (Venice)
The Arbiter's LLM checks run through Venice's private inference. The reasoning stays private. Only the binary result goes on-chain.

---

## Stack

| | |
|---|---|
| Agent | Python, autonomous decision loop |
| Verification | Nava Arbiter, 18-node validation graph (Venice or OpenAI) |
| Execution | Uniswap V3 SwapRouter02, web3.py |
| Attestation | ArbiterAttestation.sol, Foundry |
| Identity | ERC-8004 on Base |
| Dashboard | React, Vite, Nava brand theme |
| Network | Ethereum Sepolia |

---

<p align="center">
  Preview access to the Nava Arbiter is coming soon for agent builders.<br>
  If you're building autonomous agents that move value on-chain<br>
  and want independent verification before execution, reach out.
</p>

<p align="center">
  <a href="https://x.com/navaai"><b>@navaai</b></a>
</p>
