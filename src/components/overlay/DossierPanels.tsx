'use client';

/**
 * The dossier: what a sensor read, then what a model made of it.
 *
 * EVERYTHING HERE IS SCOPED TO THE ARRAY IT WAS MEASURED ON. We hold one real
 * capture, of B-17. The captured frames and the anomaly matrix exist for that
 * array once a drone has flown it, and for no other array at any time. The
 * detector panel is the one exception and only because it runs on whatever frame
 * the drone actually returned: it never draws a box the model did not produce.
 */

import { BadgeCheck, RotateCw, ScanSearch } from 'lucide-react';
import { useEffect } from 'react';

import { hasCapturedEvidence, panelTexture } from '@/lib/data';
import { confidence, deltaT, degC, hours, kW, pct, typographic } from '@/lib/format';
import { ironbowForDeltaT, normaliseDeltaT } from '@/lib/ironbow';
import { moduleRoi } from '@/lib/roi';
import { M } from '@/lib/scene';
import { useDetector, type DetectorResult } from '@/store/detector';
import { useFlightCue } from '@/store/flightCue';
import {
  BEAT, siteClockAt, useAgentCache, useCellGrid, useDetection, useEvidence, useFollowingFlight,
  useHasCrackMechanism, useHazards, useInjected, useInspected, useInspectionClock, useInverterReadings,
  useMatrixFillCount, usePanelStatus, useSelectedPanelId, useSiteSeconds,
} from '@/store/selectors';
import { useTriage } from '@/store/triage';
import { Blk, Why } from './Block';

/** A cell this far above the panel is the finding; below it the figure is noise. */
const LABEL_ABOVE_C = 0.9;
/** Past this the paint is light enough to need dark text. */
const DARK_TEXT_ABOVE = 0.45;

/* ── Captured frames ───────────────────────────────────────────────────────── */

export function CapturesPanel() {
  const panelId = useSelectedPanelId();
  const evidence = useEvidence();
  const detection = useDetection();

  if (!hasCapturedEvidence(panelId)) {
    return (
      <Blk b="captures" title="Captured evidence">
        <p className="empty well">
          No imagery is held on file for <span className="id">{panelId}</span>. The one committed capture in
          this build is of <span className="id">B-17</span>, and showing it here would present one
          array&apos;s evidence as another&apos;s. This array is flagged from its modelled signature.
        </p>
      </Blk>
    );
  }

  const rgb = evidence.rgbAnnotated ?? evidence.rgb;
  return (
    <Blk b="captures" title={<>Captured evidence<span className="count">drone capture</span></>}>
      {!evidence.thermal && !rgb ? (
        <p className="empty well">Nothing captured yet. The frames appear as the drone makes its two passes.</p>
      ) : (
        <div className="caps">
          {evidence.thermal && (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={evidence.thermal} alt="Thermal frame of the module" />
              <figcaption>Thermal, ironbow, UAV frame</figcaption>
            </figure>
          )}
          {rgb && (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rgb} alt="Visible-light frame with the detection box" />
              <figcaption>
                Visible, {detection ? `${detection.label.toLowerCase()} ${confidence(detection.confidence)}, ` : ''}
                dataset photo, not a drone frame
              </figcaption>
            </figure>
          )}
        </div>
      )}
      {evidence.audio && (
        <label className="media">
          <span className="one">Inverter audio</span>
          <audio controls src={evidence.audio} />
        </label>
      )}
      {evidence.flyover && (
        <label className="media">
          <span className="one">Drone flyover</span>
          <video src={evidence.flyover} muted loop autoPlay playsInline />
        </label>
      )}
    </Blk>
  );
}

/* ── The detector, run here ────────────────────────────────────────────────── */

