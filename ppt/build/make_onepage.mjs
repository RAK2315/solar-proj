/**
 * ppt/build/make_onepage.mjs — the one-page description of the problem and the
 * solution, as ppt/SURYA-AGENT-One-Page.pdf.
 *
 * The page is onepage.html, printed by Chrome. It is one A4 page on purpose, and
 * this fails if the content has grown past it. It also writes a PNG of the page
 * beside the raw captures, for looking at.
 */
//   node ppt/build/make_onepage.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'SURYA-AGENT-One-Page.pdf');
mkdirSync(join(HERE, 'render'), { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
});
const page = await (await browser.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 })).newPage();
await page.goto(pathToFileURL(join(HERE, 'onepage.html')).href, { waitUntil: 'load' });

const { content, box } = await page.evaluate(() => {
  const body = document.body;
  const last = body.lastElementChild.getBoundingClientRect();
  const pad = parseFloat(getComputedStyle(body).paddingBottom);
  return { content: last.bottom + pad, box: body.getBoundingClientRect().height };
});
console.log(`content ends at ${content.toFixed(0)} px of a ${box.toFixed(0)} px page`);
await page.screenshot({ path: join(HERE, 'render', 'onepage.png') });
if (content > box + 1) {
  await browser.close();
  throw new Error('The one-page description no longer fits on one page. Cut text; do not shrink it.');
}
await page.pdf({ path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(OUT);
