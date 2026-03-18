import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { colors, font, status } from './tokens';

const Line: React.FC<{ text: string; color?: string; delay: number }> = ({ text, color = 'rgba(255,255,255,0.7)', delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      opacity,
      color,
      fontSize: 13,
      fontFamily: font.mono,
      lineHeight: 1.8,
      whiteSpace: 'pre' as const,
    }}>
      {text}
    </div>
  );
};

export const TerminalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const windowOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: colors.black,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: font.mono,
      padding: 40,
    }}>
      <div style={{
        opacity: windowOpacity,
        width: 1000,
        background: colors.black10,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          gap: 8,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#FF5F57' }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#FEBC2E' }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#28C840' }} />
          <div style={{ flex: 1, textAlign: 'center' as const, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            python -m agent.trader
          </div>
        </div>

        <div style={{ padding: '16px 20px', maxHeight: 420, overflow: 'hidden' }}>
          <Line text="$ python -m agent.trader" color={status.info} delay={15} />
          <Line text="Arbiter: ok (LLM: enabled) | Uniswap: live (Sepolia)" color="rgba(255,255,255,0.5)" delay={25} />
          <Line text="" delay={35} />
          <Line text="Portfolio: $1,522" color={colors.white} delay={40} />
          <Line text="  WETH  0.41  (67.3%)   USDC  497  (32.7%)" color={status.pending} delay={50} />
          <Line text="" delay={60} />
          <Line text="Rebalancing: Swap 0.0447 WETH -> USDC" color={status.approved} delay={65} />
          <Line text="" delay={78} />
          <Line text="Verifying with Arbiter..." color={status.info} delay={85} />
          <Line text="  Decision: PASS" color={status.approved} delay={100} />
          <Line text="  14 passed | 0 failed | 4 skipped" color={colors.white} delay={110} />
          <Line text="  [PASS] VERIFIED" color={status.approved} delay={120} />
          <Line text="" delay={135} />
          <Line text="Executing on Uniswap..." color={status.info} delay={140} />
          <Line text="  0.0447 WETH -> 246.13 USDC" color={colors.white} delay={150} />
          <Line text="  [OK] Swap executed" color={status.approved} delay={165} />
          <Line text="  TX: 0x5fe65c...cd9036  Block: 10469642" color={status.approved} delay={175} />
          <Line text="" delay={190} />
          <Line text="Recording attestation..." color={status.info} delay={195} />
          <Line text="  [OK] Attested on-chain" color={status.approved} delay={210} />
          <Line text="  TX: 0x065965...e25d6" color={status.approved} delay={220} />
          <Line text="" delay={235} />
          <Line text="Verified: 1 | Executed: 1 | Attested: 1" color={status.approved} delay={240} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
