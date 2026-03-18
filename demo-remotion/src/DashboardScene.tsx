import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { colors, font, status } from './tokens';

const StatCard: React.FC<{ label: string; value: string; color: string; delay: number }> = ({ label, value, color, delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [delay, delay + 15], [0.95, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      opacity,
      transform: `scale(${scale})`,
      flex: 1,
      padding: '20px 16px',
      background: 'linear-gradient(180deg, rgba(169,169,169,0.12) 0%, rgba(41,41,41,0.12) 100%)',
      borderRadius: 12,
      textAlign: 'center' as const,
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 28, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
};

const NodeRow: React.FC<{ name: string; st: string; delay: number }> = ({ name, st, delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateRight: 'clamp' });
  const col = st === 'PASS' ? status.approved : st === 'FAIL' ? status.rejected : status.info;
  return (
    <div style={{
      opacity,
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      fontSize: 11,
      fontFamily: font.mono,
    }}>
      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{name}</span>
      <span style={{
        color: col,
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 8px',
        border: `1px solid ${col}40`,
        borderRadius: 999,
        letterSpacing: '0.05em',
      }}>{st}</span>
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
      <div style={{ opacity: headerOpacity, marginBottom: 24 }}>
        <div style={{ color: colors.red, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', fontFamily: font.mono, textTransform: 'uppercase' as const }}>
          NAVA
        </div>
        <div style={{ color: colors.white, fontSize: 28, fontWeight: 700, marginTop: 4 }}>
          Arbiter Guard Dashboard
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <StatCard label="Portfolio" value="$1,522" color={colors.white} delay={15} />
        <StatCard label="Verified" value="1" color={status.approved} delay={25} />
        <StatCard label="Executed" value="1" color={status.approved} delay={35} />
        <StatCard label="Attested" value="1" color={status.approved} delay={45} />
        <StatCard label="Mode" value="LIVE" color={status.approved} delay={55} />
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{
          opacity: interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' }),
          width: 280,
          padding: 20,
          background: 'linear-gradient(180deg, rgba(169,169,169,0.12) 0%, rgba(41,41,41,0.12) 100%)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 16 }}>
            PORTFOLIO
          </div>
          <div style={{ color: colors.white, fontSize: 24, fontWeight: 700, marginBottom: 20 }}>$1,522</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: colors.white, fontSize: 13, fontWeight: 700 }}>WETH</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>67.3%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
              <div style={{
                height: '100%',
                width: `${interpolate(frame, [50, 70], [0, 67.3], { extrapolateRight: 'clamp' })}%`,
                background: status.pending,
                borderRadius: 3,
              }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: colors.white, fontSize: 13, fontWeight: 700 }}>USDC</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>32.7%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
              <div style={{
                height: '100%',
                width: `${interpolate(frame, [50, 70], [0, 32.7], { extrapolateRight: 'clamp' })}%`,
                background: colors.red,
                borderRadius: 3,
              }} />
            </div>
          </div>

          {/* On-chain reputation */}
          <div style={{
            opacity: interpolate(frame, [80, 95], [0, 1], { extrapolateRight: 'clamp' }),
            marginTop: 20,
            padding: '10px 12px',
            background: 'rgba(52,211,153,0.06)',
            border: `1px solid rgba(52,211,153,0.15)`,
            borderRadius: 8,
          }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 6 }}>
              ON-CHAIN REPUTATION
            </div>
            <div style={{ color: status.approved, fontSize: 13, fontWeight: 700 }}>
              12 attestations
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono }}>
              queryable by any contract
            </div>
          </div>
        </div>

        <div style={{
          opacity: interpolate(frame, [45, 65], [0, 1], { extrapolateRight: 'clamp' }),
          flex: 1,
          padding: 20,
          background: 'linear-gradient(180deg, rgba(169,169,169,0.12) 0%, rgba(41,41,41,0.12) 100%)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{
              color: status.approved,
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 10px',
              border: `1px solid ${status.approved}40`,
              borderRadius: 999,
              letterSpacing: '0.05em',
              fontFamily: font.mono,
            }}>PASS</span>
            <span style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>
              0.0447 WETH -&gt; 246.13 USDC
            </span>
            <span style={{
              marginLeft: 'auto',
              color: status.approved,
              fontSize: 10,
              padding: '3px 10px',
              border: `1px solid ${status.approved}40`,
              borderRadius: 999,
              fontFamily: font.mono,
            }}>EXECUTED + ATTESTED</span>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 8 }}>
            VERIFICATION NODES (14 PASS)
          </div>
          <NodeRow name="sanctions_screening" st="PASS" delay={70} />
          <NodeRow name="mev_risky_parameters" st="PASS" delay={78} />
          <NodeRow name="format_validation" st="PASS" delay={86} />
          <NodeRow name="protocol_compatibility" st="PASS" delay={94} />
          <NodeRow name="slippage_tolerance" st="PASS" delay={102} />
          <NodeRow name="intent_manipulation" st="PASS" delay={110} />
          <NodeRow name="consistency_analysis" st="PASS" delay={118} />
          <NodeRow name="element_matching" st="PASS" delay={126} />

          <div style={{
            opacity: interpolate(frame, [140, 155], [0, 1], { extrapolateRight: 'clamp' }),
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(52,211,153,0.06)',
            border: `1px solid rgba(52,211,153,0.15)`,
            borderRadius: 8,
            fontSize: 11,
            fontFamily: font.mono,
          }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Swap TX: </span>
              <span style={{ color: status.approved }}>0x5fe65c...cd9036</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 12 }}>Block 10469642</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Attestation: </span>
              <span style={{ color: status.approved }}>0x065965...e25d6</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
