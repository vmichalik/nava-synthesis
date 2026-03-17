import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { colors, font, status } from './tokens';

const Box: React.FC<{
  label: string;
  sublabel: string;
  color: string;
  opacity: number;
  x: number;
  y: number;
  width?: number;
}> = ({ label, sublabel, color, opacity, x, y, width = 200 }) => (
  <div style={{
    position: 'absolute',
    left: x,
    top: y,
    opacity,
    transform: `translateY(${interpolate(opacity, [0, 1], [10, 0])}px)`,
    width,
    padding: '20px 16px',
    background: 'linear-gradient(180deg, rgba(169,169,169,0.15) 0%, rgba(41,41,41,0.15) 100%)',
    border: `1px solid ${color}33`,
    borderRadius: 12,
    textAlign: 'center' as const,
  }}>
    <div style={{ color, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 8 }}>
      {label}
    </div>
    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
      {sublabel}
    </div>
  </div>
);

const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; opacity: number; color?: string }> = ({ x1, y1, x2, y2, opacity, color = 'rgba(255,255,255,0.2)' }) => (
  <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity, pointerEvents: 'none' }}>
    <defs>
      <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill={color} />
      </marker>
    </defs>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" markerEnd="url(#arrowhead)" />
  </svg>
);

export const ArchScene: React.FC = () => {
  const frame = useCurrentFrame();

  const header = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const box1 = interpolate(frame, [25, 50], [0, 1], { extrapolateRight: 'clamp' });
  const arrow1 = interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' });
  const box2 = interpolate(frame, [60, 85], [0, 1], { extrapolateRight: 'clamp' });
  const arrow2 = interpolate(frame, [85, 100], [0, 1], { extrapolateRight: 'clamp' });
  const box3 = interpolate(frame, [95, 120], [0, 1], { extrapolateRight: 'clamp' });
  const box4 = interpolate(frame, [120, 145], [0, 1], { extrapolateRight: 'clamp' });
  const arrow3 = interpolate(frame, [130, 145], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: colors.black,
      fontFamily: font.primary,
    }}>
      <div style={{ opacity: header, textAlign: 'center' as const, paddingTop: 60 }}>
        <div style={{ color: colors.red, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 12 }}>
          ARCHITECTURE
        </div>
        <div style={{ color: colors.white, fontSize: 32, fontWeight: 700 }}>
          How Arbiter Guard works
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Box label="Trading Agent" sublabel="Python | Strategy + retry logic" color={colors.white} opacity={box1} x={120} y={200} width={220} />
        <Arrow x1={340} y1={245} x2={440} y2={245} opacity={arrow1} color={colors.red} />
        <Box label="Arbiter" sublabel="18-node verification graph" color={colors.red} opacity={box2} x={450} y={200} width={220} />
        <Arrow x1={670} y1={245} x2={770} y2={245} opacity={arrow2} color={status.approved} />
        <Box label="Uniswap V3" sublabel="SwapRouter on Sepolia" color={status.approved} opacity={box3} x={780} y={200} width={220} />

        <Arrow x1={230} y1={290} x2={230} y2={360} opacity={arrow3} color="rgba(255,255,255,0.2)" />
        <Box label="Dashboard" sublabel="React + Nava brand theme" color={status.info} opacity={box4} x={120} y={370} width={220} />

        <div style={{
          position: 'absolute',
          right: 80,
          bottom: 80,
          opacity: box4,
          maxWidth: 360,
        }}>
          <div style={{ color: colors.red, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 16 }}>
            ARBITER VERIFICATION NODES
          </div>
          {[
            { cat: 'Intent Alignment', nodes: 'token, amount, slippage, deadline, fee', color: colors.white },
            { cat: 'Technical Invariants', nodes: 'format, protocol compatibility', color: colors.taupe },
            { cat: 'Adversarial Detection', nodes: 'MEV risk, manipulation, consistency', color: status.pending },
            { cat: 'Legal Compliance', nodes: 'sanctions, token legitimacy', color: status.info },
          ].map((item, i) => (
            <div key={i} style={{
              opacity: interpolate(frame, [140 + i * 15, 160 + i * 15], [0, 1], { extrapolateRight: 'clamp' }),
              marginBottom: 12,
              display: 'flex',
              gap: 8,
              alignItems: 'baseline',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: item.color, flexShrink: 0, marginTop: 4 }} />
              <div>
                <div style={{ color: colors.white, fontSize: 13, fontWeight: 700 }}>{item.cat}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono }}>{item.nodes}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
