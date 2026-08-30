/**
 * src/lib/money.ts — the losses in rupees, under an assumption the operator sets.
 *
 * WHY THIS IS DELICATE. CLAUDE.md §1 is explicit: do not quote a tariff or a
 * soiling-loss figure unless it comes from a named source you can show. That rule
 * exists because an unsourced statistic in a pitch is a rejection signal, and it
 * has kept every number in this product defensible.
 *
 * It does not, however, mean money cannot appear. It means money cannot appear as
 * a FACT. A plant manager thinks in rupees and not in megawatt-hours, and refusing
 * to convert leaves the most important consequence of the whole system illegible
 * to the person who would buy it.
 *
 * So the tariff is an ASSUMPTION THE OPERATOR OWNS. It is:
 *
 *   - shown on screen, always, next to any figure derived from it
 *   - changeable, so anyone who thinks it is wrong can put their own number in
 *     and watch every rupee figure move
 *   - never cited to a source, because we have not got one
 *   - never baked into a stored value — it multiplies MWh at render time
 *
 * "At ₹3.00/kWh — change this — B-17 is costing ₹3,030 a day" is a defensible
 * sentence. "B-17 is costing ₹3,030 a day" is not, and the difference is eight
 * words. An assumption you declare is credible; a statistic you cannot source is
 * not.
 */

/**
 * The starting tariff, in rupees per kWh.
 *
 * A round number deliberately, so that nobody mistakes it for a researched figure
 * and so the arithmetic is checkable in your head: at ₹3/kWh, one MWh is ₹3,000.
 * Indian utility-scale PPA tariffs have been bid across a wide band and we are not
 * going to pretend to know which one applies to this block.
 */
export const DEFAULT_TARIFF_INR_PER_KWH = 3.0;

/** Rupees for an energy quantity in MWh, at a given tariff. */
export const inrForMWh = (mwh: number, tariffPerKWh: number): number =>
  mwh * 1000 * tariffPerKWh;

/**
 * Indian digit grouping — ₹12,34,567, not ₹1,234,567.
 *
 * The site is in Rajasthan and the figure is in rupees, so grouping it the way
 * every other rupee figure in the country is grouped is the difference between a
 * console built for this site and one that had a currency symbol swapped in.
 */
export function formatINR(value: number): string {
  const rounded = Math.round(Math.abs(value));
  const sign = value < 0 ? '−' : '';
  const s = String(rounded);

  if (s.length <= 3) return `${sign}₹${s}`;

  // Last three digits, then pairs, which is what the lakh/crore system does.
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${sign}₹${grouped},${last3}`;
}

/**
 * A rupee figure that always carries the assumption it rests on.
 *
 * Returning the caveat with the number, rather than leaving it to each caller to
 * remember, is what stops a bare ₹ figure ending up on a slide on its own.
 */
export function inrWithBasis(mwh: number, tariffPerKWh: number): {
  amount: string;
  basis: string;
} {
  return {
    amount: formatINR(inrForMWh(mwh, tariffPerKWh)),
    basis: `at ₹${tariffPerKWh.toFixed(2)}/kWh — an assumption, not a sourced tariff`,
  };
}
