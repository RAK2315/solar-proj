'use client';

/**
 * LiveDetection — the detector, run here, on a frame taken a second ago.
 *
 * THE QUESTION THIS ANSWERS is "is that box cached?", and the honest answer used
 * to be "yes, but it is real". That is a sentence nobody believes at a glance. The
 * committed detection IS genuine — YOLOv8n at 0.9084 on a held-out image — and
 * being replayed made the most rigorous thing in the project read as animation.
 *
 * So: press the button, the console grabs the drone's current camera frame out of
 * the 3D scene, runs the actual exported network on it in this browser, and draws
 * whatever comes back. The inference time is printed because that is the proof it
 * happened now.
 *
 * FOUR STATES, ALL OF THEM HONEST:
 *
 *   no model      the export has not been run. Says so, draws nothing.
 *   running       the network is executing.
 *   found         boxes, from the tensor, at the confidence the model returned.
 *   found nothing a real answer. The model was trained on PHOTOGRAPHS and this is
 *                 a render; it may genuinely not recognise a crack here, and if it
 *                 does not, that is what the panel says.
 *
 * WHAT THIS COMPONENT WILL NEVER DO is draw a box it did not get from the model.
 * The scene knows exactly where the crack is — `panelCells.ts` holds the polyline
 * — and using that to place a rectangle labelled as a detection would be
 * fabricated evidence. The rule is not "make it look like it worked".
 *
 * TWO CONTROLS THAT LOOKED DEAD, AND WERE NOT.
 *
 * "Run the detector on this captured frame" was reported as doing nothing. It was
 * running: 520 ms the first time, 298 ms the second, real inference both times.
 * The problem was that its only visible trace was a millisecond count inside a
 * paragraph BELOW a full-width photograph — measured at y=962 in a 900 px window,
 * so off the bottom of the screen — and the answer on the same pixels is the same
 * answer, so even in view there was nothing new to read. The run ledger below the
 * button is the fix: a repeat run adds a line, and a line appearing is visible
 * whatever the answer says.
 *
 * "Verify — reproduce the committed 0.91" was worse: it did nothing AT ALL once a
 * drone had flown. This showed `byPanel[panelId] ?? last`, so the flight's filed
 * capture won permanently and the verify run — the strongest claim this product
 * makes, the pipeline reproducing a number written down before the code existed —
 * updated a value nothing on screen was reading. A result now carries the array it
 * belongs to and what it was run on, and the panel shows the most recent run that
 * is about THIS array, captioned with what that was.
 */

import { BadgeCheck, Cpu, ScanSearch } from 'lucide-react';

import {
  detection as committed, evidenceUrl, panelTexture,
} from '@/lib/data';
import { hasCrackMechanism } from '@/lib/live';
import { useSelectedPanelId } from '@/store/selectors';
import { moduleRoi } from '@/components/cinematic/LiveReticle';
import { useFlightCue } from '@/store/flightCue';
import { M } from '@/lib/scene';
import { useDetector } from '@/store/detector';
import { useSession } from '@/store/session';
import { DetectionFrame } from './DetectionFrame';

/**
 * Wall clock, as an instrument prints it.
 *
 * Deliberately NOT site time. Site time is a model of a place; this is the answer
 * to "did that just happen", and it has to be the clock on the operator's wall for
 * that answer to mean anything.
 */
function wallClock(at: number): string {
  const d = new Date(at);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0')).join(':');
}

