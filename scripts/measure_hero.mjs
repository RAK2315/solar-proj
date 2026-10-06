/**
 * scripts/measure_hero.mjs — `npm run measure:hero`
 *
 * Drives the hero moment with a real pointer in real Chrome and prints what the
 * plan asks to be MEASURED, not asserted (plan/rework/01-hero.md R1, R2):
 *
 *   drop to replan    from the pointer release to the commit that shows the plan
 *                     re-derived, and to the next painted frame. Budget 150 ms.
 *   frame rate        idle with a footprint in force, and with one in the hand.
 *
 * It also walks the non-happy paths the plan names: seek back past the drop, a
 * heatwave, and a reset with a footprint still held.
 *
 * It opens a visible window on purpose. Headless Chrome on a software renderer
 * measures the software renderer.
 */
//   node scripts/measure_hero.mjs <width> <height>      needs the app on :3000
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [w = '1366', h = '768'] = process.argv.slice(2);
const OUT = process.env.SHOT_DIR ?? join(tmpdir(), 'surya-shots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false, args: ['--ignore-gpu-blocklist', '--enable-gpu'],
});
const page = await (await browser.newContext({ viewport: { width: +w, height: +h } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 300)}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 300)}`); });

await page.goto('http://localhost:3000/console', { waitUntil: 'load' });
await page.waitForSelector('canvas', { state: 'attached', timeout: 30000 });
await page.waitForTimeout(2500);
const snap = (name) => page.screenshot({ path: `${OUT}/hero-${w}-${name}.png` });
const text = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.textContent.replace(/\s+/g, ' ').trim()), sel);

await page.keyboard.press('s');                    // the committed rehearsal state
await page.waitForTimeout(1200);
await snap('1-rest');
console.log('queue at rest:', JSON.stringify(await text('.q li .pick')));

// Arm for the measurement: note the release, then the first commit that shows the impact line.
await page.evaluate(() => {
  window.__t = {};
  window.addEventListener('pointerup', () => { window.__t.up = performance.now(); }, true);
  new MutationObserver(() => {
    if (window.__t.up && !window.__t.commit && document.querySelector('.impact')) {
      window.__t.commit = performance.now();
      requestAnimationFrame(() => { window.__t.frame = performance.now(); });
    }
  }).observe(document.body, { childList: true, subtree: true });
});

// Press the dust tool and carry it onto the field without letting go.
const tool = await page.locator('button:has-text("Dust storm")').boundingBox();
await page.mouse.move(tool.x + 40, tool.y + 16);
await page.mouse.down();
const target = { x: Math.round(+w * 0.42), y: Math.round(+h * 0.42) };
await page.mouse.move(target.x - 120, target.y + 60, { steps: 12 });
await page.mouse.move(target.x, target.y, { steps: 12 });
await page.waitForTimeout(400);
await snap('2-drag');
await page.mouse.up();
await page.waitForTimeout(250);
const t = await page.evaluate(() => window.__t);
console.log(`drop to commit: ${(t.commit - t.up).toFixed(1)} ms, to next frame: ${(t.frame - t.up).toFixed(1)} ms`);
await page.waitForTimeout(5000);                   // the 3-minute ramp at 60x is 3 s
await snap('3-dropped');
console.log('impact:', JSON.stringify(await text('.impact')));
console.log('queue after:', JSON.stringify(await text('.q li .pick')));

// Frame rate with the footprint in force, idle and with a second one in hand.
const fps = () => page.evaluate(() => new Promise((res) => {
  let n = 0; let slow = 0; let last = performance.now(); const t0 = last;
  const tick = (now) => { n += 1; if (now - last > 20) slow += 1; last = now; if (now - t0 < 4000) requestAnimationFrame(tick); else res({ fps: +(n / ((now - t0) / 1000)).toFixed(1), over20ms: slow }); };
  requestAnimationFrame(tick);
}));
console.log('fps idle:', JSON.stringify(await fps()));
{
  const c = await page.locator('button:has-text("Cloud bank")').boundingBox();
  await page.mouse.move(c.x + 40, c.y + 16);
  await page.mouse.down();
  const run = fps();
  for (let i = 0; i < 60; i += 1) await page.mouse.move(target.x + Math.sin(i / 6) * 160, target.y + 90 + Math.cos(i / 6) * 70, { steps: 4 });
  console.log('fps dragging:', JSON.stringify(await run));
  await page.keyboard.press('Escape');
  await page.mouse.up();
}

// Seek backwards past the drop: the hazard must un-happen.
await page.evaluate(() => { const r = document.querySelector('input[type=range]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(r, '600'); r.dispatchEvent(new Event('input', { bubbles: true })); });
await page.waitForTimeout(150);
console.log('after seeking to before the drop, impact:', JSON.stringify(await text('.impact')), 'queue:', JSON.stringify(await text('.q li .job .id')));

// Heatwave, then reset mid-drag.
await page.keyboard.press('s');
await page.waitForTimeout(400);
await page.click('button:has-text("Heatwave")');
await page.waitForTimeout(2500);
console.log('heatwave impact:', JSON.stringify(await text('.impact')));
await snap('4-heatwave');
const cloud = await page.locator('button:has-text("Cloud bank")').boundingBox();
await page.mouse.move(cloud.x + 40, cloud.y + 16);
await page.mouse.down();
await page.mouse.move(target.x, target.y + 80, { steps: 10 });
await page.keyboard.press('r');                    // reset with the footprint in hand
await page.waitForTimeout(300);
await page.mouse.up();
await page.waitForTimeout(600);
console.log('after reset mid-drag:', JSON.stringify(await page.evaluate(() => ({
  dragging: document.querySelector('.sy').dataset.dragging,
  impact: !!document.querySelector('.impact'),
  time: document.querySelector('.kpis dd').textContent,
}))));
await snap('5-reset');

for (const e of errors) console.log(e);
await browser.close();
