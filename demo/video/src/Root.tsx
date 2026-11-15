import { Composition } from 'remotion';
import { Main, TOTAL, type AudioProps } from './Main';

const defaults: AudioProps = { soundtrack: null };

export function Root() {
  return (
    <Composition id="Main" component={Main} durationInFrames={TOTAL} fps={60} width={1920} height={1080} defaultProps={defaults} />
  );
}
