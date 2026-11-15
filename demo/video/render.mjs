// Renders the demo with whatever audio exists in assets/ (vo/<voice>/line-1..6.mp3, music.mp3, sfx/click.mp3).
// Usage: node video/render.mjs [--draft] [--voice=george]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const draft = process.argv.includes('--draft');
const voice = (process.argv.find((a) => a.startsWith('--voice=')) ?? '--voice=george').slice(8);
fs.mkdirSync('assets/brand', { recursive: true });
fs.copyFileSync('../frontend/public/brand/lunaris-logo.png', 'assets/brand/lunaris-logo.png');
const has = (p) => fs.existsSync(`assets/${p}`);
const seconds = (p) => Number(execFileSync('npx', ['remotion', 'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `assets/${p}`]).toString().trim());
const vo = [1, 2, 3, 4, 5, 6].map((n) => (has(`vo/${voice}/line-${n}.mp3`) ? `vo/${voice}/line-${n}.mp3` : null));
const props = {
  vo,
  voDur: vo.map((p) => (p ? seconds(p) : 0)),
  music: has('music.mp3') ? 'music.mp3' : null,
  click: has('sfx/click.mp3') ? 'sfx/click.mp3' : null,
  voGain: 1,
  musicGain: 0.12, // music bed is ~-14 dBFS RMS, voice ~-23: this sits it well under
  duckGain: 0.06,  // while a line plays
};
fs.mkdirSync('out', { recursive: true });
const out = draft ? 'out/draft.mp4' : 'out/lunaris-demo-30s.mp4';
const args = ['remotion', 'render', 'video/src/index.ts', 'Main', out, `--props=${JSON.stringify(props)}`, '--codec=h264',
  draft ? '--scale=0.5' : '--crf=16', '--audio-bitrate=192k', '--concurrency=4'];
console.log('audio:', props);
execFileSync('npx', args, { stdio: 'inherit' });
console.log('wrote', out);
