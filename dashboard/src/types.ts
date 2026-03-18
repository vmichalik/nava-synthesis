export interface NodeResult {
  status: string
  confidence: number
  reasoning: string
  details: Record<string, unknown>
}

export interface TradeRecord {
  timestamp: string
  attempt: number
  intent: string
  token_in: string
  token_out: string
  amount_in: number
  slippage_bps: number
  chain_id: number
  proposed_tx: Record<string, unknown>
  verification: {
    decision: string
    reason: string
    protocol: string | null
    primary_failure_node: string | null
    llm_calls: number
    passed_nodes: string[]
    failed_nodes: string[]
    skipped_nodes: string[]
    explanation: {
      summary: string
      decision: string
      recommendations: string[]
      confidence_summary: { min: number; max: number; avg: number }
      affected_nodes: Record<string, { count: number; nodes: string[] }>
    } | null
  }
  execution: {
    mode: string
    success: boolean
    tx_hash: string | null
    block_number: number | null
    gas_used: number | null
    explorer_url: string | null
    error: string | null
  } | null
  attestation?: {
    success: boolean
    attestation_id: number | null
    tx_hash: string | null
    explorer_url: string | null
    error: string | null
  } | null
  error?: string
}

export interface AuditRun {
  run_timestamp: string
  uniswap_mode?: string
  uniswap_chain_id?: number
  portfolio: {
    balances: Record<string, number>
    prices: Record<string, number>
    total_value_usd: number
    allocation: Record<string, number>
  }
  trades: TradeRecord[]
}
