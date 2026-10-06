/**
 * scripts/check_layout.mjs — `npm run check:layout`
 *
 * Opens the console in a real browser at one viewport, walks every screen in both
 * themes, and fails when the layout or the type breaks a rule the design system
 * states as a rule.
 *
 * WHY THIS IS A SCRIPT AND NOT A TEST. jsdom has no layout: every element is 0x0
 * and every computed font size is whatever the stylesheet did not get to say. A
 * panel that overflows its sheet renders identically to one that fits. This is
 * looking, automatically.
 *
 * WHAT IT HOLDS THE CONSOLE TO, per screen (plan/rework/06-design-system.md):
 *
 *   TYPE      no text under 14 px
 *   CASE      no `text-transform: uppercase` anywhere
 *   MONO      the monospace face only on identifiers (`.id`)
 *   CLIPPED   no block wider than the sheet it sits in, and none taller than a
 *             sheet that cannot scroll
 *   FRAME     the rail and every sheet inside the viewport
 *   GLASS     the element that carries a sheet's glass never scrolls, so the
 *             text cannot leave the glass behind
 *   OVERLAP   no block of a sheet runs over the block after it
 *
 * Every screen is measured twice: as it opens, and again with each sheet
 * scrolled to its end. A sheet that only breaks once it is scrolled used to pass.
 *   CANVAS    the twin's canvas fills the viewport, and the landing page's too
 *
 * It also proves the console is alive: every step presses a real control, and a
 * control that is not there fails the run instead of being skipped.
 *
 *   node scripts/check_layout.mjs 1920 1080
 *   node scripts/check_layout.mjs 1366 768
 *
 * Needs the app served on :3000 (`npm run demo`).
 */

import { chromium } from 'playwright-core';

const BASE = process.env.CONSOLE_URL ?? 'http://localhost:3000/console';
const W = Number(process.argv[2] ?? 1366);
const H = Number(process.argv[3] ?? 768);

/** The design system's floor. */
const MIN_FONT_PX = 14;
/** Sub-pixel rounding and glyph overhang are not layout faults. */
const TOLERANCE = 2;

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  // A software renderer, so this runs anywhere. It is far below the frame budget,
  // which is why the URL below tells the twin's watchdog to stand down.
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`page error: ${e.message.slice(0, 200)}`));

await page.goto(`${BASE}?twin=3d`, { waitUntil: 'load' });
await page.waitForSelector('.sy-rail', { timeout: 60000 });
await page.waitForSelector('canvas', { state: 'attached', timeout: 60000 });

/** Press a control by its accessible name, and fail loudly when it is not there. */
const press = async (...names) => {
  for (const name of names) {
    const hit = await page.evaluate((n) => {
      const all = [...document.querySelectorAll('button, [role="button"]')];
      const b = all.find((x) => ((x.getAttribute('aria-label') ?? x.textContent) ?? '').trim().startsWith(n));
      b?.click();
      return !!b;
    }, name);
    if (hit) return;
  }
  throw new Error(`no control matching ${names.map((n) => `"${n}"`).join(' or ')}`);
};

/**
 * Wait for the screen to stop moving. Under a software renderer a CSS animation
 * may not advance during a fixed wait, and a measurement taken mid-rise reads a
 * panel six pixels from where it will be.
 */
const settle = () => page.waitForFunction(
  () => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  null, { timeout: 15000 },
);

