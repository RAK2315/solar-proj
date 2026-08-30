/**
 * scripts/check_layout.mjs — `npm run check:layout`
 *
 * Measures every screen in a real browser and fails when a box is smaller than
 * what is inside it.
 *
 * WHY THIS IS A SCRIPT AND NOT A TEST. jsdom has no layout: every element is
 * 0x0, so a component whose content overflows its box renders identically to one
 * that fits and 507 unit tests stay green through it. This bug has now shipped
 * twice — the module bodies in Phase 19, where a slab holding 400px sat in a
 * 135px row and painted over the block beneath, and the site KPI strip in Phase
 * 22, whose cells measured 137px inside a 118px row and spilled the anomaly bars
 * down over the map. Both were found by looking. This is looking, automatically.
 *
 * It reports OVERFLOW (content taller than a box that does not scroll) and SPILL
 * (something painting outside the console shell). Scrollable containers are
 * exempt: a scroll region is meant to be taller than its box.
 */

import { chromium } from 'playwright-core';

const URL = process.env.CONSOLE_URL ?? 'http://localhost:3000/console';
const W = Number(process.argv[2] ?? 1512);
const H = Number(process.argv[3] ?? 900);

/**
 * Under this many pixels is not a layout fault.
 *
 * A display figure set at line-height 1.0 reports 6-7px of `scrollHeight` over
 * its `clientHeight` from glyph metrics alone — the descender of a font is
 * outside its line box by design. Both real instances of this bug were an order
 * of magnitude larger: +19px for the KPI strip, +265px for the module bodies.
 */
const TOLERANCE = 12;

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`page error: ${e.message.slice(0, 160)}`));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(
  () => !document.body.innerText.includes('NOT READY'), null, { timeout: 30000 },
);

/**
 * Press a control, and fail loudly when it is not there.
 *
 * The return value used to be discarded at every call site, so a renamed label
 * meant the script measured the previous screen and still printed "every box
 * fits what is inside it, both themes, six screens". A gate that cannot tell you
 * it did not run is worse than no gate.
 */
const press = async (...names) => {
  for (const name of names) {
    const hit = await page.evaluate((n) => {
      const all = [...document.querySelectorAll('button, [role="button"]')];
      const b = all.find((x) => ((x.getAttribute('aria-label') ?? x.textContent) ?? '').trim().startsWith(n));
      b?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return !!b;
    }, name);
    if (hit) return;
  }
  throw new Error(`no control matching ${names.map((n) => `"${n}"`).join(' or ')}`);
};

const measure = (tolerance) => page.evaluate((tol) => {
  const scrolls = (cs) => /auto|scroll/.test(cs.overflow + cs.overflowY + cs.overflowX);
  const name = (el) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 44);
    return `${el.tagName.toLowerCase()}${cls ? `.${cls.split(/\s+/).join('.')}` : ''} "${text}"`;
  };

  const out = { overflow: [], spill: [] };
  // The console draws at a fixed 1920x1080 and is SCALED into the window, so the
  // shell itself is legitimately taller than its clipped box. Everything inside
  // it is measured against its own parent instead.
  const shell = document.querySelector('.console-root') ?? document.body;

  for (const el of shell.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.position === 'fixed') continue;
    if (scrolls(cs)) continue;
    if (el.clientHeight < 24) continue;
    // Only containers. A text node overflowing its own span is typography;
    // a BOX overflowing and painting over the thing beneath it is the bug.
    if (!el.firstElementChild) continue;
    const over = el.scrollHeight - el.clientHeight;
    if (over > tol) out.overflow.push({ el: name(el), over });
  }

  // Inside a scroll region, extending past the shell is how scrolling works.
  // Only content in a box that CANNOT scroll is painting where nobody can reach
  // it — which is the KPI strip's anomaly bars over the map.
  const inScrollRegion = (el) => {
    for (let p = el.parentElement; p && p !== shell.parentElement; p = p.parentElement) {
      if (scrolls(getComputedStyle(p))) return true;
    }
    return false;
  };

  const sr = shell.getBoundingClientRect();
  for (const el of shell.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.position === 'fixed') continue;
    if (inScrollRegion(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 2 || r.width < 2) continue;
    const below = r.bottom - sr.bottom;
    const right = r.right - sr.right;
    if (below > tol || right > tol) {
      out.spill.push({ el: name(el), below: Math.round(below), right: Math.round(right) });
    }
  }

  const dedupe = (rows) => {
    const seen = new Set();
    return rows.filter((r) => (seen.has(r.el) ? false : seen.add(r.el)));
  };
  return { overflow: dedupe(out.overflow).slice(0, 12), spill: dedupe(out.spill).slice(0, 12) };
}, tolerance);

const screens = ['Site', 'Drones', 'Missions', 'Repairs', 'Analytics', 'Rehearsal'];
const faults = [];

// Run the site forward so the faulted arrays exist and the strip has real chips.
await press('Run site time at 600');
await page.waitForTimeout(8000);
await press('Run site time at 60');

for (const theme of ['dark', 'light']) {
  if (theme === 'light') { await press('Switch to light theme'); await page.waitForTimeout(500); }
  for (const screen of screens) {
    await press(screen);
    await page.waitForTimeout(900);
    const m = await measure(TOLERANCE);
    for (const o of m.overflow) faults.push(`${theme}/${screen}  OVERFLOW +${o.over}px  ${o.el}`);
    for (const s of m.spill) faults.push(`${theme}/${screen}  SPILL ${s.below}px below  ${s.el}`);
  }
}

// The array panel and the incident file, which are the densest surfaces here.
await press('Switch to dark theme');
await press('Site');
await page.waitForTimeout(500);
await press('Array B-17');
await page.waitForTimeout(1000);
for (const o of (await measure(TOLERANCE)).overflow) {
  faults.push(`array panel  OVERFLOW +${o.over}px  ${o.el}`);
}
await press('Open incident file', 'Open inspection dossier');
await page.waitForTimeout(1200);
for (const o of (await measure(TOLERANCE)).overflow) {
  faults.push(`incident file  OVERFLOW +${o.over}px  ${o.el}`);
}

await browser.close();

for (const e of errors) console.log(`  ${e}`);
if (faults.length || errors.length) {
  console.log(`\ncheck:layout — ${faults.length} boxes smaller than their contents\n`);
  for (const f of faults) console.log(`  ${f}`);
  process.exit(1);
}
console.log('\ncheck:layout — every box fits what is inside it, both themes, six screens.\n');
