// THROWAWAY. Screenshots and fps for /mockups/a..d at 1366x768. Deleted after the pick.
// Real GPU on purpose: SwiftShader fps would say nothing about the demo laptop.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2];
const UNCAPPED = process.argv.includes('--uncapped');
const SHOTS = !process.argv.includes('--no-shots');
const SECONDS = 6;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false,
  args: [
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    ...(UNCAPPED ? ['--disable-frame-rate-limit', '--disable-gpu-vsync'] : []),
  ],
});
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const DIRS = ['a', 'b', 'c', 'd', 'e'];
const THEMES = ['dark', 'light'];
const SCREENS = ['twin', 'fallback', 'incident', 'dossier', 'queue', 'analytics', 'drones', 'sandbox', 'landing'];
const only = process.argv.find((x) => x.startsWith('--only='))?.slice(7).split(',');

const overflow = [];
for (const dir of DIRS) {
  for (const theme of THEMES) {
    for (const screen of SCREENS) {
      const name = `${dir}-${theme}-${screen}`;
      if (only && !only.some((o) => name.includes(o))) continue;
      await page.goto(`http://localhost:3000/mockups/${dir}/${screen}?theme=${theme}`);
      await page.waitForSelector('.mk-stage .blk');
      if (screen !== 'fallback') await page.waitForSelector('canvas', { state: 'attached' });
      await page.waitForFunction(() => [...document.images].every((i) => i.complete));
      // Never a fixed wait alone: assert the entrance animations have finished.
      await page.waitForFunction(() => document.getAnimations().length === 0);
      if (screen === 'twin' || screen === 'sandbox') {
        await page.getByRole('button', { name: 'Dust storm' }).click();
        await page.mouse.move(dir === 'a' ? 470 : 690, 440);
      }
      await page.waitForTimeout(1600);
      // Report anything clipped or under the 14 px floor, so it is found by
      // measurement and not by eyeballing 56 images.
      const bad = await page.evaluate(() => {
        const out = [];
        const vh = innerHeight; const vw = innerWidth;
        document.querySelectorAll('.mk-stage .blk, .mk-nav').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0) return;
          if (r.bottom > vh + 1 || r.right > vw + 1 || r.top < -1 || r.left < -1) out.push(`${el.dataset.b ?? 'nav'} off-screen`);
        });
        const st = document.querySelector('.mk-stage');
        const sr = st.getBoundingClientRect();
        st.querySelectorAll(':scope > .blk').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (getComputedStyle(el).position !== 'fixed' && r.height && r.bottom > sr.bottom + 1) out.push(`${el.dataset.b} past the stage by ${Math.round(r.bottom - sr.bottom)}px`);
        });
        if (st && st.scrollHeight > st.clientHeight + 1 && getComputedStyle(st).overflow === 'hidden') out.push(`stage clipped by ${st.scrollHeight - st.clientHeight}px`);
        const small = new Set();
        document.querySelectorAll('.mk *').forEach((el) => {
          if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < 14) small.add(`${el.className}:${fs}`);
        });
        return [...out, ...small];
      });
      if (bad.length) overflow.push(`${name}: ${bad.join('; ')}`);
      await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 });
    }
  }
}
console.log(overflow.length ? overflow.join('\n') : 'no overflow, nothing under 14px');
console.log('errors', JSON.stringify([...new Set(errors)].slice(0, 5)));
await browser.close();
