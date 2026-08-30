/**
 * scripts/check_live.mjs — `npm run check:live [loads]`
 *
 * Loads the console in a real browser, several times, and asserts that it is
 * actually ALIVE on every one of them.
 *
 * WHY THIS SCRIPT EXISTS. The console is server-rendered, so a page whose
 * JavaScript never ran looks completely correct: every number is present, every
 * panel is drawn, the layout is perfect, and nothing responds to a click. No unit
 * test can see that — they render components in jsdom, where there is no bundle to
 * fail. It reached the owner's screen instead, twice.
 *
 * The specific failure was data/telemetry.json shipping whole into the client
 * bundle, where the dev server truncated it on roughly one load in two. That is
 * fixed (src/lib/telemetryPack.ts), and this is the check that keeps it fixed —
 * along with any other hydration break, which produces exactly the same silent
 * symptom.
 *
 * It checks three things, in increasing order of strength:
 *
 *   1. no page error was thrown during load
 *   2. the liveness chip is not stuck at NOT READY   (React attached)
 *   3. a real click on a real control changes the screen   (the app responds)
 *
 * Needs `npm run dev` up. Exits non-zero on the first dead load.
 */

import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const BASE = process.env.SHOOT_BASE ?? 'http://localhost:3000';
const LOADS = Number(process.argv[2] ?? 6);

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

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

const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const failures = [];

console.log(`\n${BOLD}check:live${OFF} — is the console actually awake? ${DIM}${LOADS} loads of ${BASE}/console${OFF}\n`);

for (let i = 1; i <= LOADS; i += 1) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  let verdict;
  try {
    await page.goto(`${BASE}/console`, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // 1 + 2. The liveness chip flips only from an effect, so waiting for it to
    // stop saying NOT READY is waiting for hydration itself.
    await page.waitForFunction(
      () => !document.body.innerText.includes('NOT READY'),
      null,
      { timeout: 15_000 },
    );

    // 3. The strongest check: press something an operator presses and see the
    // screen change. `M` is the mode switch, handled by the one key listener —
    // if that responds, React is attached and the stores are wired.
    const before = await page.locator('.area-header').first().innerText();
    await page.keyboard.press('m');
    await page.waitForFunction(
      (prev) => document.querySelector('.area-header')?.textContent !== prev,
      before,
      { timeout: 5_000 },
    );

    verdict = errors.length
      ? { ok: false, why: `page error: ${errors[0].slice(0, 120)}` }
      : { ok: true };
  } catch (err) {
    verdict = {
      ok: false,
      why: errors.length
        ? `page error: ${errors[0].slice(0, 120)}`
        : `did not become interactive: ${String(err).split('\n')[0].slice(0, 120)}`,
    };
  }

  if (verdict.ok) {
    console.log(`  ${GREEN}✓${OFF} load ${String(i).padStart(2)}  ${DIM}awake and responding${OFF}`);
  } else {
    console.log(`  ${RED}✗${OFF} load ${String(i).padStart(2)}  ${RED}${verdict.why}${OFF}`);
    failures.push(i);
  }

  await context.close();
}

await browser.close();

if (failures.length) {
  console.log(`\n${RED}${BOLD}DEAD ON ${failures.length}/${LOADS} LOADS${OFF} ${DIM}(loads ${failures.join(', ')})${OFF}`);
  console.log(`${DIM}A page that renders and ignores every click is the worst failure to have`);
  console.log(`in front of an audience. Do not demo until this is 0.${OFF}\n`);
  process.exit(1);
}

console.log(`\n${GREEN}${BOLD}awake on all ${LOADS} loads.${OFF}\n`);
