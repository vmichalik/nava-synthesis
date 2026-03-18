import { Sequence, AbsoluteFill, Audio, staticFile, interpolate, useCurrentFrame } from 'remotion';
import { TitleScene } from './TitleScene';
import { ProblemScene } from './ProblemScene';
import { ArchScene } from './ArchScene';
import { TerminalScene } from './TerminalScene';
import { DashboardScene } from './DashboardScene';
import { ClosingScene } from './ClosingScene';

const MUSIC_FILE = staticFile('Aylex - Life is Beautiful (freetouse.com).mp3');

/**
 * Arbiter Guard Demo Video
 *
 * Timeline (30fps, 1800 frames = 60 seconds):
 *   0-179:      Title (6s)
 *   180-479:    Problem statement (10s)
 *   480-869:    Architecture: built vs powered by (13s)
 *   870-1169:   Terminal demo (10s)
 *   1170-1499:  Dashboard UI (11s)
 *   1500-1799:  Closing (10s)
 */
export const ArbiterGuardVideo: React.FC = () => {
  const frame = useCurrentFrame();

  const musicVolume = interpolate(
    frame,
    [0, 60, 1680, 1800],
    [0, 0.3, 0.3, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill>
      <Audio src={MUSIC_FILE} volume={musicVolume} />
      <Sequence from={0} durationInFrames={180}>
        <TitleScene />
      </Sequence>
      <Sequence from={180} durationInFrames={300}>
        <ProblemScene />
      </Sequence>
      <Sequence from={480} durationInFrames={390}>
        <ArchScene />
      </Sequence>
      <Sequence from={870} durationInFrames={300}>
        <TerminalScene />
      </Sequence>
      <Sequence from={1170} durationInFrames={330}>
        <DashboardScene />
      </Sequence>
      <Sequence from={1500} durationInFrames={300}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