/** The frame the model was run on, with whatever it returned drawn over it. */
export function DetectionBoxes({ result, showImage = true }: { result: DetectorResult; showImage?: boolean }) {
  const [w, h] = result.frameSize;
  return (
    <div className="detframe" data-bare={!showImage}>
      {/* A data URL made a moment ago: there is nothing for an image loader to optimise. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {showImage && <img src={result.frame} alt="The frame the detector was run on" />}
      {result.detections.map((d, i) => (
        <span
          key={i}
          className="box"
          style={{
            left: `${(d.box[0] / w) * 100}%`, top: `${(d.box[1] / h) * 100}%`,
            width: `${(d.box[2] / w) * 100}%`, height: `${(d.box[3] / h) * 100}%`,
          }}
        >
          <span className="tag num">{d.label} {confidence(d.confidence)}</span>
        </span>
      ))}
    </div>
  );
}

const wallClock = (at: number): string => {
  const d = new Date(at);
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
};

export function DetectorPanel() {
  const panelId = useSelectedPanelId();
  const status = useDetector((s) => s.status);
  const run = useDetector((s) => s.run);
  const reason = useDetector((s) => s.reason);
  const detect = useDetector((s) => s.detect);
  const detectImage = useDetector((s) => s.detectImage);
  const fromFlight = useDetector((s) => s.byPanel[panelId]);
  const last = useDetector((s) => s.last);
  const log = useDetector((s) => s.log);
  const runs = useDetector((s) => s.runs);
  const frames = useDetector((s) => s.framesInPass[panelId] ?? 0);
  const committed = useDetection();
  const evidence = useEvidence();
  const cracked = useHasCrackMechanism(panelId);
  const surface = panelTexture(cracked ? 'cracked' : 'intact');
  const following = useFollowingFlight();
  const cue = useFlightCue();

  // Something the operator ran by hand outranks the pass's own capture on
  // screen, but never replaces it on file.
  const mine = last && last.panelId === panelId ? last : undefined;
  const byHand = mine && !mine.source.startsWith("the drone's camera") ? mine : undefined;
  const result = byHand ?? fromFlight ?? mine;

  // The visible-light half of the pass, and only while the twin's camera is
  // actually the drone's. From the field view the canvas holds the whole site.
  const onPanel = following && cue.active && cue.targetId === panelId && cue.t >= M.lock && cue.t < M.thermal;
  const busy = run === 'running';

  const capture = () => {
    if (onPanel) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        void detect(canvas, {
          panelId,
          roi: moduleRoi(cue.t, cue.target, canvas.width / canvas.height),
          source: `the drone's camera over ${panelId}, live`,
        });
      }
      return;
    }
    if (result) void detectImage(result.frame, { panelId, source: `the captured frame for ${panelId}, run again` });
  };

  return (
    <Blk b="detector" title={<>Detector<span className="count">runs in this browser</span></>} aside={<Why />}>
      <div className="actions">
        <button type="button" className="tool" onClick={capture} disabled={busy || (!onPanel && !result)}>
          <ScanSearch size={16} strokeWidth={1.75} aria-hidden />
          {busy ? 'Running the detector' : onPanel ? 'Run on this live frame'
            : result ? 'Run on the captured frame again' : 'Nothing captured yet'}
        </button>
        {/* The same weights through this browser's own pipeline, on the photograph
            the committed figure was measured on. If the two agree, every step
            between the pixels and the box is verified in front of whoever asks. */}
        {evidence.rgb && committed && hasCapturedEvidence(panelId) && (
          <button
            type="button" className="tool" disabled={busy}
            onClick={() => void detectImage(evidence.rgb as string, { panelId, source: 'the committed evidence photograph' })}
          >
            <BadgeCheck size={16} strokeWidth={1.75} aria-hidden />
            Verify against the committed {confidence(committed.confidence)}
          </button>
        )}
      </div>

      {!onPanel && !result && (
        <p className="empty">Dispatch a drone and follow it. The detector runs itself during the pass and what it found is kept here.</p>
      )}

      {(busy || log.length > 0) && (
        <ol className="well runs num">
          {busy && <li>Run {runs + 1}, the network is executing</li>}
          {log.map((line) => (
            <li key={line.run} data-latest={line.run === runs && !busy}>
              Run {line.run}, {wallClock(line.at)}, {line.elapsedMs} ms, {line.found === 0 ? 'nothing found' : `${line.found} found`}, {line.source}
            </li>
          ))}
        </ol>
      )}

      {result && <DetectionBoxes result={result} />}
      {result && (
        <p className="one">
          Run {result.run} of {result.source}
          {result === fromFlight && (frames > 1 ? `, the clearest of ${frames} frames from this pass` : ', captured on the pass')}.
        </p>
      )}

      {status === 'missing' && <p className="one"><b>Detector not loaded.</b> {reason}</p>}
      {status === 'failed' && <p className="one" data-sev="warning"><span className="sev-ink">The run failed: {reason}.</span> Nothing is drawn.</p>}
      {run === 'done' && result && result.detections.length > 0 && (
        <p className="one">
          <b>{result.detections.length}</b> {result.detections.length === 1 ? 'detection' : 'detections'} on that frame,
          at <b className="num">{result.detections.map((d) => confidence(d.confidence)).join(', ')}</b>,
          computed in {result.elapsedMs} ms. Nothing here was cached.
        </p>
      )}
      {run === 'done' && result && result.detections.length === 0 && (
        <p className="one">
          <b>The model found nothing in that frame</b> ({result.elapsedMs} ms). That is a real result and it stands:
          the detector was trained on photographs, and a rendered panel is not one.
        </p>
      )}
      <div className="work workings">
        <p>The exported network on the WebAssembly runtime: the same weights as the committed run, a different runtime.</p>
        <p>The box covers the whole module because every training example labels the panel, not the fracture. Where on the module is the thermal grid&apos;s job.</p>
        {surface && result && fromFlight && (
          <p>
            {cracked ? 'Two modules of this array are textured with photographs of real panels, one cracked and one intact'
              : 'One module of this array is textured with a photograph of a real intact panel'}
            , because the detector returns nothing on a flat-shaded render. That is surface material, not a camera frame. {surface.provenance}.
          </p>
        )}
      </div>
    </Blk>
  );
}

