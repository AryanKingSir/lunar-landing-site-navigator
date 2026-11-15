"""Builds the whole soundtrack sample-accurately, so Remotion only has to play one finished track.

Voice lines are tightened (long pauses shortened), de-clicked, levelled and placed at their scene's `voAt`; the music bed fades in and out and ducks
smoothly under the voice; each cursor click gets a short synthesised tick; a soft limiter catches peaks.
Every clip edge gets a few milliseconds of fade so nothing pops.

Usage (from demo/): python3 audio/mix.py <voice>    → assets/soundtrack.wav
Needs macOS `afconvert` to decode MP3s, and numpy.
"""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 48_000
VOICE_RMS_DB = -20.0     # each line levelled to this loudness
MUSIC_DB = -19.0         # music bed level with nobody talking (relative to its own level)
DUCK_DB = -27.0          # music level under the voice
DUCK_RAMP = 0.25         # seconds to duck in/out
CLICK_DB = -24.0         # peak level of the click tick


def load(path: Path) -> np.ndarray:
    """Decodes any audio file to float stereo at SR."""
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / 'a.wav'
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', f'LEI16@{SR}', '-c', '2', str(path), str(wav)], check=True)
        with wave.open(str(wav)) as w:
            a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2)
    return a.astype(np.float64) / 32768


