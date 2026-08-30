/**
 * src/lib/plain.ts — the same facts, in words anyone can read.
 *
 * WHY THIS EXISTS. The console is written in the language of the trade, and that
 * is correct: an operator says "array deviation", "irradiance", "string", and a
 * console that says "sun strength" instead would read as a toy to the person who
 * has to use it. But the people this product has to convince FIRST — a judge, an
 * investor, a plant owner's finance director — do not speak it, and a screen full
 * of terms they cannot parse reads as complicated rather than as capable.
 *
 * So nothing is renamed and nothing is softened. The precise term keeps its place,
 * its unit and its identifier, and a plain sentence goes NEXT to it. Both, not
 * either.
 *
 * WHY IT IS A MODULE AND NOT STRINGS IN COMPONENTS. The sentences that carry a
 * quantity are DERIVED from the reading, exactly like the figure above them. If a
 * component typed "producing 42% less", that would be a headline number hardcoded
 * in `src/` — which is the thing `npm run check:literals` exists to fail the build
 * over, and rightly. Being pure also means they can be tested, and the wording can
 * be changed in one place rather than in nine.
 *
 * RULES FOR ANY SENTENCE ADDED HERE
 *   - It restates a fact the product already computed. It never adds one.
 *   - It rounds for readability and says "about" when it does.
 *   - It never states a certainty the data does not carry.
 *   - No units-free numbers, no marketing, no exclamation.
 */

/** Whole percent, unsigned, for prose. `−41.71` → `42`. */
const roughPct = (v: number): number => Math.round(Math.abs(v));

/**
 * What an array's deviation means, as a sentence.
 *
 * The threshold matches `AnalysisBlock`'s own `deviating` test, so the sentence
 * and the colour of the figure above it can never disagree.
 */
export function plainDeviation(deviationPct: number): string {
  if (deviationPct >= -1) return 'Producing what the model expects for these conditions.';
  return `Producing about ${roughPct(deviationPct)}% less power than it should right now.`;
}

/**
 * What a projected loss means.
 *
 * "if nothing is done" is the load-bearing half. The figure is a projection under
 * an explicit no-intervention assumption, and a reader who takes it as a
 * measurement of what WILL happen has been misled by the omission.
 */
export function plainLoss(mwh: number, overHours = 72): string {
  const days = Math.round(overHours / 24);
  return `About ${mwh.toFixed(1)} MWh of electricity never generated over the next ${days} days, if nothing is done.`;
}

/**
 * What a string deviation means, and why it is a different number from the array's.
 *
 * This distinction is a credibility marker — see CLAUDE.md §8 — and it is exactly
 * the kind of thing that reads as an inconsistency to someone who does not know
 * the vocabulary. Two numbers about the same panel that disagree look like a bug
 * until you are told they measure different objects.
 */
export function plainStringDeviation(stringPct: number, faulted: number, total: number): string {
  return `That is one damaged group of panels, down ${roughPct(stringPct)}%. `
    + `${faulted} of the array's ${total} groups are affected, which is why the array's own figure is smaller.`;
}

/**
 * Glossary. A term an operator uses, and what it means to everyone else.
 *
 * Deliberately short — one clause each. These sit under a label at caption size,
 * and a paragraph there would rebuild the wall of text the redesign removed.
 */
export const PLAIN: Record<string, string> = {
  irradiance: 'how strong the sunlight is',
  cellTemp: 'how hot the panel itself is',
  arrayOutput: 'what this array is generating',
  expected: 'what the model says it should generate',
  ambient: 'air temperature in the shade',
  inverter: 'the unit this array feeds into',
  string: 'one wired group of panels inside the array',
  deviation: 'the gap between actual and expected',
  deltaT: 'how much hotter than the rest of the panel',
};