/* ── The anomaly matrix: the signature element ─────────────────────────────── */

export function MatrixPanel() {
  const panelId = useSelectedPanelId();
  const grid = useCellGrid();
  const filled = useMatrixFillCount();
  const clock = useInspectionClock();

  // Gated twice: on the array that was imaged, and on a drone having read it.
  if (!hasCapturedEvidence(panelId)) return null;
  const scanning = clock >= BEAT.thermalScan;
  const hotRows = [...new Set(grid.defects.map((d) => d.row))].join(', ');
  const shown = grid.defects
    .slice().sort((a, b) => a.row - b.row || a.col - b.col)
    .filter((d) => (d.row - 1) * grid.cols + (d.col - 1) < filled);

  return (
    <Blk
      b="matrix"
      title={<>Anomaly matrix<span className="count num">{grid.rows} × {grid.cols} cells</span></>}
      aside={<Why />}
    >
      {!scanning ? (
        <p className="empty well">The matrix fills cell by cell as the drone&apos;s thermal pass reads the module.</p>
      ) : (
        <>
          <p className="one">
            Cell-mean ΔT: {grid.defects.length} hot cells in row {hotRows}, {grid.clusters} {grid.clusters === 1 ? 'cluster' : 'clusters'}.
          </p>
          <div className="matrix num" role="img" aria-label={`Thermal map of the module, ${grid.rows} rows by ${grid.cols} columns`}>
            <span />
            {grid.matrix[0].map((_, c) => <span key={c} className="hd">{c + 1}</span>)}
            {grid.matrix.map((row, r) => [
              <span key={`r${r}`} className="hd">R{r + 1}</span>,
              ...row.map((dt, c) => {
                const on = r * grid.cols + c < filled;
                const defect = grid.defects.some((d) => d.row === r + 1 && d.col === c + 1);
                return (
                  <span
                    key={`${r}-${c}`}
                    className="cell"
                    data-on={on}
                    data-defect={on && defect}
                    data-ink={normaliseDeltaT(dt) > DARK_TEXT_ABOVE ? 'dark' : 'light'}
                    style={on ? { background: ironbowForDeltaT(dt) } : undefined}
                    title={on ? `R${r + 1} C${c + 1} ${deltaT(dt)}` : undefined}
                  >
                    {on && Math.abs(dt) >= LABEL_ABOVE_C ? deltaT(dt).replace(' °C', '') : ''}
                  </span>
                );
              }),
            ])}
          </div>
          {/* The list is what makes the grid legible, and the accessible channel. */}
          <ol className="defects">
            {shown.map((d) => (
              <li key={`${d.row}-${d.col}`}>
                <i className="dot" style={{ background: ironbowForDeltaT(d.deltaTC) }} />
                <span>R{d.row}, C{d.col}, {d.type}</span>
                <span className="fig num">{deltaT(d.deltaTC)}</span>
              </li>
            ))}
          </ol>
          <p className="one">Each figure is how much hotter that cell runs than the rest of the panel.</p>
          <p className="work workings">
            ΔT is a cell mean under a declared {grid.thermalSpanC} °C span, baseline {degC(grid.baselineTempC)};
            the source is normalised 8-bit, not radiometric.
          </p>
        </>
      )}
    </Blk>
  );
}

/* ── Agent reasoning, asked at runtime ─────────────────────────────────────── */

/** Past this, the prose says it is describing an earlier moment. */
const STALE_AFTER_SITE_HOURS = 0.5;

