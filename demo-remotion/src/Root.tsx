import { Composition } from 'remotion';
import { ArbiterGuardVideo } from './Video';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ArbiterGuard"
        component={ArbiterGuardVideo}
        durationInFrames={1800}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
