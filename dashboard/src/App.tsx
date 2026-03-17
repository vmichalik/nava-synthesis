import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { colors } from '@navalabs-dev/brand-mui'
import type { AuditRun, TradeRecord } from './types'

const API_BASE = 'http://localhost:8001'

// Status colors from brand palette
const statusColor = {
  PASS: '#34D399',
  FAIL: '#FE0600',
  SKIP: '#94A3B8',
  PENDING: '#F5A623',
}

function StatusChip({ status }: { status: string }) {
  const color = status === 'PASS' ? 'success'
    : status === 'REJECT' || status === 'FAIL' ? 'error'
    : status === 'SKIP' ? 'info'
    : 'warning'
  return <Chip label={status} color={color} size="small" variant="outlined" />
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card sx={{ flex: 1, minWidth: 140 }}>
      <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="overline" sx={{ mb: 1, display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="h3" sx={{ color: color || colors.white }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

function PortfolioCard({ run }: { run: AuditRun }) {
  const { portfolio } = run
  return (
    <Card>
      <CardContent>
        <Typography variant="overline" sx={{ mb: 2, display: 'block' }}>
          Portfolio
        </Typography>
        <Typography variant="h4" sx={{ mb: 2 }}>
          ${portfolio.total_value_usd.toLocaleString()}
        </Typography>
        {Object.entries(portfolio.balances).map(([token, balance]) => {
          const alloc = portfolio.allocation[token] || 0
          const price = portfolio.prices[token] || 0
          return (
            <Box key={token} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {token}
                </Typography>
                <Typography variant="body2">
                  {balance.toFixed(token === 'USDC' ? 2 : 6)} (${(balance * price).toLocaleString()})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={alloc * 100}
                  sx={{ flex: 1, height: 6 }}
                  color={alloc > 0.6 ? 'warning' : 'primary'}
                />
                <Typography variant="caption" sx={{ minWidth: 40 }}>
                  {(alloc * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          )
        })}
      </CardContent>
    </Card>
  )
}

function NodeTable({ trade }: { trade: TradeRecord }) {
  const { verification } = trade
  const allNodes = [
    ...verification.passed_nodes.map(n => ({ name: n, status: 'PASS' })),
    ...verification.failed_nodes.map(n => ({ name: n, status: 'FAIL' })),
    ...verification.skipped_nodes.map(n => ({ name: n, status: 'SKIP' })),
  ].sort((a, b) => {
    const order = { FAIL: 0, PASS: 1, SKIP: 2 }
    return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3)
  })

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Verification Node</TableCell>
            <TableCell align="right">Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {allNodes.map((node) => (
            <TableRow key={node.name}>
              <TableCell>
                <Typography variant="caption">{node.name}</Typography>
              </TableCell>
              <TableCell align="right">
                <StatusChip status={node.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function TradeCard({ trade }: { trade: TradeRecord }) {
  const { verification, execution } = trade
  const decision = verification?.decision || 'ERROR'

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.4)' }} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
          <StatusChip status={decision} />
          <Typography variant="body1" sx={{ flex: 1 }}>
            {trade.amount_in?.toFixed(6)} {trade.token_in} {'->'} {trade.token_out}
          </Typography>
          {execution?.success && (
            <Chip
              label={execution.mode === 'live' ? 'EXECUTED' : 'SIMULATED'}
              color={execution.mode === 'live' ? 'success' : 'info'}
              size="small"
              variant="outlined"
            />
          )}
          <Typography variant="caption">
            Attempt {trade.attempt}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Intent */}
          <Box>
            <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
              Intent
            </Typography>
            <Typography variant="body2">{trade.intent}</Typography>
          </Box>

          {/* Verification summary */}
          <Box>
            <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
              Verification
            </Typography>
            <Typography variant="body2">
              {verification.reason}
            </Typography>
            {(verification.explanation?.recommendations?.length ?? 0) > 0 && (
              <Alert severity="info" sx={{ mt: 1 }}>
                {verification.explanation!.recommendations.join(' ')}
              </Alert>
            )}
          </Box>

          {/* Node breakdown */}
          <NodeTable trade={trade} />

          {/* Execution */}
          {execution && (
            <Box>
              <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
                Execution ({execution.mode})
              </Typography>
              {execution.tx_hash && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                    TxHash: {execution.tx_hash}
                  </Typography>
                  {execution.explorer_url && (
                    <Typography variant="caption">
                      <a
                        href={execution.explorer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: statusColor.PASS }}
                      >
                        View on Explorer
                      </a>
                    </Typography>
                  )}
                  {execution.block_number && (
                    <Typography variant="caption">
                      Block: {execution.block_number}
                    </Typography>
                  )}
                  {execution.gas_used && (
                    <Typography variant="caption">
                      Gas: {execution.gas_used.toLocaleString()}
                    </Typography>
                  )}
                </Box>
              )}
              {execution.error && (
                <Alert severity="error" sx={{ mt: 1 }}>{execution.error}</Alert>
              )}
            </Box>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}

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

  // Compute stats
  const trades = run?.trades || []
  const verified = trades.filter(t => t.verification?.decision === 'PASS').length
  const rejected = trades.filter(t => t.verification?.decision === 'REJECT').length
  const executed = trades.filter(t => t.execution?.success).length

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #000000 60%, rgba(254, 6, 0, 0.03) 100%)',
    }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="overline" sx={{ color: colors.red, display: 'block', mb: 1 }}>
            Nava
          </Typography>
          <Typography variant="h2" sx={{ mb: 1 }}>
            Arbiter Guard
          </Typography>
          <Typography variant="body2">
            Verified autonomous trading on Uniswap
          </Typography>
        </Box>

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={triggerRun}
            disabled={loading || !apiOnline}
          >
            {loading ? 'Running...' : 'Run Rebalance'}
          </Button>
          <Chip
            label={apiOnline ? 'API Online' : 'API Offline'}
            color={apiOnline ? 'success' : 'error'}
            size="small"
            variant="outlined"
          />
          {run && (
            <Typography variant="caption" sx={{ ml: 'auto' }}>
              Last run: {new Date(run.run_timestamp).toLocaleString()}
            </Typography>
          )}
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!apiOnline && !run && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Dashboard API is offline. Start it with: <code>python -m agent.api</code>
          </Alert>
        )}

        {run && (
          <>
            {/* Stats row */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <StatCard label="Total Value" value={`$${run.portfolio.total_value_usd.toLocaleString()}`} />
              <StatCard label="Verified" value={verified} color={statusColor.PASS} />
              <StatCard label="Rejected" value={rejected} color={statusColor.FAIL} />
              <StatCard label="Executed" value={executed} color={statusColor.PASS} />
              <StatCard
                label="Mode"
                value={run.uniswap_mode || 'simulation'}
                color={run.uniswap_mode === 'live' ? statusColor.PASS : statusColor.SKIP}
              />
            </Box>

            {/* Portfolio + Trades */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {/* Portfolio */}
              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <PortfolioCard run={run} />
              </Box>

              {/* Trades */}
              <Box sx={{ flex: '2 1 500px', minWidth: 300 }}>
                <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                  Trades ({trades.length})
                </Typography>
                {trades.length === 0 ? (
                  <Alert severity="info">No trades in this run.</Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {trades.map((trade, i) => (
                      <TradeCard key={i} trade={trade} />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          </>
        )}

        {/* Footer */}
        <Box sx={{ mt: 6, pt: 3, borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
            Powered by Nava's Arbiter verification engine | navalabs.ai
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default App