export function ReasoningPanel() {
  const panelId = useSelectedPanelId();
  const siteSeconds = useSiteSeconds();
  const entry = useTriage((s) => s.byPanel[panelId]);
  const request = useTriage((s) => s.request);
  const retry = useTriage((s) => s.retry);
  const condition = usePanelStatus(panelId);
  const injected = useInjected();
  const hazards = useHazards();

  // Asked once per array and per condition. Site time is deliberately not a
  // dependency: the verdict is about the array, not about this second.
  useEffect(() => {
    void request(panelId, siteSeconds, condition, injected, hazards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId, condition, request]);

  const t = entry?.triage;
  const askedAt = entry?.requestedAt;
  const elapsedH = Math.max(0, (siteSeconds - (askedAt ?? siteSeconds)) / 3600);

  return (
    <Blk
      b="reasoning"
      title={<>Agent triage{entry?.model && <span className="count id">{entry.model}</span>}</>}
      aside={<Why />}
    >
      {(!entry || entry.status === 'loading') && (
        <div className="skeleton" role="status" aria-label={`Triaging ${panelId}`}><i /><i /><i /></div>
      )}
      {entry?.status === 'unavailable' && (
        <>
          <p className="one">
            <span className="chip" data-sev="warning">Agent unavailable</span> No reasoning for <span className="id">{panelId}</span>.
            Every reading on this screen comes from the site model, not from the agent.
            {entry.retriable && ' It will ask again shortly.'}
          </p>
          <p className="work workings">{entry.reason}</p>
          <button type="button" className="tool" onClick={() => void retry(panelId, siteSeconds, condition, injected, hazards)}>
            <RotateCw size={16} strokeWidth={1.75} aria-hidden />Ask again
          </button>
        </>
      )}
      {entry?.status === 'ready' && t && (
        <>
          <p>{typographic(t.reasoning)}</p>
          <p className="one">{typographic(t.verificationRationale)}</p>
          {elapsedH >= STALE_AFTER_SITE_HOURS && askedAt !== undefined && (
            <p className="one">Written at {siteClockAt(askedAt)}, {hours(elapsedH)} of site time ago. The readings beside it are current.</p>
          )}
          <p className="work workings">
            Suspect <span className="id">{t.suspectComponent}</span>, severity {t.severity}, confidence {confidence(t.confidence)},
            physical verification {t.requiresPhysicalVerification ? 'required' : 'not required'}.
            Every number in it was checked against this array&apos;s telemetry before it was shown.
          </p>
        </>
      )}
    </Blk>
  );
}

/* ── The peer comparison ───────────────────────────────────────────────────── */

export function InverterPanel() {
  const panelId = useSelectedPanelId();
  const readings = useInverterReadings();
  const index = panelId.split('-')[1];
  return (
    <Blk b="inverters" title="Same string, three inverters">
      <p className="one">The string at this position on each inverter. Only one of them is short.</p>
      <table className="tbl">
        <thead><tr><th>Inverter</th><th>String</th><th>Actual</th><th>Expected</th><th>Deviation</th></tr></thead>
        <tbody>
          {Object.entries(readings).map(([id, r]) => (
            <tr key={id} data-sev={r.deviationPct < -1 ? 'critical' : undefined} data-hot={r.deviationPct < -1}>
              <td className="id">{id}</td>
              <td className="id">{id.replace('INV-', '')}-{index}-S3</td>
              <td className="num">{kW(r.actualKW)}</td>
              <td className="num">{kW(r.expectedKW)}</td>
              <td className="num">{pct(r.deviationPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Blk>
  );
}

/* ── The committed agent run ───────────────────────────────────────────────── */

/**
 * The prognosis and recommendation from the committed run. They were written
 * about B-17 after its inspection, so they appear for B-17 after an inspection
 * and nowhere else: the same scoping as the capture they were reasoned from.
 */
export function CommittedRunPanel() {
  const panelId = useSelectedPanelId();
  const cache = useAgentCache();
  const inspected = useInspected(panelId);
  if (!cache || !hasCapturedEvidence(panelId) || !inspected) return null;

  return (
    <Blk
      b="committed"
      title={<>Prognosis and recommendation<span className="count id">{cache.meta.model}</span></>}
      aside={<Why />}
    >
      <p>{typographic(cache.prognosis.reasoning)}</p>
      <ol className="steps">
        {cache.recommendation.steps.map((step) => (
          <li key={step} data-state="done"><i className="dot" /><span className="step">{typographic(step)}</span></li>
        ))}
      </ol>
      <p className="one">{typographic(cache.recommendation.costOfDelayNote)}</p>
      <p className="work workings">
        From the committed run on {cache.meta.provider}, checked against the physics offline. The numbers in it
        come from the generator; the model wrote the prose around them.
      </p>
    </Blk>
  );
}
