import { useState, useEffect, useCallback } from 'react'
import { Box, Typography, Button, LinearProgress, Alert, Tooltip, Collapse } from '@mui/material'
import { colors, gradients, effects } from '@navalabs-dev/brand-mui'
import type { AuditRun, TradeRecord } from './types'

const API_BASE = 'http://localhost:8001'

const S = {
  pass: '#34D399',
  fail: '#FE0600',
  skip: '#94A3B8',
  warn: '#F5A623',
  glass: {
    background: gradients.cardDark,
    backdropFilter: effects.blur,
    WebkitBackdropFilter: effects.blur,
    boxShadow: effects.cardShadow,
  },
  mono: "'Muoto Mono', 'JetBrains Mono', monospace",
  sans: "'Muoto', sans-serif",
}

/* ─── Tiny components ────────────────────────────────── */

function Pulse({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Box sx={{
        position: 'absolute', inset: 0, borderRadius: '50%', background: color,
        animation: 'pulse 2s ease-in-out infinite',
        '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
      }} />
    </Box>
  )
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <Box sx={{
      px: 1.2, py: 0.3,
      border: `1px solid ${color}33`,
      borderRadius: '999px',
      color,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.08em',
      fontFamily: S.mono,
      textTransform: 'uppercase',
      background: `${color}0a`,
    }}>
      {label}
    </Box>
  )
}

