'use client';

/**
 * The tariff, wherever a rupee figure appears.
 *
 * A rupee figure is never shown bare. `TariffBasis` is the few words that travel
 * with each one. `TariffPanel` is the whole case, once, on the screen about
 * money: the arithmetic of the blend, who was awarded what, where it was read,
 * and why no deviation charge is computed.
 */

import {
  TARIFF_ARITHMETIC, TARIFF_BASIS, TARIFF_LOTS_TEXT, TARIFF_SOURCE, tariffText,
} from '@/lib/money';
import { FORECAST_BAND } from '@/lib/outlook';
import { Blk } from './Block';

/** Inline, beside a rupee figure. */
export function TariffBasis() {
  return <span className="basis">{TARIFF_BASIS}</span>;
}

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

export function TariffPanel() {
  return (
    <Blk b="tariff" title={<>Lost revenue<span className="count num">{tariffText()}</span></>}>
      <p className="one">Every rupee on this console is lost energy times one tariff. Nothing else goes into it.</p>
      <p className="well formula num">{TARIFF_ARITHMETIC}</p>
      <dl className="rows">
        <div><dt>Awarded</dt><dd>{TARIFF_LOTS_TEXT}</dd></div>
        <div><dt>Auction</dt><dd>{TARIFF_SOURCE.auction}</dd></div>
        <div><dt>Terms</dt><dd>{TARIFF_SOURCE.terms}</dd></div>
        <div>
          <dt>Read at</dt>
          <dd>
            {TARIFF_SOURCE.urls.map((url, i) => (
              <span key={url}>{i > 0 && ', '}<a className="src" href={url} target="_blank" rel="noreferrer">{hostOf(url)}</a></span>
            ))}
            , checked {TARIFF_SOURCE.checked}
          </dd>
        </div>
      </dl>
      <p className="one">
        The block is the two lots together, so its tariff is their blend by capacity and not either lot&apos;s figure.
        A prototype calculation, accepted by the project owner, open to refinement.
      </p>
      <p className="one">
        <b>No deviation charge is computed.</b> CERC&apos;s Deviation Settlement Mechanism Regulations, 2024, are why a
        shortfall against schedule matters beyond the energy itself. The formula in force depends on a parameter the
        regulation leaves to a separate order, and its rate is a live exchange price, so a charge cannot be worked
        out from the regulation alone and this console does not try.
      </p>
      <p className="one">
        The forecast band is ±{FORECAST_BAND.nowPct} % on irradiance now, widening to ±{FORECAST_BAND.at72hPct} % at {FORECAST_BAND.hours} h.
        A declared assumption, not a fitted error model: the forecast is generated, so it has no record of misses to fit one to.
      </p>
    </Blk>
  );
}
