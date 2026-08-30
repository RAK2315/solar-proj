/**
 * scripts/shots.mjs — `node scripts/shots.mjs [width] [height]`
 *
 * Photographs every screen, in both themes, at a real laptop size, and writes
 * them to docs/shots/. This is how the clutter gets judged: by looking at it at
 * the size somebody will actually see it, not at 1920x1080 where everything fits.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const W = Number(process.argv[2] ?? 1512);
const H = Number(process.argv[3] ?? 900);
mkdirSync('docs/shots', { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
});
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message.slice(0, 200)));

await page.goto('http://localhost:3000/console', { waitUntil: 'load' });
await page.waitForFunction(() => !document.body.innerText.includes('NOT READY'), null, { timeout: 20000 });

/**
 * Press a control by its accessible name.
 *
 * `[role="button"]` as well as `button`: the map's 120 arrays are divs with a
 * role, and after a cut to the cinematic the console survives only inside the
 * aria-hidden PiP where a real click would be intercepted. Dispatching the event
 * reaches both.
 */
const press = async (name) => page.evaluate((n) => {
  const all = [...document.querySelectorAll('button, [role="button"]')];
  const b = all.find((x) => ((x.getAttribute('aria-label') ?? x.textContent) ?? '').trim().startsWith(n));
  b?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}, name);

// Run the site forward so faults exist.
await press('Run site time at 600');
await page.waitForTimeout(7000);
await press('Run site time at 60');

for (const theme of ['dark', 'light']) {
  if (theme === 'light') { await press('Switch to light theme'); await page.waitForTimeout(500); }

  await press('Array B-17');
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `docs/shots/${theme}-site.png` });

  // The incident file, which is where the argument lives.
  await press('Open inspection dossier');
  await press('Open incident file');
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `docs/shots/${theme}-dossier.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  for (const screen of ['Drones', 'Missions', 'Repairs', 'Analytics', 'Rehearsal']) {
    await press(screen);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `docs/shots/${theme}-${screen.toLowerCase()}.png` });
  }
  await press('Site');
  await page.waitForTimeout(600);
}
console.log(`shots written at ${W}x${H}`);
await browser.close();