function Metric({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <Box sx={{
      ...S.glass, borderRadius: '12px', p: 2.5, flex: 1, minWidth: 120,
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <Typography sx={{
        fontFamily: S.mono, fontSize: 10, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.4)', mb: 1,
      }}>
        {label}
      </Typography>
      <Typography sx={{
        fontFamily: S.sans, fontSize: 28, fontWeight: 700,
        color: color || colors.white, lineHeight: 1,
      }}>
        {value}
      </Typography>
      {sub && (
        <Typography sx={{ fontFamily: S.mono, fontSize: 10, color: 'rgba(255,255,255,0.3)', mt: 0.5 }}>
          {sub}
        </Typography>
      )}
    </Box>
  )
}

/* ─── Node descriptions ──────────────────────────────── */

const NODE_DESC: Record<string, string> = {
  'intent_alignment.operation_matching': 'Checks that the swap function matches what the user asked for',
  'intent_alignment.token_matching': 'Verifies the token addresses match the requested pair',
  'intent_alignment.amount_matching': 'Confirms the trade amount matches the user\'s intent',
  'intent_alignment.slippage_tolerance': 'Validates slippage is within the user\'s tolerance',
  'intent_alignment.deadline_consistency': 'Ensures the deadline hasn\'t expired',
  'intent_alignment.fee_alignment': 'Checks the fee tier is appropriate for this pair',
  'intent_alignment.element_matching': 'LLM cross-checks all extracted elements against the tx',
  'intent_alignment.requirement_compliance': 'LLM verifies all stated requirements are met',
  'intent_alignment.approval_covers_primary': 'Checks token approval covers the swap amount',
  'intent_alignment.sequence_check': 'Validates approval comes before the swap',
  'adversarial_detection.mev_risky_parameters': 'Flags parameters that expose the trade to MEV extraction',
  'adversarial_detection.intent_manipulation': 'LLM checks if the intent was tampered with',
  'adversarial_detection.parameter_manipulation': 'LLM detects adversarially tweaked parameters',
  'adversarial_detection.consistency_analysis': 'LLM checks internal consistency of the transaction',
  'technical_invariants.format_validation_lowlevel': 'Validates the transaction data is well-formed',
  'technical_invariants.protocol_compatibility': 'Confirms the router is a known Uniswap contract',
  'legal_compliance.sanctions_screening': 'Screens all addresses against OFAC sanctions list',
  'legal_compliance.token_legitimacy': 'Checks tokens aren\'t known scams or honeypots',
}

function nodeLabel(name: string): string {
  return name.split('.').pop()?.replace(/_/g, ' ') || name
}

/* ─── Node dot grid ──────────────────────────────────── */

function NodeGrid({ trade }: { trade: TradeRecord }) {
  const { verification: v } = trade
  const nodes = [
    ...v.passed_nodes.map(n => ({ name: n, status: 'PASS' as const })),
    ...v.failed_nodes.map(n => ({ name: n, status: 'FAIL' as const })),
    ...v.skipped_nodes.map(n => ({ name: n, status: 'SKIP' as const })),
  ]

  const nodeColor = (s: string) => s === 'PASS' ? S.pass : s === 'FAIL' ? S.fail : S.skip

  const categories: Record<string, typeof nodes> = {}
  for (const n of nodes) {
    const cat = n.name.split('.')[0].replace(/_/g, ' ')
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(n)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {Object.entries(categories).map(([cat, catNodes]) => (
        <Box key={cat}>
          <Typography sx={{
            fontFamily: S.mono, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)', mb: 0.5,
          }}>
            {cat}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {catNodes.map(n => (
              <Tooltip
                key={n.name}
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 0.5, maxWidth: 240 }}>
                    <Typography sx={{ fontFamily: S.mono, fontSize: 10, fontWeight: 700, color: nodeColor(n.status), mb: 0.3 }}>
                      {nodeLabel(n.name)} — {n.status}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                      {NODE_DESC[n.name] || n.name}
                    </Typography>
                  </Box>
                }
              >
                <Box
                  sx={{
                    width: 28, height: 28, borderRadius: '6px',
                    background: `${nodeColor(n.status)}18`,
                    border: `1px solid ${nodeColor(n.status)}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'default',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      background: `${nodeColor(n.status)}30`,
                      border: `1px solid ${nodeColor(n.status)}60`,
                      transform: 'scale(1.15)',
                    },
                  }}
                >
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: nodeColor(n.status),
                  }} />
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

/* ─── Trade panel ────────────────────────────────────── */

function TradePanel({ trade, defaultOpen = false }: { trade: TradeRecord; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const { verification: v, execution: e } = trade
  const passed = v.passed_nodes.length
  const total = passed + v.failed_nodes.length + v.skipped_nodes.length

  return (
    <Box sx={{
      ...S.glass, borderRadius: '16px', overflow: 'hidden',
      border: `1px solid ${v.decision === 'PASS' ? S.pass : S.fail}15`,
      transition: 'border-color 0.2s ease',
      '&:hover': { borderColor: `${v.decision === 'PASS' ? S.pass : S.fail}30` },
    }}>
      {/* Header bar - clickable */}
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          px: 2.5, py: 1.5,
          borderBottom: open ? '1px solid rgba(255,255,255,0.04)' : 'none',
          display: 'flex', alignItems: 'center', gap: 1.5,
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { background: 'rgba(255,255,255,0.02)' },
        }}>
        <Pulse color={v.decision === 'PASS' ? S.pass : S.fail} />
        <Tag label={v.decision} color={v.decision === 'PASS' ? S.pass : S.fail} />
        <Typography sx={{ fontFamily: S.sans, fontSize: 14, fontWeight: 700, color: colors.white, flex: 1 }}>
          {trade.amount_in?.toFixed(4)} {trade.token_in} &rarr; {trade.token_out}
        </Typography>
        {e?.success && (
          <Tag label={e.mode === 'live' ? 'executed' : 'simulated'} color={e.mode === 'live' ? S.pass : S.skip} />
        )}
        {trade.attestation?.success && (
          <Tag label="attested" color={S.pass} />
        )}
        <Typography sx={{
          fontFamily: S.mono, fontSize: 11, color: 'rgba(255,255,255,0.25)',
          ml: 1,
        }}>
          {passed}/{total}
        </Typography>
        {/* Chevron */}
        <Box sx={{
          width: 20, height: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)',
          transition: 'transform 0.2s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          fontSize: 16,
          ml: 0.5,
        }}>
          &#9662;
        </Box>
      </Box>

      {/* Reason preview when collapsed */}
      {!open && (
        <Box sx={{ px: 2.5, py: 1, borderTop: '1px solid rgba(255,255,255,0.02)' }}>
          <Typography sx={{
            fontFamily: S.sans, fontSize: 12,
            color: v.decision === 'PASS' ? 'rgba(255,255,255,0.3)' : `${S.fail}aa`,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {v.reason}
          </Typography>
        </Box>
      )}

      <Collapse in={open}>
      <Box sx={{ display: 'flex' }}>
        {/* Left: nodes */}
        <Box sx={{ flex: '0 0 260px', p: 2.5, borderRight: '1px solid rgba(255,255,255,0.04)' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
            <Typography sx={{ fontFamily: S.sans, fontSize: 32, fontWeight: 700, color: S.pass, lineHeight: 1 }}>
              {passed}
            </Typography>
            <Typography sx={{ fontFamily: S.mono, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              / {total} checks
            </Typography>
          </Box>
          <NodeGrid trade={trade} />
        </Box>

        {/* Right: details */}
        <Box sx={{ flex: 1, p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Intent */}
          <Box>
            <Typography sx={{
              fontFamily: S.mono, fontSize: 9, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)', mb: 0.5,
            }}>
              INTENT
            </Typography>
            <Typography sx={{ fontFamily: S.sans, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              {trade.intent}
            </Typography>
          </Box>

          {/* Verification */}
          <Box>
            <Typography sx={{
              fontFamily: S.mono, fontSize: 9, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)', mb: 0.5,
            }}>
              ARBITER
            </Typography>
            <Typography sx={{ fontFamily: S.sans, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              {v.reason}
            </Typography>
          </Box>

          {/* Execution */}
          {e?.tx_hash && (
            <Box sx={{
              p: 1.5, borderRadius: '8px',
              background: e.success ? `${S.pass}08` : `${S.fail}08`,
              border: `1px solid ${e.success ? S.pass : S.fail}15`,
            }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontFamily: S.mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>
                    TX
                  </Typography>
                  {e.explorer_url ? (
                    <a href={e.explorer_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <Typography sx={{ fontFamily: S.mono, fontSize: 12, color: S.pass, '&:hover': { textDecoration: 'underline' } }}>
                        {e.tx_hash.slice(0, 10)}...{e.tx_hash.slice(-6)}
                      </Typography>
                    </a>
                  ) : (
                    <Typography sx={{ fontFamily: S.mono, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      {e.tx_hash.slice(0, 10)}...{e.tx_hash.slice(-6)}
                    </Typography>
                  )}
                </Box>
                {e.block_number && (
                  <Box>
                    <Typography sx={{ fontFamily: S.mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>
                      BLOCK
                    </Typography>
                    <Typography sx={{ fontFamily: S.mono, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      {e.block_number.toLocaleString()}
                    </Typography>
                  </Box>
                )}
                {e.gas_used && (
                  <Box>
                    <Typography sx={{ fontFamily: S.mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>
                      GAS
                    </Typography>
                    <Typography sx={{ fontFamily: S.mono, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      {e.gas_used.toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
          {e?.error && (
            <Alert severity="error" sx={{ fontSize: 12 }}>{e.error}</Alert>
          )}

          {/* Attestation */}
          {trade.attestation?.tx_hash && (
            <Box sx={{
              p: 1.5, borderRadius: '8px',
              background: `${S.pass}08`,
              border: `1px solid ${S.pass}15`,
            }}>
              <Typography sx={{ fontFamily: S.mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>
                ON-CHAIN ATTESTATION
              </Typography>
              {trade.attestation.explorer_url ? (
                <a href={trade.attestation.explorer_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <Typography sx={{ fontFamily: S.mono, fontSize: 12, color: S.pass, '&:hover': { textDecoration: 'underline' } }}>
                    {trade.attestation.tx_hash.slice(0, 10)}...{trade.attestation.tx_hash.slice(-6)}
                  </Typography>
                </a>
              ) : (
                <Typography sx={{ fontFamily: S.mono, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  {trade.attestation.tx_hash}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
      </Collapse>
    </Box>
  )
}

/* ─── Portfolio ──────────────────────────────────────── */

function Portfolio({ run }: { run: AuditRun }) {
  const { portfolio: p } = run
  const target = { WETH: 0.6, USDC: 0.4 }

  return (
    <Box sx={{
      ...S.glass, borderRadius: '16px', p: 2.5,
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <Typography sx={{
        fontFamily: S.mono, fontSize: 10, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.3)', mb: 2,
      }}>
        PORTFOLIO
      </Typography>

      <Typography sx={{ fontFamily: S.sans, fontSize: 36, fontWeight: 700, color: colors.white, mb: 3, lineHeight: 1 }}>
        ${p.total_value_usd.toLocaleString()}
      </Typography>

      {Object.entries(p.balances).map(([token, balance]) => {
        const alloc = p.allocation[token] || 0
        const price = p.prices[token] || 0
        const tgt = target[token as keyof typeof target] || 0
        const drift = alloc - tgt
        const driftColor = Math.abs(drift) > 0.05 ? S.warn : S.pass

        return (
          <Box key={token} sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.8 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography sx={{ fontFamily: S.sans, fontSize: 15, fontWeight: 700, color: colors.white }}>
                  {token}
                </Typography>
                <Typography sx={{ fontFamily: S.mono, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  {balance.toFixed(token === 'USDC' ? 0 : 4)}
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: S.mono, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                ${(balance * price).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Typography>
            </Box>

            {/* Allocation bar with target marker */}
            <Box sx={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <Box sx={{
                height: '100%',
                width: `${alloc * 100}%`,
                background: driftColor,
                borderRadius: 3,
                transition: 'width 0.5s ease',
              }} />
              {/* Target marker */}
              <Box sx={{
                position: 'absolute',
                left: `${tgt * 100}%`,
                top: -2, height: 10, width: 2,
                background: 'rgba(255,255,255,0.5)',
                borderRadius: 1,
              }} />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography sx={{ fontFamily: S.mono, fontSize: 10, color: driftColor }}>
                {(alloc * 100).toFixed(1)}%
              </Typography>
              <Typography sx={{ fontFamily: S.mono, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                target {(tgt * 100).toFixed(0)}%
              </Typography>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

/* ─── Main ───────────────────────────────────────────── */

function App() {
  const [run, setRun] = useState<AuditRun | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiOnline, setApiOnline] = useState(false)

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/latest`)
      const data = await res.json()
      if (data.run) setRun(data.run)
      setApiOnline(true)
      setError(null)
    } catch {
      setApiOnline(false)
    }
  }, [])

  const triggerRun = async () => {
    setLoading(true)
    setError(null)
    try {
      await fetch(`${API_BASE}/api/run`, { method: 'POST' })
      await fetchLatest()
    } catch (e) {
      setError(`Failed to trigger run: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLatest()
    const interval = setInterval(fetchLatest, 5000)
    return () => clearInterval(interval)
  }, [fetchLatest])

  const trades = run?.trades || []
  const verified = trades.filter(t => t.verification?.decision === 'PASS').length
  const rejected = trades.filter(t => t.verification?.decision === 'REJECT').length
  const executed = trades.filter(t => t.execution?.success).length
  const attested = trades.filter(t => (t as any).attestation?.success).length

  return (
    <Box sx={{
      minHeight: '100vh',
      background: '#000',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <Box sx={{
        position: 'fixed', bottom: -200, left: '50%', transform: 'translateX(-50%)',
        width: 1200, height: 600,
        background: 'radial-gradient(ellipse, rgba(254,6,0,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 4, py: 4, position: 'relative' }}>

        {/* ── Header ──────────────────────────────────── */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          mb: 4, pb: 3, borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Logo mark */}
            <Box sx={{
              width: 36, height: 36, borderRadius: '10px',
              background: gradients.buttonPrimary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: effects.buttonShadow,
            }}>
              <Typography sx={{ fontFamily: S.sans, fontSize: 16, fontWeight: 700, color: colors.white }}>
                N
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontFamily: S.sans, fontSize: 18, fontWeight: 700, color: colors.white, lineHeight: 1.2 }}>
                Arbiter Guard
              </Typography>
              <Typography sx={{ fontFamily: S.mono, fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
                verified autonomous trading
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Pulse color={apiOnline ? S.pass : S.fail} />
              <Typography sx={{ fontFamily: S.mono, fontSize: 10, color: apiOnline ? S.pass : S.fail, letterSpacing: '0.05em' }}>
                {apiOnline ? 'LIVE' : 'OFFLINE'}
              </Typography>
            </Box>
            <Button
              onClick={triggerRun}
              disabled={loading || !apiOnline}
              sx={{
                fontFamily: S.mono, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                px: 2.5, py: 1,
                borderRadius: '999px',
                background: loading ? 'rgba(255,255,255,0.05)' : gradients.buttonPrimary,
                color: colors.white,
                backdropFilter: effects.blurButton,
                boxShadow: effects.buttonShadow,
                '&:hover': { background: gradients.buttonPrimaryHover },
                '&:disabled': { opacity: 0.4 },
              }}
            >
              {loading ? 'running...' : 'rebalance'}
            </Button>
          </Box>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="error" sx={{ mb: 2, fontSize: 12 }}>{error}</Alert>}

        {!apiOnline && !run && (
          <Box sx={{
            ...S.glass, borderRadius: '16px', p: 4, textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <Typography sx={{ fontFamily: S.sans, fontSize: 15, color: 'rgba(255,255,255,0.5)', mb: 1 }}>
              Dashboard API is offline
            </Typography>
            <Typography sx={{ fontFamily: S.mono, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              python -m agent.api
            </Typography>
          </Box>
        )}

        {run && (
          <>
            {/* ── Metrics ────────────────────────────── */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
              <Metric label="Portfolio" value={`$${run.portfolio.total_value_usd.toLocaleString()}`} />
              <Metric label="Verified" value={verified} color={S.pass} />
              <Metric label="Rejected" value={rejected} color={rejected > 0 ? S.fail : 'rgba(255,255,255,0.2)'} />
              <Metric label="Executed" value={executed} color={S.pass} />
              <Metric label="Attested" value={attested} color={S.pass} />
              <Metric
                label="Mode"
                value={run.uniswap_mode === 'live' ? 'LIVE' : 'SIM'}
                color={run.uniswap_mode === 'live' ? S.pass : S.skip}
                sub={`chain ${run.uniswap_chain_id}`}
              />
            </Box>

            {/* ── Body ───────────────────────────────── */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              {/* Left: portfolio */}
              <Box sx={{ flex: '0 0 300px' }}>
                <Portfolio run={run} />
              </Box>

              {/* Right: trades */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {trades.length === 0 ? (
                  <Box sx={{
                    ...S.glass, borderRadius: '16px', p: 4, textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <Typography sx={{ fontFamily: S.sans, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                      No trades in this run
                    </Typography>
                  </Box>
                ) : (
                  trades.map((trade, i) => (
                    <TradePanel key={i} trade={trade} defaultOpen={i === 0} />
                  ))
                )}

                {/* Scroll indicator */}
                {trades.length > 2 && (
                  <Box sx={{
                    textAlign: 'center', py: 2,
                    animation: 'bob 2s ease-in-out infinite',
                    '@keyframes bob': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(4px)' } },
                  }}>
                    <Typography sx={{ fontFamily: S.mono, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
                      SCROLL FOR MORE
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.15)', fontSize: 16, lineHeight: 1, mt: 0.3 }}>
                      &#9662;
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* ── Timestamp ──────────────────────────── */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Typography sx={{ fontFamily: S.mono, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                {new Date(run.run_timestamp).toLocaleString()}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}

export default App
