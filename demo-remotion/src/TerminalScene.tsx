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
            python -m agent.trader --autonomous
          </div>
        </div>

        <div style={{ padding: '16px 20px', maxHeight: 420, overflow: 'hidden' }}>
          <Line text="Arbiter: ok | Uniswap: live (Sepolia)" color="rgba(255,255,255,0.4)" delay={15} />
          <Line text="Strategy: 60/40 WETH/USDC | 46 attestations" color="rgba(255,255,255,0.4)" delay={22} />
          <Line text="" delay={30} />
          <Line text="Rebalance: USDC overweight, buying WETH" color={colors.white} delay={35} />
          <Line text="  Verifying... PASS (13 checked, 0 failed)" color={status.approved} delay={48} />
          <Line text="  Executing... 25 USDC -> WETH" color={status.approved} delay={62} />
          <Line text="  TX: 0xaf9cb6...523646  Block: 10470537" color={status.approved} delay={75} />
          <Line text="  Attested: 0x883b92...39d982" color={status.approved} delay={88} />
          <Line text="" delay={100} />
          <Line text="Sanctioned address test" color={status.pending} delay={105} />
          <Line text="  REJECT: address on OFAC sanctions list" color={status.rejected} delay={118} />
          <Line text="  Blocked. Rejection attested on-chain." color="rgba(255,255,255,0.5)" delay={130} />
          <Line text="" delay={142} />
          <Line text="Intent mismatch test" color={status.pending} delay={147} />
          <Line text="  REJECT: intent does not match transaction" color={status.rejected} delay={160} />
          <Line text="" delay={172} />
          <Line text="Unknown router test" color={status.pending} delay={177} />
          <Line text="  REJECT: not a registered Uniswap contract" color={status.rejected} delay={190} />
          <Line text="" delay={205} />
          <Line text="Passed: 2 | Rejected: 4 | Executed: 1" color={status.approved} delay={215} />
          <Line text="Every decision attested on Sepolia." color="rgba(255,255,255,0.4)" delay={228} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