const measure = () => page.evaluate(({ minFont, tol }) => {
  const faults = [];
  const root = document.querySelector('.sy');
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const name = (el) => {
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${cls} "${text}"`;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);

  for (const el of root.querySelectorAll('*')) {
    if (!visible(el) || el.closest('.sy-anchors') || el.tagName === 'OPTION') continue;
    const cs = getComputedStyle(el);
    if (cs.textTransform === 'uppercase') faults.push(`CASE  uppercase on ${name(el)}`);
    if (!ownText(el)) continue;
    const size = parseFloat(cs.fontSize);
    if (size < minFont) faults.push(`TYPE  ${size}px on ${name(el)}`);
    if (/mono/i.test(cs.fontFamily.split(',')[0]) && !el.closest('.id')) {
      faults.push(`MONO  monospace outside an identifier: ${name(el)}`);
    }
  }

  const scrolls = (el) => /auto|scroll/.test(getComputedStyle(el).overflowY);
  // The stage's glass is a pseudo-element pinned to its box. If the stage itself
  // scrolls, its content moves and the glass does not.
  for (const stage of root.querySelectorAll('.sy-stage')) {
    if (!visible(stage)) continue;
    if (scrolls(stage) || stage.scrollTop !== 0) faults.push(`GLASS ${name(stage)} scrolls, so its text leaves the glass behind`);
    const s = stage.getBoundingClientRect();
    for (const sheet of stage.querySelectorAll('.sy-sheet')) {
      const r = sheet.getBoundingClientRect();
      if (r.top < s.top - tol || r.bottom > s.bottom + tol || r.left < s.left - tol || r.right > s.right + tol) {
        faults.push(`GLASS ${name(sheet)} is not inside the glass it sits on`);
      }
    }
  }
  // A block squeezed below its content keeps its box and spills its text over
  // the next one. Nothing is clipped and nothing leaves the frame, so only this
  // catches it.
  for (const sheet of root.querySelectorAll('.sy-sheet')) {
    // Measured as the block's own overflow, so a list that scrolls inside the
    // block is counted at the height it shows and not the height it holds.
    for (const blk of [...sheet.querySelectorAll(':scope > .blk, :scope > .col > .blk')].filter(visible)) {
      const spill = blk.scrollHeight - blk.clientHeight;
      if (spill > tol) faults.push(`OVERLAP ${name(blk)} holds ${spill}px more than its own height, over the block below`);
    }
  }
  for (const frame of root.querySelectorAll('.sy-rail, .sy-stage, .sy-sheet, .sy-left > *, .sy-flightbar, .sy-land, .sy-stats')) {
    if (!visible(frame)) continue;
    const r = frame.getBoundingClientRect();
    if (r.left < -tol || r.top < -tol || r.right > vw + tol || r.bottom > vh + tol) {
      faults.push(`FRAME ${name(frame)} leaves the viewport: ${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)}`);
    }
    if (!scrolls(frame) && frame.scrollHeight - frame.clientHeight > tol + 10) {
      faults.push(`CLIPPED ${name(frame)} holds ${frame.scrollHeight - frame.clientHeight}px more than it shows and cannot scroll`);
    }
    for (const el of frame.querySelectorAll('.blk, .blk-bd > *, .tool, .approve, .chip')) {
      if (!visible(el)) continue;
      const e = el.getBoundingClientRect();
      if (e.right > r.right + tol || e.left < r.left - tol) {
        faults.push(`CLIPPED ${name(el)} is wider than its sheet by ${Math.round(Math.max(e.right - r.right, r.left - e.left))}px`);
      }
      if (el.scrollWidth - el.clientWidth > tol && !/auto|scroll/.test(getComputedStyle(el).overflowX)
        && getComputedStyle(el).textOverflow !== 'ellipsis' && el.clientWidth > 0) {
        faults.push(`CLIPPED ${name(el)} holds ${el.scrollWidth - el.clientWidth}px more than its width`);
      }
    }
  }

  const canvas = document.querySelector('.sy-twin canvas, .sy-landscene canvas');
  if (canvas) {
    const c = canvas.getBoundingClientRect();
    const cover = (c.width * c.height) / (vw * vh);
    if (cover < 0.98) faults.push(`CANVAS covers ${Math.round(cover * 100)}% of the viewport`);
  } else {
    faults.push('CANVAS the twin is not in the document');
  }
  return [...new Set(faults)];
}, { minFont: MIN_FONT_PX, tol: TOLERANCE });

/**
 * A canvas is 300 by 150 for the instant between being attached and being sized
 * by its renderer. Measuring in that instant reports a canvas covering 4 % of the
 * viewport, which is a fact about the instant and not about the page. This waits
 * for the sizing, and gives up quietly so a canvas that never fills the viewport
 * is still reported by the measurement itself.
 */
const canvasSized = () => page.waitForFunction(() => {
  const c = document.querySelector('.sy-twin canvas, .sy-landscene canvas');
  return c && c.getBoundingClientRect().width >= window.innerWidth * 0.98;
}, null, { timeout: 15000 }).catch(() => {});

/** Scroll everything that can scroll to one end. Returns how many elements moved. */
const scrollAll = (toEnd) => page.evaluate((end) => {
  let moved = 0;
  for (const el of document.querySelectorAll('.sy *')) {
    if (el.scrollHeight - el.clientHeight <= 1) continue;
    if (!/auto|scroll/.test(getComputedStyle(el).overflowY)) continue;
    const before = el.scrollTop;
    el.scrollTop = end ? el.scrollHeight : 0;
    if (el.scrollTop !== before) moved += 1;
  }
  return moved;
}, toEnd);

const faults = [];
const check = async (label) => {
  await settle();
  for (const f of await measure()) faults.push(`${label}  ${f}`);
  if (await scrollAll(true) > 0) {
    for (const f of await measure()) faults.push(`${label}, scrolled to the end  ${f}`);
    await scrollAll(false);
  }
};

/* The committed rehearsal state, with B-17 selected, flown and inspected, so the
   densest version of every screen is the one that gets measured. */
await page.keyboard.press('s');
await page.selectOption('[aria-label="Select array"]', 'B-17');
await check('dark/Site, selected');
await press('Dispatch drone');
await check('dark/Site, following a flight');
await press('Run site time at 600');
await page.waitForFunction(
  () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim().startsWith('Approve work order')),
  null, { timeout: 180000 },
);
await press('Run site time at 60');
await press('Pause site clock');
await press('Back to the field');

const SCREENS = ['Site', 'Incident', 'Queue', 'Analytics', 'Drones', 'Sandbox'];
for (const theme of ['dark', 'light']) {
  if (theme === 'light') await press('Switch to light theme');
  for (const screen of SCREENS) {
    await press(screen);
    await check(`${theme}/${screen}`);
    if (screen === 'Incident') {
      await press('Dossier');
      await check(`${theme}/Dossier`);
      await press('Summary');
    }
  }
  await press('Site');
  await press('Show the working', 'Hide the working');
  await check(`${theme}/Site, working shown`);
  await press('Show the working', 'Hide the working');
}
await press('Switch to dark theme');

/* The hero's state: a dropped hazard, and one in the hand. It is run from the
   sandbox, the only screen that carries the hazard tools. */
await press('Sandbox');
await press('Heatwave');
await press('Dust storm');
await check('dark/Sandbox, hazard held');
await page.keyboard.press('Escape');

/* The 2D map by the operator's own choice, with the hazards still in force. */
await press('Site');
await press('Show the field in 2D');
await page.waitForSelector('.sy-map', { timeout: 20000 });
await settle();
for (const f of await measure()) {
  if (!f.startsWith('CANVAS')) faults.push(`dark/2D by choice  ${f}`);
}
await press('Show the field in 3D');
await page.waitForSelector('canvas', { state: 'attached', timeout: 60000 });
await canvasSized();
await check('dark/Site, back in 3D');

/* The 2D fallback has the same frame and the same rules, minus the canvas. */
await page.goto(`${BASE}?twin=2d`, { waitUntil: 'load' });
await page.waitForSelector('.sy-map', { timeout: 60000 });
await settle();
for (const f of await measure()) {
  if (!f.startsWith('CANVAS')) faults.push(`dark/2D fallback  ${f}`);
}

/* The landing page is held to the same type and frame rules. */
await page.goto(BASE.replace(/\/console$/, '/'), { waitUntil: 'load' });
await page.waitForSelector('.sy-land', { timeout: 60000 });
await page.waitForSelector('canvas', { state: 'attached', timeout: 60000 });
await canvasSized();
await check('landing');

await browser.close();

for (const e of errors) console.log(`  ${e}`);
if (faults.length || errors.length) {
  console.log(`\ncheck:layout at ${W}x${H}: ${faults.length} faults\n`);
  for (const f of faults) console.log(`  ${f}`);
  process.exit(1);
}
console.log(`check:layout at ${W}x${H}: every screen in both themes holds the type floor, sentence case, mono for identifiers only, and fits its frame.`);
