/**
 * scripts/score_image.mts — ask the exported detector about an image, offline.
 *
 * `npx tsx scripts/score_image.mts <file.png|jpg>`
 *
 * Runs the same ONNX weights and the same decode as the browser, in Node, on a
 * file and on crops of it. Written to answer "does the detector transfer to the
 * render, or is the ROI wrong?" — the whole rendered frame came back Saglam 0.94
 * with no cracked box; the same frame cropped to the module came back Cracked
 * 0.88, which located the fault in the crop and not in the model.
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import * as ortNS from 'onnxruntime-web';

import { decode, letterboxFor, LETTERBOX_SIZE } from '../src/lib/detect';

const ort = (ortNS as unknown as { default?: typeof ortNS }).default ?? ortNS;
const FILE = process.argv[2];
const NAMES: string[] = JSON.parse(
  readFileSync('public/models/defect_yolov8n.classes.json', 'utf8'),
);

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
});
const page = await (await browser.newContext()).newPage();
await page.goto('about:blank');
const session = await ort.InferenceSession.create('public/models/defect_yolov8n.onnx', {
  executionProviders: ['wasm'],
});

const ext = FILE.endsWith('.png') ? 'png' : 'jpeg';
const dataUrl = `data:image/${ext};base64,${readFileSync(FILE).toString('base64')}`;

async function prep(roi: [number, number, number, number]) {
  return page.evaluate(async ([src, r]) => {
    const img = new Image();
    await new Promise((res) => { img.onload = res; img.src = src as string; });
    const b = r as number[];
    const sx = b[0] * img.naturalWidth;
    const sy = b[1] * img.naturalHeight;
    const sw = b[2] * img.naturalWidth;
    const sh = b[3] * img.naturalHeight;
    const SIZE = 640;
    const scale = Math.min(SIZE / sw, SIZE / sh);
    const padX = (SIZE - sw * scale) / 2;
    const padY = (SIZE - sh * scale) / 2;
    const c = document.createElement('canvas');
    c.width = SIZE; c.height = SIZE;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#727272'; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, sx, sy, sw, sh, padX, padY, sw * scale, sh * scale);
    const { data: rgba } = ctx.getImageData(0, 0, SIZE, SIZE);
    const bytes = new Uint8Array(SIZE * SIZE * 3);
    for (let i = 0; i < SIZE * SIZE; i += 1) {
      bytes[i * 3] = rgba[i * 4];
      bytes[i * 3 + 1] = rgba[i * 4 + 1];
      bytes[i * 3 + 2] = rgba[i * 4 + 2];
    }
    let s = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      s += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return { rgb: btoa(s), w: Math.round(sw), h: Math.round(sh) };
  }, [dataUrl, roi] as const) as Promise<{ rgb: string; w: number; h: number }>;
}

async function run(roi: [number, number, number, number], label: string) {
  const p = await prep(roi);
  const bytes = Buffer.from(p.rgb, 'base64');
  const pixels = LETTERBOX_SIZE * LETTERBOX_SIZE;
  const data = new Float32Array(3 * pixels);
  for (let i = 0; i < pixels; i += 1) {
    data[i] = bytes[i * 3] / 255;
    data[pixels + i] = bytes[i * 3 + 1] / 255;
    data[2 * pixels + i] = bytes[i * 3 + 2] / 255;
  }
  const out = await session.run({
    [session.inputNames[0]]: new ort.Tensor(
      'float32', data, [1, 3, LETTERBOX_SIZE, LETTERBOX_SIZE],
    ),
  });
  const first = Object.values(out)[0] as { data: Float32Array; dims: readonly number[] };
  const [, channels, anchors] = first.dims as number[];
  const dets = decode(first.data as Float32Array, channels, anchors, NAMES,
    letterboxFor(p.w, p.h));
  const top = dets.slice().sort((a, b) => b.confidence - a.confidence).slice(0, 3)
    .map((d) => `${d.label} ${d.confidence.toFixed(3)}`).join(' | ');
  console.log(`${label.padEnd(26)} ${top || '(nothing)'}`);
}

const rest = process.argv.slice(3).map(Number);
if (rest.length >= 4) {
  for (let i = 0; i + 3 < rest.length; i += 4) {
    const roi = rest.slice(i, i + 4) as [number, number, number, number];
    await run(roi, roi.map((n) => n.toFixed(2)).join(' '));
  }
} else {
  await run([0, 0, 1, 1], 'whole frame');
  await run([0.2, 0.2, 0.6, 0.6], 'centre 60%');
  await run([0.22, 0.25, 0.55, 0.42], 'the module');
  await run([0.24, 0.27, 0.51, 0.36], 'tight on the module');
}

await browser.close();
