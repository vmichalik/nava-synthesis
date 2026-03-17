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
 * Timeline (30fps, 1500 frames = 50 seconds):
 *   0-179:     Title (6s)
 *   180-449:   Problem statement (9s)
 *   450-749:   Architecture (10s)
 *   750-1049:  Terminal demo (10s)
 *   1050-1319: Dashboard UI (9s)
 *   1320-1499: Closing (6s)
 */
export const ArbiterGuardVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade music in over first 2s, fade out over last 3s
  const musicVolume = interpolate(
    frame,
    [0, 60, 1380, 1500],
    [0, 0.35, 0.35, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill>
      <Audio src={MUSIC_FILE} volume={musicVolume} />
      <Sequence from={0} durationInFrames={180}>
        <TitleScene />
      </Sequence>
      <Sequence from={180} durationInFrames={270}>
        <ProblemScene />
      </Sequence>
      <Sequence from={450} durationInFrames={300}>
        <ArchScene />
      </Sequence>
      <Sequence from={750} durationInFrames={300}>
        <TerminalScene />
      </Sequence>
      <Sequence from={1050} durationInFrames={270}>
        <DashboardScene />
      </Sequence>
      <Sequence from={1320} durationInFrames={180}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
