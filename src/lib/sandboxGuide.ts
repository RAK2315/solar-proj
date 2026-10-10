import { AFFECTED_THRESHOLD, footprintWeight, hazardStrengthAt, type HazardEvent, type HazardKind } from './hazard';
import { arrayCentre } from './scene';

export const HAZARD_GUIDE: Record<HazardKind, { effect: string; why: string; action: string; next: string }> = {
  cloud: {
    effect: 'Temporary shading',
    why: 'Less irradiance reaches arrays inside the footprint. Their output falls against the site reference, and cooler cells can make the pattern resemble soiling.',
    action: 'Monitor the shaded arrays. A cloud creates no wash or repair job; existing electrical faults still need attention.',
    next: 'Advance site time until the cloud passes, then compare output again. If a shortfall remains, open that array’s incident and review the evidence.',
  },
  dust: {
    effect: 'Persistent soiling',
    why: 'Deposited dust keeps light off the cells. The model applies the strongest derate near the centre and tapers it towards the edge.',
    action: 'Review the new wash jobs and crew availability in Queue. The proposal still needs an operator’s approval.',
    next: 'Prioritise washes alongside existing faults. Remove this hazard to compare the scenario without dust; approving work records a decision and does not simulate a completed wash.',
  },
  heatwave: {
    effect: 'Site-wide temperature rise',
    why: 'Hotter cells produce less power. Expected and actual output use the warmer site reference, so a heatwave can reduce production without creating a new array shortfall.',
    action: 'Review heat-closed crew slots and any work that no longer fits in the day. Existing fault deadlines are recalculated; they do not necessarily move.',
    next: 'Open Queue to review unplaced jobs and the earliest feasible work. Remove the heatwave to compare crew capacity and energy output against the cooler scenario.',
  },
};

export function describeHazard(hazard: HazardEvent, hour: number, panelIds: readonly string[]) {
  const strength = hazardStrengthAt(hazard, hour);
  const state = hour < hazard.startHour ? 'Waiting'
    : hazard.durationHours !== null && hour > hazard.startHour + hazard.durationHours ? 'Passed'
      : strength < 1 ? 'Developing' : 'Active';
  const inside = panelIds.filter((id) => {
    if (hazard.kind === 'heatwave') return true;
    const p = arrayCentre(id);
    return hazard.intensity * footprintWeight(hazard, p.x, p.z) >= AFFECTED_THRESHOLD;
  });
  const affected = strength <= 0 ? [] : inside.filter((id) => {
    if (hazard.kind === 'heatwave') return true;
    const p = arrayCentre(id);
    return hazard.intensity * strength * footprintWeight(hazard, p.x, p.z) >= AFFECTED_THRESHOLD;
  });
  return { state, strength, inside, affected, endsAt: hazard.durationHours === null ? null : hazard.startHour + hazard.durationHours };
}
