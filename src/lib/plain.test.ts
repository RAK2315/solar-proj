/**
 * The plain-language layer restates facts. It never adds one.
 *
 * That is the whole risk of this module: a sentence is much easier to make a
 * claim in than a number is, and a sentence next to a figure is read as having the
 * same authority as the figure. So what is asserted here is that every sentence
 * tracks the reading it describes, and that the ones carrying an assumption say so.
 */

import { describe, expect, it } from 'vitest';

import { evaluateArray, G_REF, T_AMB_REF } from './physics';
import { plainDeviation, plainLoss, plainStringDeviation } from './plain';

describe('plainDeviation', () => {
  it('quotes the shortfall it was given, rounded, never a stored figure', () => {
    // B-17 at reference conditions, from the model — the same call the console
    // makes. If the physics moves, this sentence moves with it.
    const r = evaluateArray(G_REF, T_AMB_REF, { faultProgress: 1 });
    const dev = ((r.actualKW - r.expectedKW) / r.expectedKW) * 100;

    expect(plainDeviation(dev)).toContain(`${Math.round(Math.abs(dev))}%`);
    expect(plainDeviation(dev)).toMatch(/less power than it should/);
  });

  it('says an array is fine when it is fine, rather than saying nothing', () => {
    expect(plainDeviation(0)).toMatch(/what the model expects/);
    expect(plainDeviation(-0.4)).toMatch(/what the model expects/);
  });

  it('agrees with the threshold the figure above it is coloured by', () => {
    // AnalysisBlock treats < −1 % as deviating. If these two ever disagree the
    // console shows a red number under a sentence saying everything is fine.
    expect(plainDeviation(-1.5)).toMatch(/less power/);
    expect(plainDeviation(-1)).toMatch(/what the model expects/);
  });
});

describe('plainLoss', () => {
  it('states the no-intervention assumption, because the figure depends on it', () => {
    // Without "if nothing is done" this reads as a prediction of what will happen
    // rather than a projection of what happens if nobody acts — and the entire
    // product is about someone acting.
    expect(plainLoss(3.07)).toMatch(/if nothing is done/);
  });

  it('carries the figure and its window', () => {
    expect(plainLoss(3.07)).toContain('3.1 MWh');
    expect(plainLoss(3.07)).toContain('3 days');
  });
});

describe('plainStringDeviation', () => {
  it('explains why the two deviation figures differ, using both', () => {
    const sentence = plainStringDeviation(-58.4, 5, 7);
    expect(sentence).toContain('58%');
    expect(sentence).toContain('5 of the array');
    expect(sentence).toContain('7 groups');
  });
});
