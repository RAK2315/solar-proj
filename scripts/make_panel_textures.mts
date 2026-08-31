/**
 * scripts/make_panel_textures.mts — photographs onto the 3D modules.
 *
 * `npx tsx scripts/make_panel_textures.mts`
 *
 * WHY. The detector was trained on ground-level photographs of solar panels. The
 * 3D scene renders a flat-shaded blue rectangle with a polyline drawn on it, and
 * the model — correctly — finds nothing in that. So the render is textured with
 * an actual photograph of an actual panel, which is what a real digital twin is:
 * geometry from the site plan, surface from site imagery.
 *
 * WHAT IS AND IS NOT CLAIMED. This is a MATERIAL, not evidence. The photograph is
 * of somebody else's panel in somebody else's lab, and the console says so on
 * screen wherever it is visible. What it buys is a render whose pixels resemble
 * the training distribution closely enough that the detector has a fair chance of
 * firing on it — and if it fires, the box is still entirely the model's.
 *
 * TWO RULES THIS SCRIPT ENFORCES.
 *
 *   1. NOT THE EVIDENCE FRAME. `data/evidence/b17_rgb.jpg` is the image the
 *      committed 0.9084 was measured on. Texturing the scene with it and then
 *      running the detector over the scene would be teaching to the test. This
 *      script refuses to use it.
 *   2. THE HEALTHY MODULE MUST NOT SCORE AS CRACKED. Half the `Good`-labelled
 *      crops in this dataset come back `Cracked` above 0.5 from our own weights —
 *      a real weakness of the model, and one that would manufacture a false
 *      positive on a healthy panel if the texture were chosen by eye. The intact
 *      texture is chosen because the detector returns no `Cracked` box on it, and
 *      this script fails if that stops being true.
 *
 * The crop is the dataset's own labelled box, so the texture is the panel and not
 * the room around it. The cracked source is portrait and the module is landscape
 * (2.6 m x 1.6 m), so it is rotated a quarter turn before it is written — and it
 * is the ROTATED pixels that are scored, because those are the pixels that end up
 * on the panel.
 *
 * `dataset/` is gitignored (large, regenerable from Roboflow). The OUTPUTS are
 * committed, the same way `data/evidence/` is.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import * as ortNS from 'onnxruntime-web';

import { crackedOnly, decode, letterboxFor, LETTERBOX_SIZE } from '../src/lib/detect';

const ort = (ortNS as unknown as { default?: typeof ortNS }).default ?? ortNS;

const SPLIT = 'test';
const DIR = `dataset/rgb-solar-panel-fault-v2/${SPLIT}`;
const OUT_IMAGES = 'public/textures';
const OUT_MANIFEST = 'data/panel_textures.json';
const TEXTURE_WIDTH = 1024;

const CLASS_NAMES: string[] = JSON.parse(
  readFileSync('public/models/defect_yolov8n.classes.json', 'utf8'),
);

/** The frame the committed detection was measured on. Never a texture. */
const EVIDENCE_STEM = 'IMG_0429_jpg.rf.c611273e2120a94dc0dc6bc9220b4196';

interface Source {
  role: 'cracked' | 'intact';
  file: string;
  /** A dataset image, cropped to its own labelled box. */
  stem?: string;
  /** A file supplied for the project, used whole. Mutually exclusive with `stem`. */
  supplied?: string;
  /** Degrees clockwise applied before writing, to land the module landscape. */
  rotate: 0 | 90;
  /** What the detector must say about the written texture for this to be honest. */
  expect: 'cracked' | 'no-cracked';
}

/**
 * THE INTACT TEXTURE IS SUPPLIED, THE CRACKED ONE IS FROM THE DATASET, and the
 * manifest says which is which rather than describing both the same way.
 *
 * The dataset's own healthy modules are photographed in a lab under warm light and
 * come out tan with dark blotches. On a field of flat blue modules that reads as
 * damage, which is the opposite of what a healthy texture is for: it was reported
 * as "even the panels that should not be cracked have the cracked image". The
 * supplied file is a clean module, straight on, in the blue the rest of the field
 * already is. The no-Cracked rule below still gates it - the model is asked, and
 * this script fails if it disagrees.
 */
const SOURCES: Source[] = [
  {
    role: 'cracked',
    file: 'module-cracked.jpg',
    stem: 'IMG_0436_jpg.rf.eadcfb8e4fe2136b30d8a1a43bb467d1',
    rotate: 90,
    expect: 'cracked',
  },
  {
    role: 'intact',
    file: 'module-intact.jpg',
    supplied: 'assets/textures-src/module-intact-source.png',
    rotate: 0,
    expect: 'no-cracked',
  },
];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
});
const page = await (await browser.newContext()).newPage();
await page.goto('about:blank');

const session = await ort.InferenceSession.create('public/models/defect_yolov8n.onnx', {
  executionProviders: ['wasm'],
});

interface Prepared { jpeg: string; rgb: string; w: number; h: number }