def edge_fade(a: np.ndarray, ms: float = 6) -> np.ndarray:
    n = min(len(a) // 2, int(SR * ms / 1000))
    ramp = np.linspace(0, 1, n)[:, None]
    a = a.copy()
    a[:n] *= ramp
    a[-n:] *= ramp[::-1]
    return a


def declick(a: np.ndarray) -> np.ndarray:
    """Removes the tiny mouth-click artefacts TTS leaves in pauses.

    A click is a sharp transient (large second difference relative to its surroundings) in a stretch
    whose 80 ms level is well below the line's loudness. Each one gets a smooth ~16 ms dip; speech,
    where the 80 ms level is high, is left untouched. Pauses are also gently gated.
    """
    m = a.mean(1)
    ref = np.sqrt((m ** 2).mean())
    w = int(SR * 0.08)
    env = np.sqrt(np.convolve(m ** 2, np.ones(w) / w, 'same')) + 1e-9
    rel = 20 * np.log10(env / ref)
    d2 = np.abs(np.diff(m, 2, prepend=m[0], append=m[-1]))
    loc = np.convolve(d2, np.ones(960) / 960, 'same') + 1e-6
    hits = np.where((rel < -14) & (d2 / loc > 12) & (d2 > 0.004))[0]
    g = smoothstep((rel + 30) / 10)                               # gentle gate: -30 dB rel closed, -20 open
    half = int(SR * 0.008)
    dip = np.hanning(2 * half)
    for i in hits:
        lo, hi = max(0, i - half), min(len(g), i + half)
        g[lo:hi] = np.minimum(g[lo:hi], 1 - dip[(lo - i + half):(hi - i + half)])
    s = int(SR * 0.004)
    g = np.convolve(g, np.ones(s) / s, 'same')
    return a * g[:, None]


def tighten(a: np.ndarray, max_pause: float = 0.32, lead: float = 0.03) -> np.ndarray:
    """Trims leading/trailing silence and shortens pauses inside a line to `max_pause` seconds.

    Silence = 40 ms level more than 32 dB below the line's loudness. Cuts land in the middle of a pause
    with a 10 ms crossfade, so the joins are inaudible.
    """
    m = a.mean(1)
    w = int(SR * 0.04)
    env = np.sqrt(np.convolve(m ** 2, np.ones(w) / w, 'same')) + 1e-9
    loud = 20 * np.log10(env / np.sqrt((m ** 2).mean())) > -32
    idx = np.where(loud)[0]
    if not len(idx):
        return a
    a = a[max(0, idx[0] - int(SR * lead)): idx[-1] + int(SR * 0.08)]
    loud = loud[max(0, idx[0] - int(SR * lead)): idx[-1] + int(SR * 0.08)]
    keep = int(SR * max_pause)
    xf = int(SR * 0.01)
    out, i, n = [], 0, len(a)
    edges = np.flatnonzero(np.diff(loud.astype(int)))            # loud→quiet and quiet→loud boundaries
    quiet = [(s + 1, e + 1) for s, e in zip(edges[:-1], edges[1:]) if not loud[s + 1]]
    for qs, qe in quiet:
        if qe - qs <= keep + 2 * xf:
            continue
        cut_a, cut_b = qs + keep // 2, qe - keep // 2               # keep half the allowed pause on each side
        out.append(a[i:cut_a])
        i = cut_b - xf
        ramp = np.linspace(0, 1, xf)[:, None]
        out[-1] = out[-1].copy()
        out[-1][-xf:] = out[-1][-xf:] * (1 - ramp) + a[i:i + xf] * ramp
        i += xf
    out.append(a[i:n])
    return np.concatenate(out)


def db(x: float) -> float:
    return 10 ** (x / 20)


def smoothstep(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def tick() -> np.ndarray:
    """Soft trackpad-style tick: a short band-limited noise burst with a fast decay."""
    rng = np.random.default_rng(7)
    t = np.arange(int(SR * 0.03)) / SR
    noise = np.convolve(rng.standard_normal(len(t)), np.ones(6) / 6, 'same')   # gentle low-pass
    body = np.sin(2 * np.pi * 1800 * t) * 0.5
    x = (noise * 0.6 + body) * np.exp(-t / 0.0035)
    x = x / np.abs(x).max() * db(CLICK_DB)
    return edge_fade(np.stack([x, x], 1), 1)


def main() -> None:
    voice = sys.argv[1] if len(sys.argv) > 1 else 'alice'
    root = Path(__file__).resolve().parent.parent
    timing = json.loads((root / 'video/timing.json').read_text())
    fps, fade, scenes = timing['fps'], timing['fade'], timing['scenes']
    total_frames = sum(s['frames'] for s in scenes) - fade * (len(scenes) - 1)
    n = int(total_frames / fps * SR)
    out = np.zeros((n, 2))

    starts, at = [], 0
    for i, s in enumerate(scenes):
        starts.append(at)
        at += s['frames'] - fade

    # Voice, levelled per line.
    talk = np.zeros(n)
    spans = []
    for i, s in enumerate(scenes):
        f = root / f'assets/vo/{voice}/line-{i + 1}.mp3'
        if not f.exists():
            print(f'missing {f.relative_to(root)}')
            continue
        v = tighten(load(f))
        rms = np.sqrt((v ** 2).mean())
        v = edge_fade(declick(v) * db(VOICE_RMS_DB) / rms)
        a = int((starts[i] + s['voAt']) / fps * SR)
        b = min(n, a + len(v))
        out[a:b] += v[: b - a]
        talk[a:b] = 1
        spans.append((s['id'], a / SR, b / SR))
    for (p, _, end), (q, nxt, _) in zip(spans, spans[1:]):
        if end > nxt - 0.1:
            print(f'warning: line "{p}" ends {end:.2f}s, too close to "{q}" at {nxt:.2f}s')

    # Music: smooth duck under the voice, fade in/out.
    m_path = root / 'assets/music.mp3'
    if m_path.exists():
        m = load(m_path)
        m = np.concatenate([m] * (n // len(m) + 1))[:n]
        r = int(SR * DUCK_RAMP)
        k = np.convolve(talk, np.ones(2 * r) / (2 * r), 'same')          # widen and soften the talk mask
        duck = smoothstep(np.clip(k * 2, 0, 1))
        gain = db(MUSIC_DB) + (db(DUCK_DB) - db(MUSIC_DB)) * duck
        t = np.arange(n) / SR
        edge = smoothstep(t / 0.6) * smoothstep((n / SR - t) / 1.5)
        out += m * (gain * edge)[:, None]

    # Click ticks.
    tk = tick()
    for i, s in enumerate(scenes):
        for c in s['clicks']:
            a = int((starts[i] + c) / fps * SR)
            out[a:a + len(tk)] += tk[: n - a]

    # Soft limiter above -3 dBFS, then a final ceiling at -1 dBFS.
    th = db(-3)
    over = np.abs(out) > th
    out[over] = np.sign(out[over]) * (th + (1 - th) * np.tanh((np.abs(out[over]) - th) / (1 - th)))
    out *= min(1, db(-1) / np.abs(out).max())

    dst = root / 'assets/soundtrack.wav'
    with wave.open(str(dst), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype('<i2').tobytes())
    print(f'wrote {dst.relative_to(root)}: {n / SR:.2f}s, voice {voice}, peak {20 * np.log10(np.abs(out).max()):.1f} dBFS')
    for sid, a, b in spans:
        print(f'  {sid:8s} {a:5.2f}–{b:5.2f}s')


if __name__ == '__main__':
    main()
