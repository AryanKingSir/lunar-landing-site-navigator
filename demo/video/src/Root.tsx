import { Composition } from 'remotion';
import { Main, TOTAL, type AudioProps } from './Main';

const defaults: AudioProps = { vo: [null, null, null, null, null, null], music: null, voGain: 1, musicGain: 0.18 };

export function Root() {
  return (
    <Composition id="Main" component={Main} durationInFrames={TOTAL} fps={60} width={1920} height={1080} defaultProps={defaults} />
  );
}