/** Crop to the labelled box, rotate, and letterbox the result for the model. */
async function prepare(dataUrl: string, box: number[], rotate: number, width: number) {
  return page.evaluate(async ([src, bx, rot, texW]) => {
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = src as string; });
    const b = bx as number[];
    const sx = (b[0] - b[2] / 2) * img.naturalWidth;
    const sy = (b[1] - b[3] / 2) * img.naturalHeight;
    const sw = b[2] * img.naturalWidth;
    const sh = b[3] * img.naturalHeight;

    const turned = rot === 90;
    const cropW = turned ? sh : sw;
    const cropH = turned ? sw : sh;
    const tw = texW as number;
    const th = Math.round(tw * (cropH / cropW));

    const tex = document.createElement('canvas');
    tex.width = tw; tex.height = th;
    const tc = tex.getContext('2d')!;
    if (turned) {
      tc.translate(tw, 0);
      tc.rotate(Math.PI / 2);
      tc.drawImage(img, sx, sy, sw, sh, 0, 0, th, tw);
    } else {
      tc.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
    }

    // The model sees exactly what was written, letterboxed the way the app does it.
    const SIZE = 640;
    const scale = Math.min(SIZE / tw, SIZE / th);
    const padX = (SIZE - tw * scale) / 2;
    const padY = (SIZE - th * scale) / 2;
    const sq = document.createElement('canvas');
    sq.width = SIZE; sq.height = SIZE;
    const c = sq.getContext('2d')!;
    c.fillStyle = '#727272'; c.fillRect(0, 0, SIZE, SIZE);
    c.drawImage(tex, 0, 0, tw, th, padX, padY, tw * scale, th * scale);

    const { data: rgba } = c.getImageData(0, 0, SIZE, SIZE);
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

    return { jpeg: tex.toDataURL('image/jpeg', 0.92), rgb: btoa(s), w: tw, h: th };
  }, [dataUrl, box, rotate, width] as const) as Promise<Prepared>;
}

async function score(p: Prepared) {
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
  const all = decode(
    first.data as Float32Array, channels, anchors, CLASS_NAMES, letterboxFor(p.w, p.h),
  );
  return { all, cracked: crackedOnly(all) };
}

mkdirSync(OUT_IMAGES, { recursive: true });

const written = [];
for (const src of SOURCES) {
  if (src.stem === EVIDENCE_STEM) {
    throw new Error(
      `${src.stem} is the frame the committed detection was measured on. Texturing `
      + 'the scene with it would be teaching to the test.',
    );
  }

  // A dataset image is cropped to its own labelled box; a supplied file is a
  // photograph of one module already, so the whole frame is the crop.
  const label = src.stem
    ? readFileSync(`${DIR}/labels/${src.stem}.txt`, 'utf8').trim().split('\n')[0]
      .split(/\s+/).map(Number)
    : null;
  const bytes = src.stem
    ? readFileSync(`${DIR}/images/${src.stem}.jpg`)
    : readFileSync(src.supplied!);
  const mime = src.stem || src.supplied!.endsWith('.jpg') ? 'jpeg' : 'png';
  const prepared = await prepare(
    `data:image/${mime};base64,${bytes.toString('base64')}`,
    label ? [label[1], label[2], label[3], label[4]] : [0.5, 0.5, 1, 1],
    src.rotate,
    TEXTURE_WIDTH,
  );

  const result = await score(prepared);
  const best = result.cracked[0];

  if (src.expect === 'cracked' && !best) {
    throw new Error(`${src.role}: the detector returns no Cracked box on the written texture.`);
  }
  if (src.expect === 'no-cracked' && best) {
    throw new Error(
      `${src.role}: the detector calls this texture Cracked at ${best.confidence.toFixed(3)}. `
      + 'A healthy module textured with it would manufacture a false positive.',
    );
  }

  writeFileSync(`${OUT_IMAGES}/${src.file}`, Buffer.from(prepared.jpeg.split(',')[1], 'base64'));

  const top = result.all.slice().sort((a, b) => b.confidence - a.confidence)[0];
  written.push({
    role: src.role,
    url: `/textures/${src.file}`,
    origin: src.stem ? 'dataset' : 'supplied',
    // One sentence naming where these pixels came from, written HERE so that no
    // component has to compose it out of fields that may not apply.
    provenance: src.stem
      ? `${src.stem}.jpg, ${CLASS_NAMES[label![0]]}-labelled, ${SPLIT} split of `
        + 'solarvision-gwljt/solar-panel-fault-detection v2 (Roboflow Universe, CC BY 4.0)'
      : `${src.supplied} - a photograph supplied for this project, `
        + 'used as surface material only',
    sourceImage: src.stem ? `${src.stem}.jpg` : src.supplied!,
    split: src.stem ? SPLIT : null,
    datasetLabel: label ? CLASS_NAMES[label[0]] : null,
    rotatedDeg: src.rotate,
    widthPx: prepared.w,
    heightPx: prepared.h,
    detectorOnTexture: top
      ? { label: top.label, confidence: Number(top.confidence.toFixed(4)) }
      : null,
  });

  console.log(
    `${src.role.padEnd(8)} ${src.file.padEnd(22)} label=${(label ? CLASS_NAMES[label[0]] : 'supplied').padEnd(8)} `
    + `detector: ${top ? `${top.label} ${top.confidence.toFixed(3)}` : '(nothing)'}`,
  );
}

const manifest = {
  note: 'Surface material for the 3D modules, used the way a digital twin is textured '
    + 'from site imagery. NOT captured evidence, and never to be presented as such. '
    + 'Each texture carries its own provenance line - they do not share one.',
  dataset: {
    name: 'solarvision-gwljt/solar-panel-fault-detection v2',
    source: 'Roboflow Universe',
    licence: 'CC BY 4.0',
  },
  generatedBy: 'scripts/make_panel_textures.mts',
  textures: written,
};

writeFileSync(OUT_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nwrote ${OUT_MANIFEST}`);
await browser.close();
