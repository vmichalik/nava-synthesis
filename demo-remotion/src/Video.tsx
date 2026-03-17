import { Sequence, AbsoluteFill } from 'remotion';
import { TitleScene } from './TitleScene';
import { ProblemScene } from './ProblemScene';
import { ArchScene } from './ArchScene';
import { TerminalScene } from './TerminalScene';
import { DashboardScene } from './DashboardScene';
import { ClosingScene } from './ClosingScene';

/**
 * Arbiter Guard Demo Video
 *
 * Timeline (30fps, 600 frames = 20 seconds):
 *   0-89:    Title (3s)
 *   90-209:  Problem statement (4s)
 *   210-329: Architecture (4s)
 *   330-449: Terminal demo (4s)
 *   450-539: Dashboard UI (3s)
 *   540-599: Closing (2s)
 */
export const ArbiterGuardVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}>
        <TitleScene />
      </Sequence>
      <Sequence from={90} durationInFrames={120}>
        <ProblemScene />
      </Sequence>
      <Sequence from={210} durationInFrames={120}>
        <ArchScene />
      </Sequence>
      <Sequence from={330} durationInFrames={120}>
        <TerminalScene />
      </Sequence>
      <Sequence from={450} durationInFrames={90}>
        <DashboardScene />
      </Sequence>
      <Sequence from={540} durationInFrames={60}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
