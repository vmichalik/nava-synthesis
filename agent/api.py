"""
Simple API server for the Arbiter Guard dashboard.
Serves audit data from the agent's log directory and can trigger new runs.
"""

import glob
import json
import os
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent.config import LOG_DIR

app = FastAPI(title="Arbiter Guard Dashboard API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for the latest run (updated when agent runs)
_latest_run: dict | None = None
_all_runs: list[dict] = []


def _load_logs() -> list[dict]:
    """Load all audit logs from disk, sorted newest first."""
    pattern = os.path.join(LOG_DIR, "audit_*.json")
    files = sorted(glob.glob(pattern), reverse=True)
    logs = []
    for f in files:
        try:
            with open(f) as fh:
                logs.append(json.load(fh))
        except Exception:
            continue
    return logs


@app.get("/api/status")
def status():
    return {"status": "ok", "log_dir": LOG_DIR}


@app.get("/api/runs")
def get_runs():
    """Return all audit runs, newest first."""
    logs = _load_logs()
    return {"runs": logs, "count": len(logs)}


@app.get("/api/latest")
def get_latest():
    """Return the most recent audit run."""
    logs = _load_logs()
    if not logs:
        return {"run": None}
    return {"run": logs[0]}


@app.post("/api/run")
def trigger_run():
    """Trigger a new rebalancing cycle and return results."""
    from agent.arbiter_client import ArbiterClient
    from agent.uniswap_client import UniswapClient
    from agent.trader import run_once

    arbiter = ArbiterClient()
    uniswap = UniswapClient()
    records = run_once(arbiter=arbiter, uniswap=uniswap)

    return {
        "trades": len(records),
        "verified": sum(1 for r in records if r.get("verification", {}).get("decision") == "PASS"),
        "rejected": sum(1 for r in records if r.get("verification", {}).get("decision") == "REJECT"),
        "executed": sum(1 for r in records if r.get("execution", {}).get("success")),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("agent.api:app", host="0.0.0.0", port=8001, reload=True)
