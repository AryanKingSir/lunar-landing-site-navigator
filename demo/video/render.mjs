// Renders the demo. Uses whatever audio exists in assets/ (vo/line-1..6.mp3, music.mp3).
// Usage: node video/render.mjs [--draft]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const draft = process.argv.includes('--draft');
fs.mkdirSync('assets/brand', { recursive: true });
fs.copyFileSync('../frontend/public/brand/lunaris-logo.png', 'assets/brand/lunaris-logo.png');
const has = (p) => fs.existsSync(`assets/${p}`);
const props = {
  vo: [1, 2, 3, 4, 5, 6].map((n) => (has(`vo/line-${n}.mp3`) ? `vo/line-${n}.mp3` : null)),
  music: has('music.mp3') ? 'music.mp3' : null,
  voGain: 1,
  musicGain: 0.16,
};
fs.mkdirSync('out', { recursive: true });
const out = draft ? 'out/draft.mp4' : 'out/lunaris-demo-30s.mp4';
const args = ['remotion', 'render', 'video/src/index.ts', 'Main', out, `--props=${JSON.stringify(props)}`, '--codec=h264',
  draft ? '--scale=0.5' : '--crf=16', '--concurrency=4'];
console.log('audio:', props);
execFileSync('npx', args, { stdio: 'inherit' });
console.log('wrote', out);
