// Mixes the soundtrack (audio/mix.py) and renders the demo.
// Voice: --voice=<name> (assets/vo/<name>/line-1..6.mp3); default lara if present, else bella.
// Usage: node video/render.mjs [--draft] [--voice=bella]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const draft = process.argv.includes('--draft');
const voice = process.argv.find((a) => a.startsWith('--voice='))?.slice(8) ?? (fs.existsSync('assets/vo/lara/line-1.mp3') ? 'lara' : 'bella');
fs.mkdirSync('assets/brand', { recursive: true });
fs.copyFileSync('../frontend/public/brand/lunaris-logo.png', 'assets/brand/lunaris-logo.png');
execFileSync('python3', ['audio/mix.py', voice], { stdio: 'inherit' });

const props = { soundtrack: 'soundtrack.wav' };
fs.mkdirSync('out', { recursive: true });
const out = draft ? 'out/draft.mp4' : 'out/lunaris-demo-30s.mp4';
const args = ['remotion', 'render', 'video/src/index.ts', 'Main', out, `--props=${JSON.stringify(props)}`, '--codec=h264',
  draft ? '--scale=0.5' : '--crf=16', '--audio-bitrate=256k', '--concurrency=4'];
execFileSync('npx', args, { stdio: 'inherit' });
console.log('wrote', out);
