/**
 * src/lib/rehearsal.ts — picking an array to break, without a random number.
 *
 * WHY THIS EXISTS. The Rehearsal screen defaults its target to whatever array is
 * currently selected, so an operator pressing INJECT a few times in a row put
 * every fault on the same handful of arrays and the site never looked like a site.
 * What was wanted was "surprise me" — somewhere new, somewhere else on the map.
 *
 * WHY IT IS NOT `Math.random()`. That call is banned across `src/` (CLAUDE.md §3)
 * and the ban is load-bearing rather than fussy: the whole product's claim is that
 * the same inputs give the same site, every reload, so a judge who re-runs the
 * demo sees what they saw before. A random target would make an injected fault the
 * one thing on screen nobody could reproduce.
 *
 * SO IT WALKS THE SITE ON A COPRIME STRIDE. Stepping 47 arrays at a time through
 * 120 visits every array exactly once before repeating — 47 and 120 share no
 * factors — and consecutive picks land in different zones, which is what makes it
 * *look* arbitrary. It is completely determined by how many faults have already
 * been injected, so the third press always lands where the third press landed.
 */

import { allPanels } from './live';
import type { LiveFrame } from './live';

/**
 * Coprime with 120, and large enough that consecutive picks are nowhere near each
 * other. 47 sends the walk across zone boundaries every step.
 */
const STRIDE = 47;

/**
 * The next array worth breaking: healthy, not already carrying an injection, and
 * a long way from the last one.
 *
 * `step` is the caller's own count — how many faults it has injected so far. The
 * same count always yields the same array.
 */
export function nextRehearsalTarget(
  frame: LiveFrame,
  taken: ReadonlySet<string>,
  step: number,
): string | null {
  const n = allPanels.length;
  const start = (step * STRIDE) % n;

  for (let i = 0; i < n; i += 1) {
    const panel = allPanels[(start + i) % n];
    if (taken.has(panel.id)) continue;
    // Only an array that is currently fine: injecting onto one that is already
    // degraded would stack two causes on one object, which the store refuses
    // anyway and which is an operator mistake rather than a scenario.
    if ((frame.panels[panel.id]?.status ?? 'healthy') !== 'healthy') continue;
    return panel.id;
  }

  // Every array is already faulted. Saying so beats returning one that is not.
  return null;
}
