import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { colors, font } from './tokens';

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 15, stiffness: 60 } });
  const subtitleOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: 'clamp' });
  const lineWidth = interpolate(frame, [20, 60], [0, 200], { extrapolateRight: 'clamp' });
  const tagOpacity = interpolate(frame, [80, 110], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: colors.black,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: font.primary,
    }}>
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 600,
        height: 300,
        background: 'radial-gradient(ellipse, rgba(254,6,0,0.08) 0%, transparent 70%)',
      }} />

      <div style={{
        opacity: titleOpacity,
        transform: `translateY(${interpolate(titleY, [0, 1], [30, 0])}px)`,
      }}>
        <div style={{
          color: colors.red,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          fontFamily: font.mono,
          marginBottom: 16,
        }}>
          NAVA
        </div>
        <div style={{
          color: colors.white,
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          Arbiter Guard
        </div>
      </div>

      <div style={{
        width: lineWidth,
        height: 2,
        background: colors.red,
        marginTop: 24,
        marginBottom: 24,
      }} />

      <div style={{
        opacity: subtitleOpacity,
        color: colors.taupe,
        fontSize: 22,
        fontWeight: 400,
        letterSpacing: '0.01em',
      }}>
        Verified Autonomous Trading on Uniswap
      </div>

      <div style={{
        opacity: tagOpacity,
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontFamily: font.mono,
        marginTop: 40,
        letterSpacing: '0.05em',
      }}>
        The Synthesis Hackathon | March 2026
      </div>
    </AbsoluteFill>
  );
};
