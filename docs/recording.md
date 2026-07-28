# Recording the 90 seconds

Phase 10's deliverable that needs a human: a clean run at 1920×1080, committed as the
fallback if anything breaks live. It doubles as the shareable artefact.

## Before you record

```bash
npm run build && npm run start     # production build, so the debug readout is OFF
```

Use the **production** build, not `npm run dev`. Two reasons: the debug readout defaults
to hidden in production, and React's development-mode double-rendering costs frames in
the 3D scene.

Checklist:

- [ ] Browser at exactly **1920×1080**. If your display is larger, set the browser window
      to that size; if smaller, zoom out (`Ctrl -`) until the console fits without
      clipping — the shell is a fixed 1920×1080 and does not reflow.
- [ ] Full screen, no bookmarks bar, no notifications, no cursor parked over the console.
- [ ] `D` — confirm the debug readout is hidden.
- [ ] `R` — reset to t=0.
- [ ] Let the 3D scene load once before recording, so the first play is not competing
      with shader compilation.

## The run

1. Start the recorder.
2. Two seconds of the console at rest — health 94, output 364 MW, two amber arrays.
3. `Space`.
4. **Do not touch anything for 84 seconds.** It is autonomous up to the gate; that is
   the claim, and a stray keypress undercuts it.
5. At **t ≈ 84** the `APPROVE — CREATE WORK ORDER →` button arms. Click it — with the
   mouse, visibly. The one human input in the whole system should look like one.
6. Let it settle: the button becomes `✓ WORK ORDER #INC-B17 CREATED`, B-17 turns teal
   on the map, the queue returns to 3 pending.
7. Stop.

Save to `docs/demo-90s.mp4`.

## What to check in the playback

| Beat | What should be true |
|---|---|
| t=6–9 | Health counts 94 → 80 **without the digits jittering** |
| t=7, t=8 | B-17 escalates healthy → warning → critical; anomalies 2→3, critical 0→1 |
| t=10 | Right rail opens: −58.4 % string **and** −41.7 % array, as separate rows |
| t=18 | Hard cut to the cinematic; drone leaves the pad |
| t=21 | Camera gets **on board** — you are now flying it |
| t=34 | Target lock; array ID tags visible, B-17 highlighted among its neighbours |
| t=40 | Reticle frames **one module**, labelled `B-17 · B2-07` |
| t=48–56 | Ironbow thermal pass; the matrix fills **cell by cell**, not all at once |
| t=56 | Camera hands back to an external view; drone flies home |
| t=74 | Hard cut back to the console; queue shows 4 tasks, INC-B17 ranked #1 |
| t=84 | Gate armed. **Nothing says "work order created" until you click** |
| throughout | The PiP bottom-left is the live console, moving in step |

If any beat is late or early, `src/components/console/beats.test.tsx` will say so
faster than watching it again.

## The one number to fill in afterwards

Frame rate during the cinematic. Chrome DevTools → Rendering → **Frame Rendering Stats**.
Target is 60fps at 1920×1080. If it is short, the levers in order of bluntness:

1. `dpr={[1, 1.25]}` in `SolarFarmScene.tsx`
2. `PANELS_PER_ARRAY` 4 → 2 in `src/lib/scene.ts` (halves the instance count)
3. sky sphere `sphereGeometry args={[420, 24, 16]}` → `[420, 16, 10]`
4. drop the `ThermalPass` composer and tint in CSS instead

Record the number you measured in `report.txt`. Do not round it up.
