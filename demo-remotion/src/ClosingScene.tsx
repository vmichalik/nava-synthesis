import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { colors, font, status } from './tokens';

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();

  const tagline = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const line = interpolate(frame, [15, 45], [0, 160], { extrapolateRight: 'clamp' });
  const built = interpolate(frame, [50, 80], [0, 1], { extrapolateRight: 'clamp' });
  const tracks = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: 'clamp' });
  const arbiterNote = interpolate(frame, [140, 170], [0, 1], { extrapolateRight: 'clamp' });
  const cta = interpolate(frame, [190, 220], [0, 1], { extrapolateRight: 'clamp' });

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
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}>
          Every trade verified.
          <br />
          Every decision on-chain.
        </div>
      </div>

      <div style={{
        width: line,
        height: 2,
        background: colors.red,
        marginTop: 24,
        marginBottom: 24,
      }} />

      <div style={{ opacity: built, textAlign: 'center' as const, marginBottom: 20 }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          Agent, execution, attestation contract, and dashboard
          <br />
          built for The Synthesis hackathon
        </div>
      </div>

      <div style={{ opacity: tracks, display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'ERC-8004', color: status.approved },
          { label: 'AUTONOMOUS', color: status.approved },
          { label: 'ATTESTED', color: status.approved },
          { label: 'PRIVATE', color: status.info },
        ].map((tag, i) => (
          <div key={i} style={{
            padding: '5px 12px',
            border: `1px solid ${tag.color}40`,
            borderRadius: 999,
            color: tag.color,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            fontFamily: font.mono,
          }}>
            {tag.label}
          </div>
        ))}
      </div>

      <div style={{
        opacity: arbiterNote,
        padding: '12px 24px',
        background: 'rgba(254,6,0,0.05)',
        border: '1px solid rgba(254,6,0,0.15)',
        borderRadius: 10,
        textAlign: 'center' as const,
        marginBottom: 24,
      }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          Powered by the Nava Arbiter
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: font.mono, marginTop: 4 }}>
          Developer preview coming soon
        </div>
      </div>

      <div style={{
        opacity: cta,
        display: 'flex',
        gap: 24,
        alignItems: 'center',
      }}>
        <div style={{
          padding: '10px 24px',
          background: 'linear-gradient(to bottom, #FE0600, rgba(255, 26, 26, 0.24))',
          borderRadius: 53,
          color: colors.white,
          fontSize: 14,
          fontWeight: 700,
        }}>
          @navaai
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 12,
          fontFamily: font.mono,
        }}>
          github.com/vmichalik/nava-synthesis
        </div>
      </div>
    </AbsoluteFill>
  );
};
