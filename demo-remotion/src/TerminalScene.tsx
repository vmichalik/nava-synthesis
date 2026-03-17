import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from 'remotion';
import { colors, font, status } from './tokens';

const Line: React.FC<{ text: string; color?: string; delay: number; mono?: boolean }> = ({ text, color = 'rgba(255,255,255,0.7)', delay, mono }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      opacity,
      color,
      fontSize: 13,
      fontFamily: mono !== false ? font.mono : font.primary,
      lineHeight: 1.8,
      whiteSpace: 'pre' as const,
    }}>
      {text}
    </div>
  );
};

export const TerminalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const windowOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: colors.black,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: font.mono,
      padding: 40,
    }}>
      {/* Terminal window */}
      <div style={{
        opacity: windowOpacity,
        width: 1000,
        background: colors.black10,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Title bar */}
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

        {/* Terminal content */}
        <div style={{ padding: '16px 20px', maxHeight: 420, overflow: 'hidden' }}>
          <Line text="$ python -m agent.trader" color={status.info} delay={10} />
          <Line text="Arbiter status: ok (LLM: enabled)" color="rgba(255,255,255,0.5)" delay={18} />
          <Line text="Uniswap: connected (chain 11155111, simulation mode)" color="rgba(255,255,255,0.5)" delay={22} />
          <Line text="" delay={25} />
          <Line text="============================================================" color="rgba(255,255,255,0.2)" delay={28} />
          <Line text="ARBITER GUARD - Rebalancing Cycle" color={colors.white} delay={30} />
          <Line text="============================================================" color="rgba(255,255,255,0.2)" delay={32} />
          <Line text="" delay={34} />
          <Line text="Portfolio: $4,000.00" color={colors.white} delay={36} />
          <Line text="  WETH: 1.000000 (87.5%)" color={status.pending} delay={40} />
          <Line text="  USDC: 500.000000 (12.5%)" color={status.pending} delay={43} />
          <Line text="" delay={46} />
          <Line text="1 swap(s) needed for rebalancing:" color={colors.white} delay={50} />
          <Line text="  > Swap 0.314 WETH for USDC on Uniswap V3" color={status.approved} delay={55} />
          <Line text="" delay={58} />
          <Line text="--- Verifying swap (attempt 1/3) ---" color={status.info} delay={62} />
          <Line text="  Decision: PASS" color={status.approved} delay={70} />
          <Line text="  Passed: 5 | Failed: 0 | Skipped: 13" color={colors.white} delay={75} />
          <Line text="  [PASS] VERIFIED" color={status.approved} delay={80} />
          <Line text="" delay={83} />
          <Line text="--- Executing on Uniswap (simulation mode) ---" color={status.info} delay={88} />
          <Line text="  [OK] Swap simulated" color={status.approved} delay={95} />
          <Line text="  TxHash: 0x1046...bb89" color={status.approved} delay={100} />
          <Line text="" delay={105} />
          <Line text="Verified: 1 | Rejected: 0 | Executed: 1 | Errors: 0" color={status.approved} delay={110} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
