// Captures the live Lunaris site for the demo video.
// Stills for click moments + frame-by-frame time sweeps (smooth regardless of renderer speed).
// Usage: node capture/capture.mjs [scene...]   (no args = all scenes)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.LUNARIS_URL ?? 'https://lunar-landing-site-navigator-pi.vercel.app/';
const OUT = path.resolve('assets');
const VIEW = { width: 1600, height: 1000 };
const DAY = 86_400_000;
const FPS = 60;
const START = '2026-12-01T00:00';
// Opens at Day 2 unless `extra` sets the time (at Day 0 the Sun sits on its own "Day 0" path marker).
const link = (sites, extra = '') => `${BASE}?s=${sites.map((s) => `${s}@${START}~30`).join(';')}${extra.includes('t=') ? '' : '&t=48'}${extra}`;

const cues = fs.existsSync(path.join(OUT, 'cues.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'cues.json'), 'utf8')) : {};
const saveCues = () => fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify(cues, null, 2));

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'] });

async function newPage() {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(() => localStorage.setItem('llsn.tutorial.v1', '{"completed":[],"dismissed":true}'));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  return page;
}

/** Waits until every site has its result (no skeletons) and fonts are ready. */
async function settle(page, ms = 600) {
  await page.waitForFunction(() => !document.querySelector('.skel') && !document.querySelector('[role=status].sum-skel')
    && (document.querySelector('[data-tour=summary]')?.innerText ?? '').includes('%')
    && !document.body.innerText.includes('Computing'), null, { timeout: 90_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(VIEW.width - 2, 2);
  await page.waitForTimeout(ms);
}

const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
async function setTime(page, ms) {
  await page.evaluate((v) => {
    const r = document.querySelector('[data-tour=timebar] input[type=range]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(r, String(v));
    r.dispatchEvent(new Event('input', { bubbles: true }));
    r.dispatchEvent(new Event('change', { bubbles: true }));
  }, ms);
}

async function box(page, selector) {
  const b = await page.locator(selector).first().boundingBox();
  return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
}

async function still(page, scene, name) {
  const dir = path.join(OUT, scene); fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.jpg`), type: 'jpeg', quality: 94 });
}

/** Frame-by-frame sweep of mission time from d0 to d1 days over `seconds`. */
async function sweep(page, scene, d0, d1, seconds, waitFn = frames) {
  const dir = path.join(OUT, scene); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const n = Math.round(seconds * FPS);
  for (let i = 0; i < n; i++) {
    const t = d0 + ((d1 - d0) * i) / (n - 1);
    await setTime(page, Math.round((t * DAY) / 600_000) * 600_000);
    await page.evaluate(waitFn);
    await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (i % 60 === 0) process.stdout.write(`  ${scene} ${i}/${n}\n`);
  }
  cues[scene] = { ...(cues[scene] ?? {}), frames: n };
  saveCues();
}

const API = process.env.LUNARIS_API ?? 'https://lunar-navigator-api-12on.onrender.com';

const scenes = {
  /** Intro backdrop: Connecting Ridge's real skyline (LOLA horizon mask) from the live API. */
  async horizon() {
    const sites = await (await fetch(`${API}/api/sites`)).json();
    const s = (sites.sites ?? sites).find((x) => x.id === 'connecting-ridge');
    const res = await fetch(`${API}/api/scenario`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat: s.lat, lon: s.lon, start: '2026-12-01T00:00:00Z', end: '2026-12-02T00:00:00Z', step_min: 240 }),
    });
    const { horizon } = await res.json();
    fs.writeFileSync(path.join(OUT, 'horizon.json'), JSON.stringify(horizon));
  },

  /** Scene 2: two sites → add Shackleton floor → 3 sites. */
  async compare() {
    const page = await newPage();
    await page.goto(link(['connecting-ridge', 'apollo11']), { waitUntil: 'domcontentloaded' });
    await settle(page, 1200);
    await still(page, 'compare', 'a-start');
    const c = { addSite: await box(page, '[data-tour=add-site]') };
    await page.locator('[data-tour=add-site]').click();
    await page.waitForTimeout(700);
    await page.mouse.move(VIEW.width - 2, 2);
    await still(page, 'compare', 'b-dialog');
    c.shackleton = await box(page, 'dialog label:has-text("Shackleton crater floor")');
    await page.locator('dialog label', { hasText: 'Shackleton crater floor' }).first().click();
    await page.waitForTimeout(300);
    await page.mouse.move(VIEW.width - 2, 2);
    await still(page, 'compare', 'c-picked');
    c.addButton = await box(page, 'dialog button:text-is("Add site")');
    await page.locator('dialog button', { hasText: /^Add site$/ }).click();
    await page.waitForTimeout(400);
    await settle(page, 1200);
    await still(page, 'compare', 'd-three');
    c.summary = await box(page, '[data-tour=summary]');
    cues.compare = c; saveCues();
    await page.context().close();
  },

  /** Scene 3: sky view, Day 0 → 15 with the sky window in view. */
  async sky() {
    const page = await newPage();
    await page.goto(link(['connecting-ridge', 'apollo11']), { waitUntil: 'domcontentloaded' });
    await settle(page, 800);
    await page.locator('.pano').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 160));
    await page.waitForTimeout(500);
    cues.sky = { pano: await box(page, '.pano'), caption: await box(page, '.sky-caption') };
    await sweep(page, 'sky', 2, 17, 6);
    await page.context().close();
  },

  /** Scene 4 (+ opening background): 3D full screen, shadows sweep over 5 days. */
  async terrain() {
    const page = await newPage();
    await page.goto(link(['connecting-ridge', 'change7-target', 'malapert-massif'], '&v=terrain&t=120'), { waitUntil: 'domcontentloaded' });
    await settle(page, 1500);
    await page.waitForSelector('.three-wrap canvas', { timeout: 60_000 });
    await page.locator('.full-btn').click();
    await page.waitForTimeout(3000);
    await page.addStyleTag({ content: '.full-btn { visibility: hidden !important; }' });
    await page.mouse.move(VIEW.width - 2, 2);
    cues.terrain = { wrap: await box(page, '.three-wrap') };
    await sweep(page, 'terrain', 5, 10, 6, () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));
    await page.context().close();
  },

  /** Scene 5: open All numbers → solar power and energy per site. */
  async energy() {
    const page = await newPage();
    await page.goto(link(['connecting-ridge', 'apollo11', 'shackleton-floor']), { waitUntil: 'domcontentloaded' });
    await settle(page, 1000);
    await still(page, 'energy', 'a-start');
    const c = { tab: await box(page, '[data-tour=tab-numbers]') };
    await page.locator('[data-tour=tab-numbers]').click();
    await settle(page, 800);
    // Smooth eased scroll down to the power and energy rows, one capture per video frame.
    const target = await page.evaluate(() => {
      const r = [...document.querySelectorAll('tr')].find((t) => t.textContent.includes('Energy over the period'));
      return Math.max(0, Math.round(r.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 180));
    });
    const dir = path.join(OUT, 'energy', 'scroll'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const n = 48;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(target * e));
      await page.evaluate(frames);
      await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
    c.scrollFrames = n;
    const p = await box(page, 'tr:has(th:has-text("Average power over the period"))');
    const e = await box(page, 'tr:has(th:has-text("Energy over the period"))');
    c.rows = { x: p.x, y: p.y, w: p.w, h: e.y + e.h - p.y };
    const r = await page.locator('tr:has(th:has-text("Radio link to Earth"))').last().boundingBox(); // whole-period row
    c.radio = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    c.scrollY = await page.evaluate(() => window.scrollY);
    cues.energy = c; saveCues();
    await page.context().close();
  },

  /** Scene 6: Share → "Link copied". */
  async share() {
    const page = await newPage();
    await page.goto(link(['connecting-ridge', 'apollo11', 'shackleton-floor']), { waitUntil: 'domcontentloaded' });
    await settle(page, 1000);
    await still(page, 'share', 'a-start');
    const c = { share: await box(page, '[data-tour=share]') };
    await page.locator('[data-tour=share]').click();
    await page.waitForTimeout(250);
    await page.mouse.move(VIEW.width - 2, 2);
    await still(page, 'share', 'b-copied');
    cues.share = c; saveCues();
    await page.context().close();
  },
};

const pick = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
for (const [name, fn] of Object.entries(scenes)) {
  if (pick.length && !pick.includes(name)) continue;
  const t0 = Date.now();
  console.log(`scene ${name}…`);
  await fn();
  console.log(`scene ${name} done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
cues.view = VIEW; cues.scale = 2; cues.fps = FPS; cues.url = BASE;
saveCues();
await browser.close();
