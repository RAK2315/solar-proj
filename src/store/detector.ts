'use client';

/**
 * src/store/detector.ts — the trained detector, running here.
 *
 * THE ONE RUNTIME MODEL IN THE PRODUCT. Everything else on screen is physics, a
 * deterministic function, or a language model writing prose about numbers it was
 * handed. This is the actual convolutional network the project trained, executing
 * in the operator's browser on a frame captured a second earlier.
 *
 * WHY IT IS WORTH THE WEIGHT. The committed detection is genuine — YOLOv8n,
 * confidence 0.9084, on an image from the held-out test split — and it was
 * computed once and replayed, which to anybody watching is indistinguishable from
 * an animation. The most rigorous thing in the project read as the least. Running
 * it live is the only answer that does not require the audience to take our word.
 *
 * ABSENT MEANS ABSENT, AND HERE IT MATTERS MOST. Until `public/models/` holds an
 * exported model this store reports `missing` and the UI says the detector is not
 * loaded. It never falls back, never seeds a box from the crack path the 3D scene
 * already knows about, and never reports a detection it did not get from the
 * tensor. A box we already know the answer to, labelled as a detection, is
 * fabricated evidence — see docs/colab-export-onnx.md.
 *
 * LOADED ONCE, LAZILY. The runtime is ~5 MB of WebAssembly and the weights are
 * another ~12 MB; neither is fetched until an operator actually asks for a
 * detection, so the console's first paint is unaffected.
 *
 * THE RESULT BELONGS TO AN ARRAY, NOT TO THE STORE. There was one global result,
 * and it was the wrong shape for what actually happens: the aircraft is only over
 * the module for 22 seconds of scene time — about two real seconds at 600x — so
 * by the time an operator reaches for a button the camera is home and pointing at
 * empty desert. The panel then showed a photograph of sand and reported, quite
 * correctly, that the model had found nothing in it.
 *
 * So the detection is taken DURING the pass, automatically, and filed against the
 * array it was taken over. Opening that array later shows the frame the drone
 * actually captured and the box the model actually returned, rather than whatever
 * the camera happens to be looking at now.
 */

import { create } from 'zustand';

import {
  crackedOnly, decode, letterboxFor, LETTERBOX_SIZE, type Detected,
} from '@/lib/detect';

export type DetectorStatus =
  /** Nothing asked for yet. */
  | 'idle'
  /** Fetching the runtime and the weights. */
  | 'loading'
  /** Loaded and ready. */
  | 'ready'
  /** No model file in the build — the expected state until the export is run. */
  | 'missing'
  /**
   * The MODEL is unusable — it did not load, or its class list did not.
   *
   * Not "a run failed". `LiveReticle` treats this as terminal and stops sampling
   * for the session, so putting one bad frame or one transient throw in here
   * killed live detection for every subsequent flight, with nothing to clear it.
   * A run that fails is `run: 'failed'`; the model stays whatever it was.
   */
  | 'failed';

export type RunStatus = 'idle' | 'running' | 'done' | 'failed';

/** A region of a frame, in 0..1 fractions of its width and height. */
export interface Roi { x: number; y: number; w: number; h: number }

/** One run of the detector, filed against whatever it was run on. */
export interface DetectorResult {
  /** What the model returned. Empty is a real answer, not a missing one. */
  detections: Detected[];
  /** Milliseconds the inference took — the proof it happened, and when. */
  elapsedMs: number;
  /** The frame it ran on, as a data URL, so the UI can draw boxes over it. */
  frame: string;
  /** The canvas's own pixel size, which is the space the boxes are in. */
  frameSize: [number, number];
  /**
   * Which run this was, counting from 1 for the session.
   *
   * WHY A RESULT NEEDS AN IDENTITY. Re-running the detector on the same pixels
   * returns the same answer — that is what repeatable means — so the panel
   * redrew with identical text and the control read as dead. It was not: the
   * network ran, in 298 ms, and said the same thing. A run number and a clock
   * time are the difference between "nothing happened" and "it happened again".
   */
  run: number;
  /** Wall clock at completion. Not site time — this is about NOW, deliberately. */
  at: number;
  /** What it was run on, in the operator's words. */
  source: string;
  /** The array this run is about, when it is about one. */
  panelId?: string;
  /**
   * The region of the source canvas the frame was cut from, in 0..1.
   *
   * Needed by any overlay drawing these boxes on the LIVE scene rather than on
   * the returned frame: the model's coordinates are in crop pixels, so without
   * the crop's own place on screen a box drawn over the scene is stretched
   * across the whole viewfinder. That was visible as a `Cracked 0.72` box
   * covering most of the picture.
   */
  roi?: Roi;
}

/** One line of the run ledger. */
export interface RunLine {
  run: number;
  at: number;
  elapsedMs: number;
  /** How many detections came back. Zero is a result. */
  found: number;
  source: string;
}

