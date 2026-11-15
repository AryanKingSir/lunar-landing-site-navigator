// Generates the voice-over lines with ElevenLabs text-to-speech.
// Lines come from video/timing.json.
// Usage: source audio/key.sh && node audio/voice.mjs <voiceId:name>...   → assets/vo/<name>/line-N.mp3
import fs from 'node:fs';
import path from 'node:path';

const LINES = JSON.parse(fs.readFileSync('video/timing.json', 'utf8')).scenes.map((s) => s.line);

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('ELEVENLABS_API_KEY is not set (source audio/key.sh)');

for (const arg of process.argv.slice(2)) {
  const [id, name] = arg.split(':');
  const dir = path.resolve('assets/vo', name); fs.mkdirSync(dir, { recursive: true });
  for (const [i, text] of LINES.entries()) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        text, model_id: 'eleven_multilingual_v2',
        previous_text: LINES[i - 1], next_text: LINES[i + 1],
        voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true, speed: 0.95 },
      }),
    });
    if (!res.ok) throw new Error(`${name} line ${i + 1}: ${res.status} ${await res.text()}`);
    fs.writeFileSync(path.join(dir, `line-${i + 1}.mp3`), Buffer.from(await res.arrayBuffer()));
    console.log(`${name} line ${i + 1} ok`);
  }
}
