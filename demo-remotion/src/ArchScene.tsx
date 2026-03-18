import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { colors, font, status } from './tokens';

export const ArchScene: React.FC = () => {
  const frame = useCurrentFrame();

  const header = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });

  // "Built at hackathon" column
  const builtLabel = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });
  const item1 = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' });
  const item2 = interpolate(frame, [55, 75], [0, 1], { extrapolateRight: 'clamp' });
  const item3 = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: 'clamp' });
  const item4 = interpolate(frame, [85, 105], [0, 1], { extrapolateRight: 'clamp' });
  const item5 = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: 'clamp' });

  // "Powered by" column
  const poweredLabel = interpolate(frame, [130, 150], [0, 1], { extrapolateRight: 'clamp' });
  const arbiter1 = interpolate(frame, [150, 170], [0, 1], { extrapolateRight: 'clamp' });
  const arbiter2 = interpolate(frame, [165, 185], [0, 1], { extrapolateRight: 'clamp' });
  const arbiter3 = interpolate(frame, [180, 200], [0, 1], { extrapolateRight: 'clamp' });

  // Flow
  const flow = interpolate(frame, [210, 240], [0, 1], { extrapolateRight: 'clamp' });
  const flowNote = interpolate(frame, [250, 275], [0, 1], { extrapolateRight: 'clamp' });

  const itemStyle = (opacity: number, color: string) => ({
    opacity,
    transform: `translateY(${interpolate(opacity, [0, 1], [6, 0])}px)`,
    display: 'flex' as const,
    gap: 10,
    alignItems: 'center' as const,
    marginBottom: 10,
  });

  const dotStyle = (color: string) => ({
    width: 6, height: 6, borderRadius: 3, background: color, flexShrink: 0 as const,
  });

  return (
    <AbsoluteFill style={{
      background: colors.black,
      fontFamily: font.primary,
      padding: '50px 60px',
    }}>
      <div style={{ opacity: header, marginBottom: 30 }}>
        <div style={{ color: colors.red, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', fontFamily: font.mono, textTransform: 'uppercase' as const, marginBottom: 8 }}>
          WHAT WE BUILT
        </div>
        <div style={{ color: colors.white, fontSize: 28, fontWeight: 700 }}>
          Hackathon work vs. Nava infrastructure
        </div>
      </div>

      <div style={{ display: 'flex', gap: 40 }}>
        {/* Left: built at hackathon */}
        <div style={{ flex: 1 }}>
          <div style={{
            opacity: builtLabel,
            padding: '8px 14px',
            background: `${status.approved}10`,
            border: `1px solid ${status.approved}25`,
            borderRadius: 8,
            fontFamily: font.mono,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: status.approved,
            marginBottom: 16,
          }}>
            BUILT FOR THE SYNTHESIS
          </div>

          <div style={itemStyle(item1, status.approved)}>
            <div style={dotStyle(status.approved)} />
            <div>
              <div style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>Trading agent</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono }}>Python, autonomous rebalancing loop</div>
            </div>
          </div>

          <div style={itemStyle(item2, status.approved)}>
            <div style={dotStyle(status.approved)} />
            <div>
              <div style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>Uniswap V3 execution</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono }}>Real swaps on Sepolia via web3.py</div>
            </div>
          </div>

          <div style={itemStyle(item3, status.approved)}>
            <div style={dotStyle(status.approved)} />
            <div>
              <div style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>Attestation contract</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono }}>On-chain receipts, ERC-8004 pattern</div>
            </div>
          </div>

          <div style={itemStyle(item4, status.approved)}>
            <div style={dotStyle(status.approved)} />
            <div>
              <div style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>Dashboard</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono }}>React UI with live balances, adversarial tests</div>
            </div>
          </div>

          <div style={itemStyle(item5, status.approved)}>
            <div style={dotStyle(status.approved)} />
            <div>
              <div style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>ERC-8004 identity + manifest</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono }}>Registered on Base Mainnet</div>
            </div>
          </div>
        </div>

        {/* Right: powered by Nava */}
        <div style={{ flex: 1 }}>
          <div style={{
            opacity: poweredLabel,
            padding: '8px 14px',
            background: `${colors.red}10`,
            border: `1px solid ${colors.red}25`,
            borderRadius: 8,
            fontFamily: font.mono,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: colors.red,
            marginBottom: 16,
          }}>
            POWERED BY NAVA ARBITER
          </div>

          <div style={itemStyle(arbiter1, colors.red)}>
            <div style={dotStyle(colors.red)} />
            <div>
              <div style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>18-node validation graph</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono }}>Intent, adversarial, compliance, technical checks</div>
            </div>
          </div>

          <div style={itemStyle(arbiter2, colors.red)}>
            <div style={dotStyle(colors.red)} />
            <div>
              <div style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>LLM semantic reasoning</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono }}>Venice or OpenAI, private inference supported</div>
            </div>
          </div>

          <div style={itemStyle(arbiter3, colors.red)}>
            <div style={dotStyle(colors.red)} />
            <div>
              <div style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>Protocol manifests</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: font.mono }}>Uniswap, Compound, CoW protocol support</div>
            </div>
          </div>

          <div style={{
            opacity: arbiter3,
            marginTop: 16,
            padding: '10px 14px',
            background: 'rgba(254,6,0,0.05)',
            border: '1px solid rgba(254,6,0,0.15)',
            borderRadius: 8,
          }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              The Nava Arbiter is a developer product coming soon.
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: font.mono, marginTop: 4 }}>
              We didn't build it at the hackathon. We used it.
            </div>
          </div>
        </div>
      </div>

      {/* Flow at bottom */}
      <div style={{
        opacity: flow,
        marginTop: 24,
        padding: '12px 20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        alignItems: 'center',
        fontFamily: font.mono,
        fontSize: 11,
      }}>
        <span style={{ color: status.approved }}>Agent</span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>-&gt;</span>
        <span style={{ color: colors.red }}>Arbiter (18 checks)</span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>-&gt;</span>
        <span style={{ color: status.approved }}>PASS / <span style={{ color: status.rejected }}>FAIL</span></span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>-&gt;</span>
        <span style={{ color: status.approved }}>Execute</span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>-&gt;</span>
        <span style={{ color: status.approved }}>Attest on-chain</span>
      </div>

      <div style={{
        opacity: flowNote,
        marginTop: 8,
        textAlign: 'center' as const,
        color: 'rgba(255,255,255,0.25)',
        fontSize: 11,
        fontFamily: font.mono,
      }}>
        46 attestations on Sepolia. 39% pass rate. Every decision permanent.
      </div>
    </AbsoluteFill>
  );
};
