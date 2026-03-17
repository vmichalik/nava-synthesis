import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { colors, font, status } from './tokens';

const StatCard: React.FC<{ label: string; value: string; color: string; delay: number }> = ({ label, value, color, delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [delay, delay + 12], [0.95, 1], { extrapolateRight: 'clamp' });
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
  const opacity = interpolate(frame, [delay, delay + 6], [0, 1], { extrapolateRight: 'clamp' });
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
  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(to bottom, #000000 60%, rgba(254,6,0,0.03) 100%)',
      fontFamily: font.primary,
      padding: 50,
    }}>
      {/* Header */}
      <div style={{ opacity: headerOpacity, marginBottom: 24 }}>
        <div style={{ color: colors.red, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', fontFamily: font.mono, textTransform: 'uppercase' as const }}>
          NAVA
        </div>
        <div style={{ color: colors.white, fontSize: 28, fontWeight: 700, marginTop: 4 }}>
          Arbiter Guard Dashboard
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Value" value="$4,000" color={colors.white} delay={10} />
        <StatCard label="Verified" value="1" color={status.approved} delay={15} />
        <StatCard label="Rejected" value="0" color={status.rejected} delay={20} />
        <StatCard label="Executed" value="1" color={status.approved} delay={25} />
        <StatCard label="Mode" value="SIM" color={status.info} delay={30} />
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Portfolio card */}
        <div style={{
          opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' }),
          width: 280,
          padding: 20,
          background: 'linear-gradient(180deg, rgba(169,169,169,0.12) 0%, rgba(41,41,41,0.12) 100%)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 16 }}>
            PORTFOLIO
          </div>
          <div style={{ color: colors.white, fontSize: 24, fontWeight: 700, marginBottom: 20 }}>$4,000</div>

          {/* WETH bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: colors.white, fontSize: 13, fontWeight: 700 }}>WETH</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>87.5%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
              <div style={{
                height: '100%',
                width: `${interpolate(frame, [35, 50], [0, 87.5], { extrapolateRight: 'clamp' })}%`,
                background: status.pending,
                borderRadius: 3,
              }} />
            </div>
          </div>

          {/* USDC bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: colors.white, fontSize: 13, fontWeight: 700 }}>USDC</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>12.5%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
              <div style={{
                height: '100%',
                width: `${interpolate(frame, [35, 50], [0, 12.5], { extrapolateRight: 'clamp' })}%`,
                background: colors.red,
                borderRadius: 3,
              }} />
            </div>
          </div>
        </div>

        {/* Trade detail card */}
        <div style={{
          opacity: interpolate(frame, [30, 45], [0, 1], { extrapolateRight: 'clamp' }),
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
              0.314286 WETH -&gt; USDC
            </span>
            <span style={{
              marginLeft: 'auto',
              color: status.info,
              fontSize: 10,
              padding: '3px 10px',
              border: `1px solid ${status.info}40`,
              borderRadius: 999,
              fontFamily: font.mono,
            }}>SIMULATED</span>
          </div>

          {/* Node breakdown */}
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 8 }}>
            VERIFICATION NODES
          </div>
          <NodeRow name="sanctions_screening" st="PASS" delay={45} />
          <NodeRow name="mev_risky_parameters" st="PASS" delay={48} />
          <NodeRow name="format_validation" st="PASS" delay={51} />
          <NodeRow name="protocol_compatibility" st="PASS" delay={54} />
          <NodeRow name="slippage_tolerance" st="PASS" delay={57} />
          <NodeRow name="intent_manipulation" st="SKIP" delay={60} />
          <NodeRow name="element_matching" st="SKIP" delay={63} />
          <NodeRow name="token_matching" st="SKIP" delay={66} />

          {/* Tx hash */}
          <div style={{
            opacity: interpolate(frame, [70, 80], [0, 1], { extrapolateRight: 'clamp' }),
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(52,211,153,0.06)',
            border: `1px solid rgba(52,211,153,0.15)`,
            borderRadius: 8,
            fontSize: 11,
            fontFamily: font.mono,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>TxHash: </span>
            <span style={{ color: status.approved }}>0x1046...7b4b07c05bb89</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
