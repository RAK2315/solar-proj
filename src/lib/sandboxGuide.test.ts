import { describe, expect, it } from 'vitest';
import { describeHazard } from './sandboxGuide';
import { HAZARD_SPEC, type HazardEvent } from './hazard';
import { arrayCentre } from './scene';

const p = arrayCentre('B-17');
const cloud: HazardEvent = { id: 'test', kind: 'cloud', ...HAZARD_SPEC.cloud, cx: p.x, cy: p.z, startHour: 10 };

describe('sandbox explanations follow the simulated hazard lifecycle', () => {
  it('distinguishes the footprint from arrays actually affected before and during the ramp', () => {
    const before = describeHazard(cloud, 9, ['B-17', 'C-31']);
    expect(before.state).toBe('Waiting');
    expect(before.inside).toContain('B-17');
    expect(before.affected).toEqual([]);
    const during = describeHazard(cloud, 10 + 1 / 60, ['B-17', 'C-31']);
    expect(during.state).toBe('Developing');
    expect(during.affected).toEqual(['B-17']);
    expect(during.strength).toBeCloseTo(0.5);
  });

  it('ends a cloud at the same boundary as the model and rewinds without stale affected arrays', () => {
    expect(describeHazard(cloud, 11.5, ['B-17']).affected).toEqual(['B-17']);
    const passed = describeHazard(cloud, 11.6, ['B-17']);
    expect(passed.state).toBe('Passed');
    expect(passed.affected).toEqual([]);
    expect(describeHazard(cloud, 9, ['B-17']).affected).toEqual([]);
  });

  it('applies heat site-wide and keeps dust until the event is removed', () => {
    const heat: HazardEvent = { id: 'heat', kind: 'heatwave', ...HAZARD_SPEC.heatwave, startHour: 10 };
    expect(describeHazard(heat, 11, ['B-17', 'C-31']).affected).toEqual(['B-17', 'C-31']);
    const dust: HazardEvent = { ...cloud, ...HAZARD_SPEC.dust, kind: 'dust' };
    expect(describeHazard(dust, 100, ['B-17']).state).toBe('Active');
    expect(describeHazard(dust, 100, ['B-17']).endsAt).toBeNull();
  });
});