export function LiveDetection() {
  const status = useDetector((s) => s.status);
  const run = useDetector((s) => s.run);
  const reason = useDetector((s) => s.reason);
  const detect = useDetector((s) => s.detect);
  const detectImage = useDetector((s) => s.detectImage);
  const rgb = evidenceUrl('rgb');
  const panelId = useSelectedPanelId();

  // THE FLIGHT'S OWN CAPTURE, and then anything the operator has asked for since.
  //
  // The aircraft is over the module for about two real seconds at 600x, so
  // whatever it saw was filed against the array at the time; showing the camera's
  // CURRENT view instead is how this panel ended up reporting that the model found
  // nothing in a photograph of sand. But `fromFlight ?? last` went too far the
  // other way and pinned the panel to that filed capture for good, which is how
  // the Verify control came to update a value nothing was reading.
  //
  // The rule that satisfies both: the most recent run ABOUT THIS ARRAY, falling
  // back to what the drone filed.
  const fromFlight = useDetector((s) => s.byPanel[panelId]);
  const last = useDetector((s) => s.last);
  const log = useDetector((s) => s.log);
  const runs = useDetector((s) => s.runs);
  const frames = useDetector((s) => s.framesInPass[panelId] ?? 0);
  const injected = useSession((s) => s.injected);
  const photographedCrack = hasCrackMechanism(panelId, injected);
  const surface = panelTexture(photographedCrack ? 'cracked' : 'intact');
  const result = last && last.panelId === panelId ? last : fromFlight;

  // IS THE CAMERA ACTUALLY LOOKING AT ANYTHING? The button grabs the 3D canvas at
  // the instant it is pressed, and outside an inspection the camera sits at its
  // idle position over empty desert. Pressing it then captured sand, reported —
  // quite correctly — that the model found nothing in it, and OVERWROTE the good
  // frame the drone had filed during its pass. Destroying the useful result to
  // replace it with a photograph of nothing.
  const cue = useFlightCue();
  const cameraOnPanel = cue.active && cue.t >= M.lock && cue.t < M.thermal;

  /**
   * The drone's camera, as a canvas.
   *
   * The 3D scene renders into exactly one WebGL canvas, and that canvas IS the
   * aircraft's view — the same camera the cinematic flies. Reading it back is a
   * capture in the same sense the committed frame was one.
   */
  /**
   * Run the detector on whatever is worth running it on.
   *
   * ON STATION, the live canvas — the drone's camera, right now.
   *
   * OTHERWISE, THE FRAME ALREADY ON SCREEN. Disabling the button outside the pass
   * fixed the bug where it captured empty desert and overwrote a good capture,
   * and then left a dead control sitting above a perfectly good photograph of a
   * cracked panel. Re-running on that frame is the obviously better answer: it is
   * a real image, the inference genuinely happens, and the operator can trigger it
   * on demand instead of having to catch a two-second window.
   *
   * The verdict will match what the pass already found — it is the same pixels —
   * and that is the point rather than a caveat: it is repeatable, which a
   * measurement should be.
   */
  const capture = () => {
    if (cameraOnPanel) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        // THE SAME CROP THE PASS USES. Handing over the whole viewfinder is the
        // input that comes back Saglam 0.94 with no cracked box, and because this
        // run carries the array's id it would then replace the pass's good
        // capture with a whole-frame miss.
        void detect(canvas as HTMLCanvasElement, {
          panelId,
          roi: moduleRoi(cue.t, cue.target),
          source: `the drone's camera over ${panelId}, live`,
        });
      }
      return;
    }
    if (result) {
      void detectImage(result.frame, {
        panelId,
        source: `the captured frame for ${panelId}, run again`,
      });
    }
  };

  const busy = run === 'running';

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      <button
        type="button"
        className="btn-reset t-h1"
        onClick={capture}
        disabled={busy || (!cameraOnPanel && !result)}
        aria-label={cameraOnPanel
          ? 'Capture the drone camera frame and run the detector on it now'
          : 'Run the detector again on the captured frame below'}
        title={cameraOnPanel
          ? 'Capture what the drone is seeing and run the detector on it'
          : result
            ? 'Run the detector again on the frame below — same pixels, live inference'
            : 'Nothing captured yet. Dispatch a drone; the detector runs during the pass.'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 'var(--sp-2)', width: '100%', padding: 'var(--sp-3)',
          border: `1px solid ${cameraOnPanel || result ? 'var(--sev-active)' : 'var(--line-active)'}`,
          color: cameraOnPanel || result ? 'var(--sev-active)' : 'var(--text-secondary)',
          background: 'transparent',
          opacity: busy ? 0.6 : 1,
        }}
      >
        <ScanSearch size={15} strokeWidth={2} aria-hidden />
        {busy
          ? 'Running the detector…'
          : cameraOnPanel
            ? 'Run the detector on this live frame'
            : result
              ? 'Run the detector on this captured frame'
              : 'Nothing captured yet'}
      </button>

      {/* Only when there is genuinely nothing to run on. A dead button above a
          perfectly good photograph of a cracked panel was the wrong answer to the
          right problem. */}
      {!cameraOnPanel && !result && (
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          dispatch a drone — the detector runs itself during the inspection pass,
          and what it found is kept here
        </span>
      )}

      {/* THE SELF-TEST, and the strongest thing on this panel.
          The committed detection is a recorded fact: `Cracked` at 0.9084, from a
          Colab run months ago on a held-out image. This runs the SAME weights
          through this browser's own pipeline on that same photograph. If the two
          agree, every step between the pixels and the box — the letterbox, the
          channel order, the tensor layout, the decode, the suppression — is
          verified in front of whoever is asking, against a number that was
          written down before the code existed. If they disagree, the fault is
          here and not in the model, and it should be loud. */}
      {rgb && committed && (
        <button
          type="button"
          className="btn-reset"
          onClick={() => void detectImage(rgb, {
            panelId,
            source: 'the committed evidence photograph',
          })}
          disabled={busy}
          aria-label="Verify the detector against the committed evidence photograph"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 'var(--sp-2)', width: '100%', padding: '6px var(--sp-3)',
            border: '1px solid var(--line-active)',
            color: 'var(--text-secondary)',
            background: 'transparent',
          }}
        >
          <BadgeCheck size={13} strokeWidth={2} aria-hidden />
          <span className="t-h2">
            Verify — reproduce the committed {committed.confidence.toFixed(2)}
          </span>
        </button>
      )}

      {/* THE RUN LEDGER, and it sits HERE — above the frame — for a measured
          reason. The verdict paragraph below the photograph came out at y=962 in
          a 900 px window, so the only evidence that anything had happened was off
          the bottom of the screen. A control whose result you cannot see is a
          control that does nothing, as far as the person pressing it is
          concerned. */}
      {(busy || log.length > 0) && (
        <div style={{ display: 'grid', gap: 2 }}>
          {busy && (
            <span className="t-micro" style={{ color: 'var(--sev-active)' }}>
              run {runs + 1} — the network is executing…
            </span>
          )}
          {log.map((line) => (
            <span
              key={line.run}
              className="t-micro"
              style={{
                color: line.run === runs && !busy
                  ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              run {line.run} · {wallClock(line.at)} · {line.elapsedMs} ms ·{' '}
              {line.found === 0
                ? 'nothing found'
                : `${line.found} found`}{' '}
              · {line.source}
            </span>
          ))}
          {/* Two runs on the same pixels is not a bug being demonstrated. It is
              the measurement being repeatable, which is the property that
              separates a measurement from a picture of one.

              Compared by FRAME, not by source string: a pass fires several runs
              under one label while the camera moves, and this used to claim they
              were the same image above three different answers. */}
          {log.length > 1 && log[0].frameHash === log[1].frameHash && (
            <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
              same pixels as the run above it — the same answer is the point
            </span>
          )}
        </div>
      )}

      {/* The frame, with whatever the model returned drawn over it. The mapping
          from model pixels to screen lives in DetectionFrame, once, because there
          are two callers and the cinematic one had it wrong. */}
      {result && <DetectionFrame result={result} />}

      {result && (
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          run {result.run} of {result.source}
          {result === fromFlight && frames > 1
            ? ` — the clearest of ${frames} frames the drone took on this pass`
            : ''}
          {result === fromFlight && frames <= 1 ? ' — captured on the pass' : ''}
        </span>
      )}

      {/* The verdict, in the operator's words. Every branch is a real outcome. */}
      {status === 'missing' && (
        <p className="t-prose" style={{
          color: 'var(--text-secondary)', margin: 0, fontSize: 12, lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>Detector not loaded.</strong>{' '}
          {reason}
        </p>
      )}

      {status === 'failed' && (
        <p className="t-prose" style={{
          color: 'var(--sev-warning-ink)', margin: 0, fontSize: 12, lineHeight: 1.5,
        }}>
          The detector loaded but the run failed — {reason}. Nothing is drawn; the
          committed capture above is unaffected.
        </p>
      )}

      {run === 'done' && result && result.detections.length > 0 && (
        <p className="t-prose" style={{
          color: 'var(--text-primary)', margin: 0, fontSize: 13, lineHeight: 1.5,
        }}>
          <Cpu
            size={13}
            strokeWidth={2}
            aria-hidden
            style={{ color: 'var(--sev-active)', verticalAlign: '-1px', marginRight: 6 }}
          />
          <strong>{result.detections.length}</strong> detection
          {result.detections.length === 1 ? '' : 's'} on that frame, at{' '}
          <strong style={{ color: 'var(--sev-active)' }}>
            {result.detections.map((d) => d.confidence.toFixed(2)).join(', ')}
          </strong>
          . Computed in this browser in {result.elapsedMs} ms — nothing here was cached.
          <span className="t-micro" style={{
            color: 'var(--text-secondary)', display: 'block', marginTop: 4,
          }}>
            The box covers the whole module because that is what the model was
            taught to draw — every training example labels the panel, not the
            fracture. It answers &ldquo;is this module cracked&rdquo;. Where on the
            module is the thermal grid&rsquo;s job.
          </span>
        </p>
      )}

      {run === 'done' && result && result.detections.length === 0 && (
        <p className="t-prose" style={{
          color: 'var(--text-secondary)', margin: 0, fontSize: 12, lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>
            The model found nothing in that frame
          </strong>{' '}
          ({result.elapsedMs} ms). That is a real result and it is left standing: the
          detector was trained on ground-level photographs, and a rendered panel is
          not one. The committed capture above is a photograph, and its detection
          holds.
        </p>
      )}

      {/* A detection off the render is a detection off a PHOTOGRAPH stuck to a
          3D module. Said here as well as in the cinematic, because this is where
          the box is reported. */}
      {/* Only where a drone actually flew: `CrackedPanel` textures the FLIGHT
          TARGET, so claiming photographed modules for an array that was never
          inspected describes a panel that carries no photograph — the array-
          scoping mistake CLAUDE.md §0 rule 5 calls this project's most repeated. */}
      {surface && result && fromFlight && (
        <p className="t-prose" style={{
          color: 'var(--text-secondary)', margin: 0, fontSize: 12, lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>
            {photographedCrack
              ? 'Two modules of this array are textured with photographs of real panels'
              : 'A module of this array is textured with a photograph of a real intact panel'}
          </strong>{' '}
          {photographedCrack ? '— one cracked, one intact — ' : ''}because the
          detector was trained on photographs and returns nothing on a flat-shaded
          render. That is surface material, the way a digital twin is textured from
          site imagery; it is not a camera frame, and any box above is still the
          model&rsquo;s own output on those pixels.
          <span className="t-micro workings" style={{
            color: 'var(--text-muted)', display: 'block', marginTop: 2,
          }}>
            {surface.provenance} · not the frame the committed detection was
            {' '}measured on
          </span>
        </p>
      )}

      <span className="t-micro workings" style={{ color: 'var(--text-secondary)' }}>
        the exported network, executed on the WebAssembly runtime in this browser —
        same weights as the committed run, different runtime
      </span>
    </div>
  );
}
