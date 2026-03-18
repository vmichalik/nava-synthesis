import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { colors, font, status } from './tokens';

const StatCard: React.FC<{ label: string; value: string; color: string; delay: number }> = ({ label, value, color, delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      opacity,
      flex: 1,
      padding: '16px 14px',
      background: 'linear-gradient(180deg, rgba(169,169,169,0.12) 0%, rgba(41,41,41,0.12) 100%)',
      borderRadius: 12,
      textAlign: 'center' as const,
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 24, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
};

const TradeRow: React.FC<{ decision: string; label: string; detail: string; delay: number }> = ({ decision, label, detail, delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateRight: 'clamp' });
  const col = decision === 'PASS' ? status.approved : status.rejected;
  return (
    <div style={{
      opacity,
      padding: '10px 14px',
      background: 'linear-gradient(180deg, rgba(169,169,169,0.08) 0%, rgba(41,41,41,0.08) 100%)',
      borderRadius: 10,
      border: `1px solid ${col}15`,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0,
      }} />
      <div style={{
        color: col, fontSize: 10, fontWeight: 700, fontFamily: font.mono,
        letterSpacing: '0.05em', padding: '2px 8px',
        border: `1px solid ${col}30`, borderRadius: 999, flexShrink: 0,
      }}>
        {decision}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: colors.white, fontSize: 12, fontWeight: 700 }}>{label}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: font.mono }}>{detail}</div>
      </div>
    </div>
  );
};

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(to bottom, #000000 60%, rgba(254,6,0,0.03) 100%)',
      fontFamily: font.primary,
      padding: 50,
    }}>
      <div style={{ opacity: headerOpacity, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ color: colors.red, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', fontFamily: font.mono, textTransform: 'uppercase' as const }}>
            NAVA
          </div>
          <div style={{ color: colors.white, fontSize: 22, fontWeight: 700 }}>
            Arbiter Guard
          </div>
        </div>
        <div style={{
          padding: '8px 14px',
          background: 'linear-gradient(180deg, rgba(169,169,169,0.08) 0%, rgba(41,41,41,0.08) 100%)',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.04)',
          fontSize: 12, color: 'rgba(255,255,255,0.5)',
        }}>
          <span style={{ fontFamily: font.mono, fontSize: 10, color: 'rgba(255,255,255,0.3)', marginRight: 8 }}>STRATEGY</span>
          Maintain 60% WETH / 40% USDC. Rebalance when drift exceeds 5%.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <StatCard label="Verified" value="2" color={status.approved} delay={10} />
        <StatCard label="Rejected" value="4" color={status.rejected} delay={18} />
        <StatCard label="Executed" value="1" color={status.approved} delay={26} />
        <StatCard label="Attested" value="6" color={status.approved} delay={34} />
        <StatCard label="Mode" value="LIVE" color={status.approved} delay={42} />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Portfolio */}
        <div style={{
          opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' }),
          width: 260,
          padding: 16,
          background: 'linear-gradient(180deg, rgba(169,169,169,0.1) 0%, rgba(41,41,41,0.1) 100%)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 10 }}>
            PORTFOLIO
          </div>
          <div style={{ color: colors.white, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>$1,766</div>
          <div style={{ color: status.pending, fontSize: 10, fontFamily: font.mono, marginBottom: 14 }}>
            USDC overweight -- rebalance needed
          </div>
          {[
            { token: 'WETH', pct: 48.6, target: 60 },
            { token: 'USDC', pct: 51.4, target: 40 },
          ].map((t, i) => (
            <div key={t.token} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: colors.white, fontSize: 12, fontWeight: 700 }}>{t.token}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: font.mono }}>{t.pct}%</span>
              </div>
              <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                <div style={{
                  height: '100%',
                  width: `${interpolate(frame, [40 + i * 10, 60 + i * 10], [0, t.pct], { extrapolateRight: 'clamp' })}%`,
                  background: Math.abs(t.pct - t.target) > 5 ? status.pending : status.approved,
                  borderRadius: 3,
                }} />
                <div style={{
                  position: 'absolute', left: `${t.target}%`, top: -2, height: 9, width: 2,
                  background: 'rgba(255,255,255,0.5)', borderRadius: 1,
                }} />
              </div>
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, fontFamily: font.mono, textAlign: 'right' as const, marginTop: 2 }}>
                target {t.target}%
              </div>
            </div>
          ))}

          <div style={{
            opacity: interpolate(frame, [80, 95], [0, 1], { extrapolateRight: 'clamp' }),
            marginTop: 10, padding: '8px 10px',
            background: 'rgba(52,211,153,0.06)',
            border: '1px solid rgba(52,211,153,0.12)',
            borderRadius: 8,
          }}>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 4 }}>
              ON-CHAIN
            </div>
            <div style={{ color: status.approved, fontSize: 12, fontWeight: 700 }}>46 attestations</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: font.mono }}>39% pass rate</div>
          </div>
        </div>

        {/* Trades */}
        <div style={{ flex: 1 }}>
          <TradeRow decision="PASS" label="25 USDC -> WETH" detail="Executed on Sepolia | TX: 0xaf9cb6...523646" delay={50} />
          <TradeRow decision="REJECT" label="Sanctioned recipient" detail="sanctions_screening: OFAC deny list" delay={70} />
          <TradeRow decision="REJECT" label="Intent mismatch" detail="amount_matching: intent does not match tx" delay={90} />
          <TradeRow decision="REJECT" label="Unknown router" detail="protocol_compatibility: not a Uniswap contract" delay={110} />

          <div style={{
            opacity: interpolate(frame, [140, 160], [0, 1], { extrapolateRight: 'clamp' }),
            marginTop: 12, padding: '10px 14px',
            background: 'rgba(52,211,153,0.05)',
            border: '1px solid rgba(52,211,153,0.12)',
            borderRadius: 10, fontSize: 11, fontFamily: font.mono,
          }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>Swap: </span>
              <span style={{ color: status.approved }}>0xaf9cb6...523646</span>
              <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 8 }}>Block 10470537</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>Attestation: </span>
              <span style={{ color: status.approved }}>0x883b92...39d982</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
