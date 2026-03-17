import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { colors, font } from './tokens';

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();

  const tagline = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const line = interpolate(frame, [15, 45], [0, 160], { extrapolateRight: 'clamp' });
  const details = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: 'clamp' });
  const cta = interpolate(frame, [80, 110], [0, 1], { extrapolateRight: 'clamp' });

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
        width: 800,
        height: 400,
        background: 'radial-gradient(ellipse, rgba(254,6,0,0.06) 0%, transparent 70%)',
      }} />

      <div style={{ opacity: tagline, textAlign: 'center' as const }}>
        <div style={{
          color: colors.white,
          fontSize: 42,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
        }}>
          Every trade verified.
          <br />
          Every decision auditable.
        </div>
      </div>

      <div style={{
        width: line,
        height: 2,
        background: colors.red,
        marginTop: 30,
        marginBottom: 30,
      }} />

      <div style={{ opacity: details, textAlign: 'center' as const }}>
        <div style={{
          color: colors.taupe,
          fontSize: 18,
          marginBottom: 8,
        }}>
          Arbiter Guard: Verified Autonomous Trading on Uniswap
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 14,
          fontFamily: font.mono,
        }}>
          github.com/vmichalik/nava-synthesis
        </div>
      </div>

      <div style={{
        opacity: cta,
        marginTop: 40,
        display: 'flex',
        gap: 24,
        alignItems: 'center',
      }}>
        <div style={{
          padding: '12px 28px',
          background: 'linear-gradient(to bottom, #FE0600, rgba(255, 26, 26, 0.24))',
          borderRadius: 53,
          color: colors.white,
          fontSize: 15,
          fontWeight: 700,
        }}>
          @navaai
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 13,
          fontFamily: font.mono,
        }}>
          x.com/navaai
        </div>
      </div>
    </AbsoluteFill>
  );
};
