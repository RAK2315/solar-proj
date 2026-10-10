/**
 * ppt/round-1/shoot.mjs: the Round 1 deck's pictures, taken from the running product.
 *
 * Written against the console as reworked on 10 Oct 2026 (the workflow tabs, the
 * inspection view, the repair crew). ppt/build/shoot_deck.mjs drives the UI of
 * 7 Oct and is left as it was. Nothing here is composed or retouched: every file
 * is a screenshot of real Chrome on the real GPU.
 *
 * The drone is flown at 60x on purpose: at 600x the flight camera lags its
 * spline and the detector is handed the wrong frame.
 */
//   (serve the app on :3000 first)
//   node ppt/round-1/shoot.mjs [phase...]     phases: static sandbox flight
//   THEME=light for the light theme. Raw captures go to SHOT_DIR (default ppt/round-1/raw).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'raw');
mkdirSync(OUT, { recursive: true });
const phases = process.argv.slice(2);
const want = (p) => phases.length === 0 || phases.includes(p);
const W = 1920; const H = 1080;
const BASE = process.env.URL ?? 'http://localhost:3000';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false, args: ['--ignore-gpu-blocklist', '--enable-gpu'],
});
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
page.on('pageerror', (e) => console.log(`pageerror: ${e.message.slice(0, 300)}`));

const wait = (ms) => page.waitForTimeout(ms);
const snap = async (name) => {
  await wait(600);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(name);
};
// Controls are found by their accessible name or their text, whichever they carry.
const click = async (name) => {
  const ok = await page.evaluate((n) => {
    const all = [...document.querySelectorAll('button, [role="button"], a, summary')];
    const b = all.find((x) => !x.disabled && ((x.getAttribute('aria-label') ?? x.textContent) ?? '').trim().startsWith(n));
    b?.click();
    return !!b;
  }, name);
  if (!ok) console.log(`  no control "${name}"`);
  return ok;
};
const screen = async (label) => { await page.click(`.sy-rail button:has-text("${label}")`); await wait(1200); };
const texts = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.innerText.replace(/\s+/g, ' ').trim()), sel);
const say = async (label, sel) => console.log(`  ${label}:`, JSON.stringify(await texts(sel)));
const kpis = () => say('kpis', '.kpis div');
const sheetText = () => say('sheet', '.sy-sheet');
const scrollSheets = (frac) => page.evaluate((f) => {
  for (const el of document.querySelectorAll('.sy-sheet, .sy *')) {
    if (el.scrollHeight > el.clientHeight + 8 && getComputedStyle(el).overflowY !== 'visible') el.scrollTop = (el.scrollHeight - el.clientHeight) * f;
  }
}, frac);
// ?twin=3d holds the 3D field: a screenshot stalls a frame, and the frame-rate
// watchdog would otherwise hand a followed flight to the 2D map.
// Held clock: every static picture is then the same minute, so a figure on one
// slide agrees with the same figure on another.
const openConsole = async (hold = true, query = '?twin=3d') => {
  await page.goto(`${BASE}/console${query}`, { waitUntil: 'load' });
  await page.waitForSelector('canvas', { state: 'attached', timeout: 30000 });
  await wait(2500);
  await page.keyboard.press('s');                   // the committed rehearsal state
  await wait(300);
  if (hold) await click('Pause site clock');
  await wait(1000);
  if (process.env.THEME === 'light' && await click('Switch to light theme')) await wait(1500);
  await page.click('.sy-rail button:has-text("Site")');
  await wait(800);
};

if (want('static')) {
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await wait(5000);
  await snap('landing');

  await openConsole();
  await kpis();
  await snap('site-3d');
  await page.selectOption('[aria-label="Select array"]', 'B-17');
  await wait(1500);
  await snap('site-b17-panel');
  await say('array panel', '.sy-sheet');
  await click('Focus array');
  await wait(2500);
  await snap('site-b17-focus');
  await click('Overview');
  await wait(2000);
  await click('Show the field in 2D');
  await wait(1500);
  await snap('site-2d-b17');
  await click('Show the field in 3D');
  await wait(1500);

  for (const s of ['Queue', 'Analytics', 'Drones']) {
    await screen(s);
    await snap(`${s.toLowerCase()}-top`);
    await sheetText();
    await scrollSheets(0.5); await snap(`${s.toLowerCase()}-mid`);
    await scrollSheets(1); await snap(`${s.toLowerCase()}-end`);
    await scrollSheets(0);
  }
  await screen('Analytics');
  await click('Tariff, sources and calculation basis');
  await wait(800);
  await scrollSheets(1);
  await snap('analytics-tariff');
  await sheetText();
}

