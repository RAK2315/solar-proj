/**
 * ppt/build/shoot_deck.mjs — the deck's pictures, taken from the running product.
 *
 * Every picture in ppt/images/ is a capture of the app in real Chrome on the real
 * GPU. Nothing is composed or retouched. Re-run after a change that alters how
 * the product looks, then rebuild the deck with build_deck.cjs.
 *
 * The drone is flown at 60x on purpose: at 600x the flight camera lags its
 * spline and the detector is handed the wrong frame.
 */
//   npm run demo            (in another terminal; serves on :3000)
//   node ppt/build/shoot_deck.mjs [phase...]     phases: static sandbox flight
//   Raw captures go to SHOT_DIR (default ppt/build/raw); pick from there.
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
const click = async (name) => {
  const ok = await page.evaluate((n) => {
    const all = [...document.querySelectorAll('button, [role="button"], a')];
    const b = all.find((x) => ((x.getAttribute('aria-label') ?? x.textContent) ?? '').trim().startsWith(n));
    b?.click();
    return !!b;
  }, name);
  if (!ok) console.log(`  no control "${name}"`);
  return ok;
};
const screen = async (label) => { await page.click(`.sy-rail button:has-text("${label}")`); await wait(1200); };
const texts = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.textContent.replace(/\s+/g, ' ').trim()), sel);
const kpis = async () => console.log('  kpis:', JSON.stringify(await texts('.kpis div')));
const scrollSheets = (frac) => page.evaluate((f) => {
  for (const el of document.querySelectorAll('.sy-sheet, .sy *')) {
    if (el.scrollHeight > el.clientHeight + 8 && getComputedStyle(el).overflowY !== 'visible') el.scrollTop = (el.scrollHeight - el.clientHeight) * f;
  }
}, frac);
// ?twin=3d holds the 3D field: a screenshot stalls a frame, and the frame-rate
// watchdog would otherwise hand a followed flight to the 2D map.
const openConsole = async (query = '') => {
  await page.goto(`${BASE}/console${query}`, { waitUntil: 'load' });
  await page.waitForSelector('canvas', { state: 'attached', timeout: 30000 });
  await wait(2500);
  await page.keyboard.press('s');                   // the committed rehearsal state
  await wait(1200);
};

if (want('static')) {
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await wait(5000);
  await snap('landing');

  await openConsole();
  await kpis();
  await snap('site-3d');
  await page.selectOption('[aria-label="Select array"]', 'B-17');
  await wait(1200);
  await snap('site-b17-panel');
  await click('Show the field in 2D');
  await wait(1500);
  await snap('site-2d-b17');
  await click('Close the array panel');
  await wait(600);
  await snap('site-2d');
  await click('Show the field in 3D');
  await wait(1500);

  for (const s of ['Queue', 'Analytics', 'Drones']) {
    await screen(s);
    await snap(`${s.toLowerCase()}-top`);
    await scrollSheets(0.5); await snap(`${s.toLowerCase()}-mid`);
    await scrollSheets(1); await snap(`${s.toLowerCase()}-end`);
  }
  // The workings behind the ?, once, on the Queue screen.
  await screen('Queue');
  await page.keyboard.press('?');
  await wait(600);
  await snap('queue-workings');
  await page.keyboard.press('?');
}

if (want('sandbox')) {
  await openConsole();
  await screen('Sandbox');
  await snap('sandbox-rest');
  console.log('  queue at rest:', JSON.stringify(await texts('.q li')));
  const tool = await page.locator('button:has-text("Dust storm")').boundingBox();
  await page.mouse.move(tool.x + 40, tool.y + 16);
  await page.mouse.down();
  const target = { x: Math.round(W * 0.42), y: Math.round(H * 0.42) };
  await page.mouse.move(target.x - 120, target.y + 60, { steps: 12 });
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await wait(400);
  await snap('sandbox-dust-drag');
  await page.mouse.up();
  await wait(5000);
  await snap('sandbox-dust-dropped');
  console.log('  impact:', JSON.stringify(await texts('.impact')));
  console.log('  queue after:', JSON.stringify(await texts('.q li')));
  await scrollSheets(0.5); await snap('sandbox-dust-mid');
  await scrollSheets(1); await snap('sandbox-dust-end');
  await scrollSheets(0);
  await click('Heatwave');
  await wait(3000);
  await snap('sandbox-dust-heat');
  console.log('  impact:', JSON.stringify(await texts('.impact')));
  await screen('Queue');
  await snap('queue-after-hazards');
}

if (want('flight')) {
  await openConsole('?twin=3d');
  await page.selectOption('[aria-label="Select array"]', 'B-17');
  await wait(800);
  await click('Run site time at 60×');
  await click('Dispatch drone');
  for (let i = 1; i <= 16; i += 1) {
    await wait(2400);
    await snap(`flight-${String(i).padStart(2, '0')}`);
    if (i === 12) { await screen('Incident'); await snap('incident-during'); await screen('Site'); }
  }
  await kpis();
  await click('Back to the field');
  await click('Run site time at 1×');
  await wait(1500);
  await snap('site-b17-approve');
  await screen('Incident');
  await wait(6000);
  await snap('incident-top');
  await click('Dossier');
  await wait(1500);
  await snap('dossier-top');
  // What the detector said on this flight, as text, so the figure is read and not eyeballed.
  console.log('  detector:', JSON.stringify(await page.evaluate(() => document.body.innerText.split('\n').filter((l) => /detection|Run \d|clearest|found cracked|Nothing/i.test(l)))));
  for (const f of [0.2, 0.4, 0.6, 0.8, 1]) { await scrollSheets(f); await snap(`incident-${Math.round(f * 100)}`); }
  await scrollSheets(0);
  await page.keyboard.press('?');
  await wait(500);
  await snap('incident-workings');
  await page.keyboard.press('?');
  await screen('Site');
  await click('Approve work order');
  await wait(1200);
  await snap('site-b17-approved');
  await screen('Queue');
  await snap('queue-after-approve');
}

await browser.close();
