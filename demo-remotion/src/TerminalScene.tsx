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

        {/* Terminal content - real data */}
        <div style={{ padding: '16px 20px', maxHeight: 420, overflow: 'hidden' }}>
          <Line text="$ python -m agent.trader" color={status.info} delay={15} />
          <Line text="Arbiter status: ok (LLM: openai)" color="rgba(255,255,255,0.5)" delay={25} />
          <Line text="Uniswap: connected (chain 11155111, live mode)" color="rgba(255,255,255,0.5)" delay={30} />
          <Line text="" delay={35} />
          <Line text="============================================================" color="rgba(255,255,255,0.2)" delay={40} />
          <Line text="ARBITER GUARD - Rebalancing Cycle" color={colors.white} delay={45} />
          <Line text="============================================================" color="rgba(255,255,255,0.2)" delay={48} />
          <Line text="" delay={52} />
          <Line text="Portfolio: $250.00" color={colors.white} delay={55} />
          <Line text="  WETH: 0.100000 (100.0%)" color={status.pending} delay={62} />
          <Line text="  USDC: 0.000000 (0.0%)" color={status.pending} delay={67} />
          <Line text="" delay={75} />
          <Line text="1 swap needed: 0.04 WETH -> USDC on Uniswap V3" color={status.approved} delay={80} />
          <Line text="" delay={90} />
          <Line text="--- Verifying swap (attempt 1/3) ---" color={status.info} delay={95} />
          <Line text="  Decision: PASS" color={status.approved} delay={110} />
          <Line text="  Passed: 14 | Failed: 0 | Skipped: 4" color={colors.white} delay={118} />
          <Line text="  [PASS] VERIFIED" color={status.approved} delay={128} />
          <Line text="" delay={140} />
          <Line text="--- Executing on Uniswap (live mode) ---" color={status.info} delay={145} />
          <Line text="  Quote: 0.04 WETH -> ~221.44 USDC" color={colors.white} delay={155} />
          <Line text="  [OK] Token approval confirmed" color={status.approved} delay={170} />
          <Line text="  [OK] Swap executed on Sepolia" color={status.approved} delay={185} />
          <Line text="  TxHash: 0x7ea4878...0b27242f" color={status.approved} delay={195} />
          <Line text="  Block: 10465315 | Gas: 118,438" color={colors.white} delay={210} />
          <Line text="" delay={225} />
          <Line text="Verified: 1 | Rejected: 0 | Executed: 1" color={status.approved} delay={235} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
