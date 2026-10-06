/**
 * scripts/shoot.mjs — capture the console in real Chrome, one step at a time.
 *
 * For looking at a change. It asserts nothing: `npm run check:layout` is the gate.
 * `gpu` opens a real window on the real GPU, which is the only way to see what an
 * operator sees; `sw` is headless on a software renderer, where CSS animation may
 * not advance and a capture can catch a panel mid-rise.
 *
 * Needs the app served on :3000. Captures go to SHOT_DIR, or the system temp dir.
 */
//   node scripts/shoot.mjs <out-prefix> <width> <height> [gpu|sw] [steps...]
// Steps: screen:<Label> select:<ID> theme wait:<ms> click:<aria-or-text> eval:<js> snap:<name>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [prefix = 'p1', w = '1366', h = '768', gl = 'gpu', ...steps] = process.argv.slice(2);
const OUT = process.env.SHOT_DIR ?? join(tmpdir(), 'surya-shots');
mkdirSync(OUT, { recursive: true });

const args = gl === 'sw'
  ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : ['--ignore-gpu-blocklist', '--enable-gpu'];
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: gl === 'sw', args,
});
const page = await (await browser.newContext({ viewport: { width: +w, height: +h } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 300)}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 300)}`); });

const url = process.env.URL ?? `http://localhost:3000/console${gl === 'sw' ? '?twin=3d' : ''}`;
await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('.sy-rail', { timeout: 30000 });
await page.waitForTimeout(2500);

const click = async (name) => {
  const ok = await page.evaluate((n) => {
    const all = [...document.querySelectorAll('button, [role="button"], a')];
    const b = all.find((x) => ((x.getAttribute('aria-label') ?? x.textContent) ?? '').trim().startsWith(n));
    b?.click();
    return !!b;
  }, name);
  if (!ok) throw new Error(`no control "${name}"`);
};

let n = 0;
const snap = async (label) => {
  n += 1;
  const file = `${OUT}/${prefix}-${String(n).padStart(2, '0')}-${label}.png`;
  await page.screenshot({ path: file });
  console.log(file);
};

for (const step of steps) {
  const [kind, ...rest] = step.split(':');
  const arg = rest.join(':');
  if (kind === 'screen' || kind === 'click') await click(arg);
  else if (kind === 'select') await page.selectOption('[aria-label="Select array"]', arg);
  else if (kind === 'theme') await click('Switch to');
  else if (kind === 'wait') await page.waitForTimeout(+arg);
  else if (kind === 'eval') console.log(JSON.stringify(await page.evaluate(arg)));
  else if (kind === 'snap') { await page.waitForTimeout(700); await snap(arg || 'shot'); }
}
if (!steps.some((s) => s.startsWith('snap'))) { await page.waitForTimeout(700); await snap('final'); }

for (const e of errors) console.log(e);
await browser.close();