if (want('sandbox')) {
  await openConsole();
  await screen('Sandbox');
  await snap('sandbox-rest');
  await say('queue at rest', '.q li');
  const tool = await page.locator('button:has-text("Dust storm")').boundingBox();
  await page.mouse.move(tool.x + 40, tool.y + 16);
  await page.mouse.down();
  const target = { x: Math.round(W * (Number(process.env.DROP_X ?? 0.42))), y: Math.round(H * (Number(process.env.DROP_Y ?? 0.42))) };
  await page.mouse.move(target.x - 120, target.y + 60, { steps: 12 });
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await wait(400);
  await snap('sandbox-dust-drag');
  await page.mouse.up();
  // Dust develops over three minutes of site time, so the clock runs on a little
  // and is held again before the picture.
  await click('Run site clock');
  await wait(8000);
  await click('Pause site clock');
  await wait(1500);
  await kpis();
  await snap('sandbox-dust-dropped');
  await sheetText();
  await scrollSheets(0.5); await snap('sandbox-dust-mid');
  await scrollSheets(1); await snap('sandbox-dust-end');
  await scrollSheets(0);
  await screen('Queue');
  await snap('queue-after-dust');
  await sheetText();
}

if (want('flight')) {
  await openConsole(false);
  await page.selectOption('[aria-label="Select array"]', 'B-17');
  await wait(800);
  await click('Run site time at 60×');
  await click('Dispatch drone');
  await wait(600);
  await click('Follow the drone');
  for (let i = 1; i <= 16; i += 1) {
    await wait(2400);
    await snap(`flight-${String(i).padStart(2, '0')}`);
  }
  await kpis();
  await click('Back to the field');
  await click('Run site time at 1×');
  await wait(1500);
  await snap('site-b17-inspected');
  await say('array panel', '.sy-sheet');

  await screen('Incident');
  await click('Summary');
  await wait(5000);
  await snap('incident-top');
  await sheetText();
  for (const f of [0.33, 0.66, 1]) { await scrollSheets(f); await snap(`incident-${Math.round(f * 100)}`); }
  await scrollSheets(0);
  await click('Dossier');
  await wait(1500);
  await snap('dossier-top');
  await sheetText();
  for (const f of [0.33, 0.66, 1]) { await scrollSheets(f); await snap(`dossier-${Math.round(f * 100)}`); }
  await scrollSheets(0);

  // The held inspection view: the same camera, a fresh capture, then the thermal illustration.
  await click('Workflow');
  await wait(800);
  await click('Inspect evidence');
  await wait(800);
  await click('Open inspection view');
  await wait(3500);
  await click('Capture RGB');
  await wait(5000);
  await snap('inspect-rgb');
  await say('inspection', '.inspection-hud');
  await click('Thermal illustration');
  await wait(3000);
  await snap('inspect-thermal');
  await click('Request another angle');
  await wait(6000);
  await snap('inspect-rgb-angle2');
  await say('inspection', '.inspection-hud');
  await click('Review evidence');
  await wait(1500);
  await snap('workflow-evidence');
  await sheetText();
  await scrollSheets(1); await snap('workflow-evidence-end'); await scrollSheets(0);
  await click('Electrical cutaway');
  await wait(1500);
  await snap('workflow-cutaway');
  await click('Two futures');
  await wait(1500);
  await snap('workflow-futures');
  await sheetText();
  await scrollSheets(1); await snap('workflow-futures-end'); await scrollSheets(0);
  await click('Repair & verify');
  await wait(1200);
  await snap('workflow-repair-before');
  await click('Approve and create work order');
  await wait(1200);
  await click('Dispatch simulated crew');
  await wait(1500);
  await snap('workflow-repair-dispatched');
  await sheetText();
  await click('Watch in the field');
  await wait(3000);
  await snap('repair-field-1');
  await click('Preview next stage');
  await wait(3000);
  await snap('repair-field-2');
  await say('repair', '.repair-hud');
  await screen('Queue');
  await snap('queue-after-approve');
}

await browser.close();