/** How many runs the ledger keeps. Enough to show a re-run; not a log file. */
const LEDGER = 4;

/** What a run was asked to look at. */
export interface DetectOptions {
  /** The array this run is about. */
  panelId?: string;
  /**
   * `roi` crops the canvas before the model sees it, in 0..1 fractions of the
   * frame: `{ x, y, w, h }`.
   *
   * WHY A CROP IS NOT CHEATING. The training images are ground-level photographs
   * of ONE panel filling the frame. The drone's camera sees several modules at an
   * angle from five metres up, and a 640x640 letterbox of that leaves each panel
   * about eighty pixels across. Cropping to the module under inspection is what a
   * real inspection pipeline does — detect or track the object, then classify the
   * region — and it changes WHICH PIXELS the model is asked about, never what it
   * says about them. The box that comes back is still entirely the model's.
   */
  roi?: Roi;
  /** What this was run on, for the ledger and the caption. */
  source: string;
  /**
   * File the result against `panelId` as THE capture the drone took over it.
   *
   * Only the flight does this. An operator re-running the detector, or checking
   * it against the committed photograph, must not overwrite the frame the
   * aircraft actually brought back.
   */
  file?: boolean;
}

interface DetectorState {
  status: DetectorStatus;
  /** True while an inference is in flight — the live pass must not stack calls. */
  busy?: boolean;
  /** Why it is missing or failed, in the operator's words. */
  reason?: string;
  run: RunStatus;
  /** The most recent run, whatever it was of. */
  last?: DetectorResult;
  /**
   * Runs filed by array id — what the drone saw over THAT array.
   *
   * Kept because the on-station window is seconds long and an operator reads the
   * result minutes later. Without this the panel showed the camera's current
   * view, which is the sand between the rows.
   */
  byPanel: Record<string, DetectorResult>;
  /** How many frames the current pass has run over, per array. */
  framesInPass: Record<string, number>;

  /**
   * The last few completed runs, newest first.
   *
   * THIS IS THE FEEDBACK. Everything else about a repeat run is identical by
   * design, so the only honest way to show that it ran again is to show that
   * there are now two of them.
   */
  log: RunLine[];
  /** Runs completed this session. The next run's number is this plus one. */
  runs: number;

  /**
   * A new inspection pass over this array starts here.
   *
   * Clears the previous pass's capture and its frame count, so what the dossier
   * shows is always from the sortie that just happened.
   */
  beginPass: (panelId: string) => void;

  detect: (canvas: HTMLCanvasElement, opts: DetectOptions) => Promise<void>;
  /**
   * Run on a still image instead of the live canvas.
   *
   * Two jobs. Pointing the browser pipeline at the COMMITTED evidence photograph,
   * whose answer is already recorded — `Cracked` at 0.9084, from the Colab run —
   * so that if the two agree, every step between the pixels and the box is proven
   * correct here, in front of whoever is asking. And re-running on a frame the
   * drone already brought back, on demand, without having to catch the aircraft
   * mid-pass.
   */
  detectImage: (url: string, opts: DetectOptions) => Promise<void>;
  reset: () => void;
}

const MODEL_URL = '/models/defect_yolov8n.onnx';
const CLASSES_URL = '/models/defect_yolov8n.classes.json';

/** Held outside the store: a session object is not state, it is a resource. */
let session: unknown = null;
let classNames: string[] = [];

/**
 * Fetch the runtime, the weights and the class list, once.
 *
 * The dynamic import matters: `onnxruntime-web` pulls in WebAssembly and must not
 * be in the console's first-load bundle. That is the same lesson the 1.6 MB
 * telemetry file taught — see src/lib/telemetryPack.ts.
 */
async function load(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (session) return { ok: true };

  const head = await fetch(MODEL_URL, { method: 'HEAD' }).catch(() => null);
  if (!head || !head.ok) {
    return {
      ok: false,
      reason: 'No exported model in this build. Run the Colab cell in '
        + 'docs/colab-export-onnx.md and drop the .onnx into public/models/.',
    };
  }

  const ort = await import('onnxruntime-web');
  // Single-threaded, no SIMD assumptions: this runs on whatever laptop is plugged
  // into the projector, and a thread pool that fails to start takes the page with
  // it. One image every few seconds does not need the throughput.
  ort.env.wasm.numThreads = 1;

  const [names, s] = await Promise.all([
    fetch(CLASSES_URL).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] }),
  ]);

  if (!Array.isArray(names) || !names.length) {
    return {
      ok: false,
      reason: 'The model loaded but its class list did not. Without it a detection '
        + 'cannot be labelled, and guessing the label would misreport the model.',
    };
  }

  session = s;
  classNames = names as string[];
  return { ok: true };
}

