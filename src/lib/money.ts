/**
 * src/lib/money.ts — lost energy in rupees, at a tariff with a source.
 *
 * THE ONLY FILE THAT MAY NAME THE TARIFF. `check:literals` fails the build on
 * either auction figure written anywhere else, so no screen can quote one of
 * them alone for the whole block.
 *
 * WHAT THE FIGURE IS. Bhadla Phase-III Solar Park is 500 MW, which is the block
 * this product models. SECI auctioned it in 2017 as two lots, at two tariffs,
 * fixed for 25 years with no escalation. The tariff for the block as a whole is
 * therefore neither lot's: it is the two blended by capacity, and the blend is
 * COMPUTED here and its arithmetic printed on screen. The owner accepted this
 * calculation on 6 Oct 2026 for the prototype and may refine it.
 *
 * WHAT THE FIGURE IS NOT. It is not a deviation settlement charge. CERC's
 * formula in force divides by a parameter the regulation does not publish and
 * its Normal Rate is a live exchange price, so no such charge can be computed
 * from a primary source and nothing here attempts to. The regulation is cited as
 * the reason a shortfall matters, and rupees come from lost energy times this
 * tariff. `check:literals` fails the build on a deviation-charge identifier.
 */

export interface TariffLot {
  winner: string;
  /** Capacity awarded, MW. */
  mw: number;
  /** Rupees per kWh. */
  inrPerKWh: number;
}

/** The two lots of the SECI Bhadla Phase-III auction, as awarded. */
export const BHADLA_PHASE_III_LOTS: readonly TariffLot[] = [
  { winner: 'ACME Solar Holdings', mw: 200, inrPerKWh: 2.44 },
  { winner: 'SBG Cleantech', mw: 300, inrPerKWh: 2.45 },
];

export const TARIFF_SOURCE = {
  auction: 'SECI auction, Bhadla Phase-III Solar Park, 2017',
  terms: 'fixed for 25 years, no escalation, SECI as off-taker',
  /** Both read by the owner. Checked 6 Oct 2026. */
  urls: [
    'https://www.iea.org/policies/6373-auction-of-solar-corporation-of-india-seci',
    'https://www.pv-magazine-india.com/?p=1613',
  ],
  checked: '6 Oct 2026',
} as const;

const TOTAL_MW = BHADLA_PHASE_III_LOTS.reduce((sum, lot) => sum + lot.mw, 0);

/** The block's tariff: the lots blended by the capacity each was awarded. */
export const TARIFF_INR_PER_KWH = BHADLA_PHASE_III_LOTS
  .reduce((sum, lot) => sum + lot.mw * lot.inrPerKWh, 0) / TOTAL_MW;

/** Three decimals: the blend is exact at three and two would round it to one lot's figure. */
export const tariffText = (inrPerKWh = TARIFF_INR_PER_KWH): string => `₹${inrPerKWh.toFixed(3)}/kWh`;

const lotRate = (inrPerKWh: number): string => `₹${inrPerKWh.toFixed(2)}`;

/** The blend, written out so it can be checked by eye. */
export const TARIFF_ARITHMETIC = `(${BHADLA_PHASE_III_LOTS
  .map((lot) => `${lot.mw} MW × ${lotRate(lot.inrPerKWh)}`)
  .join(' + ')}) ÷ ${TOTAL_MW} MW = ${tariffText()}`;

/** Who was awarded what. */
export const TARIFF_LOTS_TEXT = BHADLA_PHASE_III_LOTS
  .map((lot) => `${lot.winner} ${lot.mw} MW at ${lotRate(lot.inrPerKWh)}/kWh`)
  .join(', ');

/** The few words that travel with every rupee figure. */
export const TARIFF_BASIS = `at ${tariffText()}, the SECI Bhadla Phase-III tariffs blended by capacity`;

/** Rupees for an energy quantity in MWh. */
export const inrForMWh = (mwh: number): number => mwh * 1000 * TARIFF_INR_PER_KWH;

/**
 * Indian digit grouping: ₹12,34,567, not ₹1,234,567.
 *
 * The site is in Rajasthan and the figure is in rupees, so it is grouped the way
 * every other rupee figure in the country is grouped.
 */
export function formatINR(value: number): string {
  const rounded = Math.round(Math.abs(value));
  const sign = value < 0 ? '−' : '';
  const s = String(rounded);

  if (s.length <= 3) return `${sign}₹${s}`;

  // Last three digits, then pairs, which is what the lakh and crore system does.
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${sign}₹${grouped},${last3}`;
}

/** Lost energy as lost revenue, formatted. Never shown without `TARIFF_BASIS` beside it. */
export const lostRevenue = (mwh: number): string => formatINR(inrForMWh(mwh));
