import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { colors, font, status } from './tokens';

/**
 * Architecture scene matching the README diagram:
 *
 *   Agent decides to trade
 *           |
 *     Arbiter (18 checks)
 *           |
 *      PASS / FAIL
 *       |        |
 *    Execute   Retry
 *       |
 *    Attest on-chain
 *       |
 *    Queryable history
 */
export const ArchScene: React.FC = () => {
  const frame = useCurrentFrame();

  const header = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });

  // Flow steps appear sequentially
  const step1 = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });
  const step2 = interpolate(frame, [45, 65], [0, 1], { extrapolateRight: 'clamp' });
  const step3 = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: 'clamp' });
  const stepPass = interpolate(frame, [95, 115], [0, 1], { extrapolateRight: 'clamp' });
  const stepFail = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: 'clamp' });
  const step4 = interpolate(frame, [125, 145], [0, 1], { extrapolateRight: 'clamp' });
  const step5 = interpolate(frame, [150, 170], [0, 1], { extrapolateRight: 'clamp' });
  const step6 = interpolate(frame, [180, 200], [0, 1], { extrapolateRight: 'clamp' });
  const checks = interpolate(frame, [210, 260], [0, 1], { extrapolateRight: 'clamp' });

  const boxStyle = (opacity: number, borderColor: string) => ({
    opacity,
    transform: `translateY(${interpolate(opacity, [0, 1], [8, 0])}px)`,
    padding: '14px 24px',
    border: `1px solid ${borderColor}`,
    borderRadius: 10,
    textAlign: 'center' as const,
    background: 'rgba(255,255,255,0.03)',
  });

  const lineStyle = (opacity: number) => ({
    opacity,
    width: 2,
    height: 24,
    background: 'rgba(255,255,255,0.15)',
    margin: '0 auto',
  });

  return (
    <AbsoluteFill style={{
      background: colors.black,
      fontFamily: font.primary,
      display: 'flex',
      flexDirection: 'row',
      padding: '50px 60px',
      gap: 60,
    }}>
      {/* Left: flow diagram */}
      <div style={{ flex: '0 0 420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ opacity: header, marginBottom: 30 }}>
          <div style={{ color: colors.red, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 8 }}>
            HOW IT WORKS
          </div>
        </div>

        {/* Agent decides */}
        <div style={boxStyle(step1, 'rgba(255,255,255,0.15)')}>
          <div style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>Agent decides to trade</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono, marginTop: 4 }}>portfolio drift detected</div>
        </div>
        <div style={lineStyle(step2)} />

        {/* Arbiter */}
        <div style={boxStyle(step2, colors.red + '66')}>
          <div style={{ color: colors.red, fontSize: 14, fontWeight: 700 }}>Arbiter verification</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono, marginTop: 4 }}>18 independent safety checks</div>
        </div>
        <div style={lineStyle(step3)} />

        {/* PASS / FAIL branch */}
        <div style={{ opacity: step3, display: 'flex', gap: 40, alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ ...boxStyle(stepPass, status.approved + '66'), minWidth: 140 }}>
              <div style={{ color: status.approved, fontSize: 14, fontWeight: 700 }}>PASS</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono, marginTop: 4 }}>execute swap</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ ...boxStyle(stepFail, status.rejected + '44'), minWidth: 140 }}>
              <div style={{ color: status.rejected, fontSize: 14, fontWeight: 700 }}>FAIL</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono, marginTop: 4 }}>adjust & retry</div>
            </div>
          </div>
        </div>

        <div style={{ ...lineStyle(step4), marginLeft: -70 }} />

        {/* Attest */}
        <div style={{ ...boxStyle(step4, status.approved + '44'), marginLeft: -70 }}>
          <div style={{ color: status.approved, fontSize: 14, fontWeight: 700 }}>Record attestation on-chain</div>
        </div>
        <div style={{ ...lineStyle(step5), marginLeft: -70 }} />

        {/* Queryable */}
        <div style={{ ...boxStyle(step5, status.info + '44'), marginLeft: -70 }}>
          <div style={{ color: status.info, fontSize: 13 }}>Anyone can query this agent's history</div>
        </div>
      </div>

      {/* Right: what gets checked */}
      <div style={{ flex: 1, paddingTop: 30 }}>
        <div style={{
          opacity: step6,
          color: colors.red,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          fontFamily: font.mono,
          textTransform: 'uppercase' as const,
          marginBottom: 20,
        }}>
          WHAT THE ARBITER CHECKS
        </div>

        {[
          { title: 'Does the trade match the intent?', detail: 'token pairs, amounts, slippage, deadlines', color: colors.white },
          { title: 'Is the transaction well-formed?', detail: 'format validation, protocol compatibility', color: colors.taupe },
          { title: 'Is someone trying to exploit it?', detail: 'MEV risk, manipulation, tampering', color: status.pending },
          { title: 'Is it legal?', detail: 'sanctions screening, token legitimacy', color: status.info },
        ].map((item, i) => (
          <div key={i} style={{
            opacity: interpolate(checks, [i * 0.2, i * 0.2 + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            marginBottom: 18,
            display: 'flex',
            gap: 12,
            alignItems: 'baseline',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: item.color, flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ color: colors.white, fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{item.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: font.mono }}>{item.detail}</div>
            </div>
          </div>
        ))}

        <div style={{
          opacity: interpolate(frame, [260, 280], [0, 1], { extrapolateRight: 'clamp' }),
          marginTop: 30,
          padding: '14px 18px',
          background: 'rgba(254,6,0,0.05)',
          border: '1px solid rgba(254,6,0,0.2)',
          borderRadius: 10,
        }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            One critical failure stops everything.
            <br />
            The trade never reaches Uniswap.
          </div>
        </div>

        <div style={{
          opacity: interpolate(frame, [270, 290], [0, 1], { extrapolateRight: 'clamp' }),
          marginTop: 16,
          color: 'rgba(255,255,255,0.3)',
          fontSize: 12,
          fontFamily: font.mono,
        }}>
          LLM reasoning runs through Venice for private inference.
          <br />
          Only the pass/fail result goes on-chain.
        </div>
      </div>
    </AbsoluteFill>
  );
};