/**
 * A canvas into the model's input tensor.
 *
 * Letterboxed onto a grey square rather than stretched: squashing an image
 * distorts every aspect ratio the model learned. Grey rather than black because
 * the padding should not read as a dark object.
 */
function toTensorInput(
  canvas: HTMLCanvasElement,
  roi?: Roi,
): {
  data: Float32Array; lb: ReturnType<typeof letterboxFor>; frame: string;
  frameSize: [number, number];
  cropped: Roi;
} {
  // The region actually handed to the model, in source pixels. Without an ROI
  // that is the whole canvas.
  const sx = roi ? Math.max(0, roi.x * canvas.width) : 0;
  const sy = roi ? Math.max(0, roi.y * canvas.height) : 0;
  const sw = roi ? Math.min(canvas.width - sx, roi.w * canvas.width) : canvas.width;
  const sh = roi ? Math.min(canvas.height - sy, roi.h * canvas.height) : canvas.height;

  const lb = letterboxFor(sw, sh);

  const square = document.createElement('canvas');
  square.width = LETTERBOX_SIZE;
  square.height = LETTERBOX_SIZE;
  const ctx = square.getContext('2d')!;
  ctx.fillStyle = '#727272';
  ctx.fillRect(0, 0, LETTERBOX_SIZE, LETTERBOX_SIZE);
  ctx.drawImage(
    canvas,
    sx, sy, sw, sh,
    lb.padX, lb.padY,
    sw * lb.scale, sh * lb.scale,
  );

  // The frame the UI shows is the SAME pixels the model was given — otherwise a
  // box drawn on it would be in the wrong place, which is the most misleading
  // kind of wrong a detection can be.
  const shown = document.createElement('canvas');
  shown.width = Math.round(sw);
  shown.height = Math.round(sh);
  shown.getContext('2d')!.drawImage(canvas, sx, sy, sw, sh, 0, 0, shown.width, shown.height);

  const { data: rgba } = ctx.getImageData(0, 0, LETTERBOX_SIZE, LETTERBOX_SIZE);
  const pixels = LETTERBOX_SIZE * LETTERBOX_SIZE;

  // NCHW, planar, 0..1. Interleaved RGBA is what a canvas gives and it is not
  // what the model wants; getting this wrong produces confident nonsense.
  const data = new Float32Array(3 * pixels);
  for (let i = 0; i < pixels; i += 1) {
    data[i] = rgba[i * 4] / 255;
    data[pixels + i] = rgba[i * 4 + 1] / 255;
    data[2 * pixels + i] = rgba[i * 4 + 2] / 255;
  }

  return {
    data, lb,
    frame: shown.toDataURL('image/png'),
    frameSize: [shown.width, shown.height],
    // THE REGION ACTUALLY CROPPED, not the one asked for. The caller clamps x to
    // 0 and w to 1 independently, so x + w can exceed 1; the crop is then
    // narrower than the rectangle an overlay would draw the boxes into, and
    // every box lands stretched and displaced.
    cropped: {
      x: sx / canvas.width,
      y: sy / canvas.height,
      w: sw / canvas.width,
      h: sh / canvas.height,
    },
  };
}

/** The more informative of two real captures: more boxes, then more confident. */
function better(a: DetectorResult | undefined, b: DetectorResult): DetectorResult {
  if (!a) return b;
  if (b.detections.length !== a.detections.length) {
    return b.detections.length > a.detections.length ? b : a;
  }
  const top = (r: DetectorResult) => Math.max(0, ...r.detections.map((d) => d.confidence));
  return top(b) > top(a) ? b : a;
}

