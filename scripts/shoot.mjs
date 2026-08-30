/**
 * scripts/shoot.mjs — `npm run shoot -- <array-id> [siteHour] [sceneT]`
 *
 * A browser, locally, at last.
 *
 * Every visual bug in the last two sessions reached the owner's screen instead of
 * this machine: the tests are pure functions of `t` and they cannot see a panel
 * glowing as one rectangle, a label hanging in mid-air, or a stylesheet that 404'd.
 * This drives the real console in the real Chrome that is already installed —
 * playwright-core, no browser download, no second engine to keep current — and
 * writes a PNG of the cinematic at a chosen moment.
 *
 * It clicks the actual controls rather than reaching into the stores, so what it
 * proves is what an operator would see. If a selector here breaks, a control the
 * operator uses has changed, and that is worth knowing.
 *
 *   npm run shoot -- B-17           the measured band, on the one array that has one
 *   npm run shoot -- A-31           the illustrated crack path, on an array that does not
 *   npm run shoot -- A-08 14 44     a soiled array before the thermal pass
 *
 * Needs `npm run dev` up. Writes to docs/shots/.
 */

import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

const BASE = process.env.SHOOT_BASE ?? 'http://localhost:3000';
const OUT = 'docs/shots';

const [panelId = 'B-17', siteHourArg = '14', sceneTArg = '53'] = process.argv.slice(2);
const siteHour = Number(siteHourArg);
const sceneT = Number(sceneTArg);

/** Scene seconds -> site seconds elapsed. Mirrors flightTAt in store/flightCue.ts. */
const DISPATCH_T = 18;
const SITE_SECONDS_PER_CINEMATIC_SECOND = 60;
/** The day scrub's step, in site seconds. Mirrors TimeControl.tsx. */
const SCRUB_STEP = 900;
const elapsedFor = (t) => (t - DISPATCH_T) * SITE_SECONDS_PER_CINEMATIC_SECOND;

/** Where Chrome is. No download — this reuses the one already on the machine. */
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  throw new Error('No Chrome or Edge found. Set CHROME_PATH.');
}

/**
 * Set a React-controlled <input> without pretending to be a mouse.
 *
 * Dragging a range handle by pixels lands wherever the step lattice puts it; the
 * scrub steps in 15-minute jumps, which cannot express "53 seconds into the scene".
 * Writing through the native setter and firing `input` is what React itself
 * listens for, so the store sees exactly the second asked for.
 */
const setRange = (el, value) => {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(value));
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

/**
 * Has React taken over the server-rendered markup?
 *
 * Asked of the map, because the map is the thing this script clicks. A `<g>` that
 * React owns carries a fiber key; one that is still inert HTML does not.
 */
const isHydrated = (page) => page.evaluate(() => {
  const g = document.querySelector('[aria-label^="Array "]');
  return Boolean(g) && Object.keys(g).some((k) => k.startsWith('__react'));
});

/**
 * Load the console, and RELOAD UNTIL IT IS ALIVE.
 *
 * The dev server intermittently truncates `chunks/app/layout.js` — it arrives at
 * 458 KB or 655 KB instead of 1.45 MB, roughly one load in two. The chunk is one
 * 1.1 MB line, `JSON.parse('...telemetry...')`, so a truncated body is an
 * unterminated string literal: the browser throws `SyntaxError: Invalid or
 * unexpected token`, hydration never runs, and the page still LOOKS completely
 * correct because the server-rendered markup is all there. Nothing responds to a
 * click, which is exactly the failure that wasted the first hour of this script.
 *
 * Retrying is the fix here rather than the diagnosis. The real question — why a
 * 1.1 MB telemetry blob is in the client bundle at all — belongs in the backlog.
 */
async function load(page, attempts = 6) {
  for (let i = 1; i <= attempts; i += 1) {
    // `networkidle` never settles: the dev server holds an HMR socket open and the
    // console keeps a rAF running. Wait on the console's own furniture instead.
    await page.goto(`${BASE}/console`, { waitUntil: 'domcontentloaded' });
    for (let w = 0; w < 12; w += 1) {
      if (await isHydrated(page)) return;
      await page.waitForTimeout(1000);
    }
    console.error(`shoot — load ${i} never hydrated (truncated chunk); reloading`);
  }
  throw new Error('console never hydrated. Is `npm run dev` up?');
}

/** The cinematic's own `T+MM:SS`, in seconds, or null if it is not on screen. */
async function timecodeSeconds(page) {
  const text = await page.getByText(/^T\+\d\d:\d\d$/).first().innerText()
    .catch(() => null);
  if (!text) return null;
  const [, mm, ss] = text.match(/T\+(\d\d):(\d\d)/);
  return Number(mm) * 60 + Number(ss);
}

