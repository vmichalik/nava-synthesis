import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { colors, font, status } from './tokens';

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const line1 = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: 'clamp' });
  const line2 = interpolate(frame, [65, 90], [0, 1], { extrapolateRight: 'clamp' });
  const line3 = interpolate(frame, [100, 125], [0, 1], { extrapolateRight: 'clamp' });
  const answer = interpolate(frame, [160, 195], [0, 1], { extrapolateRight: 'clamp' });

  const textStyle = {
    fontSize: 20,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.6,
    maxWidth: 700,
  };

  return (
    <AbsoluteFill style={{
      background: colors.black,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: font.primary,
      padding: 80,
    }}>
      <div style={{ opacity: headerOpacity }}>
        <div style={{
          color: colors.red,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.15em',
          fontFamily: font.mono,
          textTransform: 'uppercase' as const,
          marginBottom: 12,
        }}>
          THE PROBLEM
        </div>
        <div style={{
          color: colors.white,
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          marginBottom: 40,
        }}>
          Agents trade. Nothing checks their work.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ ...textStyle, opacity: line1 }}>
          <span style={{ color: status.rejected, fontFamily: font.mono, fontSize: 14, marginRight: 12 }}>01</span>
          No safety check between an agent's decision and a swap hitting the chain
        </div>
        <div style={{ ...textStyle, opacity: line2 }}>
          <span style={{ color: status.pending, fontFamily: font.mono, fontSize: 14, marginRight: 12 }}>02</span>
          No way to prove an agent traded responsibly after the fact
        </div>
        <div style={{ ...textStyle, opacity: line3 }}>
          <span style={{ color: status.info, fontFamily: font.mono, fontSize: 14, marginRight: 12 }}>03</span>
          No on-chain record other agents can check before trusting this one
        </div>
      </div>

      <div style={{
        opacity: answer,
        marginTop: 50,
        padding: '16px 32px',
        border: `1px solid rgba(254,6,0,0.3)`,
        borderRadius: 12,
        background: 'rgba(254,6,0,0.05)',
      }}>
        <span style={{ color: colors.white, fontSize: 20, fontWeight: 700 }}>
          Arbiter Guard fixes all three.
        </span>
      </div>
    </AbsoluteFill>
  );
};