export const useDetector = create<DetectorState>((set, get) => ({
  status: 'idle',
  run: 'idle',
  busy: false,
  byPanel: {},
  framesInPass: {},
  log: [],
  runs: 0,

  beginPass: (panelId) => set((state) => {
    const byPanel = { ...state.byPanel };
    delete byPanel[panelId];
    return { byPanel, framesInPass: { ...state.framesInPass, [panelId]: 0 } };
  }),

  detect: async (canvas, { panelId, roi, source, file }) => {
    // ONE AT A TIME. `busy` was documented as stopping the live pass stacking
    // calls and was never read here, only by the caller. Two overlapping runs
    // both computed `runs + 1` after their awaits, so they took the same run
    // number: two ledger rows with one key, and a counter advancing by one.
    if (get().busy) return;
    // THE CAPTURE HAPPENS FIRST, AND ALWAYS. The first version loaded the model
    // before touching the canvas, so with no model exported yet the operator got
    // "detector not loaded" and NO IMAGE — which reads as the capture being broken
    // when it is the one part that works. Grabbing the frame up front proves the
    // drone's camera is real whatever happens next.
    let captured: ReturnType<typeof toTensorInput>;
    try {
      captured = toTensorInput(canvas, roi);
    } catch (err) {
      set({
        run: 'failed',
        reason: err instanceof Error
          ? `could not read the camera frame — ${err.message}`
          : 'could not read the camera frame',
      });
      return;
    }

    set({ run: 'running', status: 'loading', busy: true });

    const loaded = await load();
    if (!loaded.ok) {
      // THE FRAME STAYS ON SCREEN, and until now it did not: this branch returned
      // without storing the capture anywhere, so the restructure above — grab the
      // pixels before touching the model — had no observable effect in the one
      // case it was written for. It is filed with an empty detection list and
      // `run` left at idle, so the panel shows the photograph under "detector not
      // loaded" rather than under "the model found nothing", which would be a
      // verdict nothing produced.
      const runNumber = get().runs + 1;
      const shown: DetectorResult = {
        detections: [],
        elapsedMs: 0,
        frame: captured.frame,
        frameSize: captured.frameSize,
        run: runNumber,
        at: Date.now(),
        source,
        panelId,
        roi: roi ? captured.cropped : undefined,
      };
      set((state) => ({
        status: 'missing',
        run: 'idle',
        busy: false,
        runs: runNumber,
        reason: loaded.reason,
        last: shown,
        byPanel: file && panelId ? { ...state.byPanel, [panelId]: shown } : state.byPanel,
      }));
      return;
    }
    set({ status: 'ready' });

    try {
      const ort = await import('onnxruntime-web');
      const { data, lb, frame, frameSize, cropped } = captured;

      const started = performance.now();
      const input = new ort.Tensor('float32', data, [1, 3, LETTERBOX_SIZE, LETTERBOX_SIZE]);
      const s = session as {
        inputNames: string[];
        run: (f: Record<string, unknown>) => Promise<Record<string, {
          data: Float32Array; dims: number[];
        }>>;
      };
      const output = await s.run({ [s.inputNames[0]]: input });
      const elapsedMs = Math.round(performance.now() - started);

      const first = Object.values(output)[0];
      // [1, 4 + numClasses, anchors]. The channel count comes from the tensor, not
      // from the class list — if the two disagree the model is not the one whose
      // labels we hold, and the labels would be wrong rather than the shape.
      const [, channels, anchors] = first.dims;

      // Only the class this product talks about. The other four are true and
      // meaningless on screen.
      const runNumber = get().runs + 1;
      const result: DetectorResult = {
        detections: crackedOnly(decode(first.data, channels, anchors, classNames, lb)),
        elapsedMs,
        frame,
        frameSize,
        run: runNumber,
        at: Date.now(),
        source,
        panelId,
        roi: roi ? cropped : undefined,
      };

      set((state) => ({
        run: 'done',
        busy: false,
        runs: runNumber,
        last: result,
        log: [
          {
            run: runNumber,
            at: result.at,
            elapsedMs,
            found: result.detections.length,
            source,
          },
          ...state.log,
        ].slice(0, LEDGER),
        // Filed against the array only for the flight's own capture. An operator
        // re-running the detector, or checking it against the committed
        // photograph, must not destroy the frame the aircraft brought back.
        //
        // THE PASS KEEPS ITS BEST FRAME. A sortie runs the detector several times
        // as the camera orbits, and whether the crack is legible depends on the
        // angle — measured on real captures, the same module scores 0.92 square
        // on and nothing at all edge on. Filing the LAST frame meant the dossier
        // showed whichever pose the aircraft happened to finish at. Every
        // candidate is a real capture and every box is real; choosing between
        // them is what an inspection does, and the panel says how many it chose
        // from.
        byPanel: file && panelId
          ? { ...state.byPanel, [panelId]: better(state.byPanel[panelId], result) }
          : state.byPanel,
        framesInPass: file && panelId
          ? { ...state.framesInPass, [panelId]: (state.framesInPass[panelId] ?? 0) + 1 }
          : state.framesInPass,
      }));
    } catch (err) {
      // The RUN failed. The model is still loaded and the next pass may well
      // succeed, so `status` is left alone.
      set({
        run: 'failed',
        busy: false,
        reason: err instanceof Error ? err.message : 'inference failed',
      });
    }
  },

  detectImage: async (url, opts) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });

    if (!loaded) {
      // An image that will not decode says nothing about the network.
      set({ run: 'failed', reason: `could not load ${url}` });
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    // Already the exact pixels the model was given, so no region of interest —
    // re-cropping a crop would shrink the target every time it was re-run.
    await get().detect(canvas, { ...opts, roi: undefined });
  },

  reset: () => set({
    run: 'idle', last: undefined, log: [], runs: 0, byPanel: {}, framesInPass: {},
    status: 'idle', reason: undefined, busy: false,
  }),
}));