/** Let the site clock run until the cinematic reaches `target` seconds. */
async function waitForTimecode(page, target, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const now = await timecodeSeconds(page);
    if (now !== null && now >= target) return now;
    if (Date.now() > deadline) {
      throw new Error(`timecode stuck at ${now}s, wanted ${target}s`);
    }
    await page.waitForTimeout(250);
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: findChrome(),
    // SwiftShader, so the scene renders the same way whether or not this machine
    // has a GPU available to a headless process. Slower; deterministic.
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-lcd-text'],
  });
  // 1920x1080 because that is what CLAUDE.md §3 fixes the console at.
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(String(e)));

  await load(page);

  // Stop the site clock first, or every later step is racing it.
  await page.getByRole('button', { name: /Pause the site clock/ }).click({ timeout: 60_000 });

  // By element rather than by accessible name: the scrub's label is an .sr-only
  // span, and there is exactly one range input on the console.
  const scrub = page.locator('input[type="range"]').first();
  const startSeconds = siteHour * 3600;
  await scrub.evaluate(setRange, startSeconds);

  // Select the array on the map, exactly as an operator does.
  await page.locator(`[aria-label^="Array ${panelId},"]`).first().click();

  const dispatch = page.getByRole('button', { name: new RegExp(`DISPATCH DRONE . ${panelId}`) });
  await dispatch.click();

  // Forward to the requested point on the scene's timeline, in two moves.
  //
  // The scrub steps in 15-minute jumps and a range input SNAPS to its own step
  // lattice however you write to it, so it can only express scene seconds
  // 18, 33, 48, 63 — which misses the whole thermal window except its first frame,
  // where the fade is still at zero. So: jump to the lattice point below the mark,
  // then let the site clock run the remainder at 60x, where one real second is one
  // scene second.
  const elapsed = elapsedFor(sceneT);
  const jump = Math.max(0, Math.floor(elapsed / SCRUB_STEP) * SCRUB_STEP);
  await scrub.evaluate(setRange, startSeconds + jump);

  /**
   * Press a control by aria-label, through the DOM rather than the mouse.
   *
   * Two reasons, both of them consequences of the cut to the cinematic. The
   * console survives only inside the PiP, which is aria-hidden — so `getByRole`
   * cannot see any of it, and an attribute selector has to stand in for the
   * accessible name. And what is left is drawn at 0.31 scale behind overlays, so
   * a real mouse click would be intercepted. React listens for a bubbling click
   * at the root; this is the same event it would receive from the pointer.
   */
  const press = (label) =>
    page.locator(`[aria-label="${label}"]`).first().dispatchEvent('click');

  if (elapsed > jump) {
    // 600x, not 60x. The rAF clamp means each frame is worth at most 0.1 s of
    // real time, so the site clock advances at (frame rate x 0.1 x scale) — and
    // SwiftShader renders the field at well under a frame a second. At 60x that is
    // slower than real time; at 600x a frame is worth at most one scene second,
    // which is fine against an 8-second thermal window.
    await press('Run site time at 600× real time');
    await press('Resume the site clock');
    // POLL, do not wait a wall-clock interval.
    //
    // The one rAF loop clamps dt to 0.1 s per frame to stop a backgrounded tab
    // teleporting past the beats. Under SwiftShader the scene renders at a few
    // frames a second, so the clock advances at a few tenths of a second per real
    // second — waiting `remainder` seconds lands nowhere near `remainder` seconds
    // of site time. Watching the readout is frame-rate independent, and it is also
    // the same number the operator would be reading.
    await waitForTimecode(page, sceneT - DISPATCH_T);
    await press('Pause the site clock');
  }

  // Let the canvas actually draw a few frames under SwiftShader before capturing.
  await page.locator('canvas').first().waitFor({ state: 'visible' });
  await page.waitForTimeout(2500);

  // Report where it ACTUALLY landed. The last leg is wall-clock timed, so it drifts
  // by a fraction of a second, and a shot that silently missed the thermal window
  // is the kind of thing this script exists to stop happening.
  const landed = await page.getByText(/^T\+\d\d:\d\d$/).first()
    .innerText().catch(() => '(no timecode)');

  const file = `${OUT}/${panelId}-t${sceneT}.png`;
  await page.screenshot({ path: file });
  console.log(`shoot — ${file}  (${panelId}, site ${siteHour}:00, asked t=${sceneT}s, timecode ${landed})`);
  if (problems.length) {
    console.error('\nbrowser reported:');
    for (const p of problems.slice(0, 10)) console.error(`  ${p}`);
  }

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
