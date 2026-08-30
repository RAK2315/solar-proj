/**
 * The operator's session, and what survives a refresh.
 *
 * A work order that evaporates when the tab reloads is not a work order, so this
 * asserts the round trip. It also asserts what is DELIBERATELY not stored: every
 * reading, status and mission phase is recomputed from the model on load, and a
 * stored copy of any of them would be a second place for a number to live.
 *
 * The storage is reached through the store's own persist API rather than by
 * naming a browser global, which is the same reason the lint rule exists.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { MISSION_TOTAL, missionPhaseAt, useSession } from './session';

const STORAGE_KEY = 'surya-session';
const storage = () => useSession.persist.getOptions().storage!;

/**
 * A reload, as faithfully as one can be staged in a test process.
 *
 * The store writes through on every `set`, so wiping it in memory also wipes what
 * was saved — which is not what a refresh does. So: take the snapshot the browser
 * would have kept, blank the live store, put the snapshot back, and rehydrate.
 */
async function reload() {
  const saved = await storage().getItem(STORAGE_KEY);
  useSession.setState(fresh);
  await storage().setItem(STORAGE_KEY, saved!);
  await useSession.persist.rehydrate();
}

const fresh = {
  mode: 'live' as const, module: 'site' as const, siteSeconds: 0, running: true,
  timeScale: 60, selectedPanelId: null, missions: [], workOrders: [],
};

beforeEach(async () => {
  useSession.setState(fresh);
  await storage().removeItem(STORAGE_KEY);
});

describe('the session survives a refresh', () => {
  it('writes the operator’s work to storage', async () => {
    useSession.setState({ siteSeconds: 900 });
    useSession.getState().dispatch('B-17');
    useSession.getState().createWorkOrder('B-17', 'Replace module B2-07.');

    const stored = await storage().getItem(STORAGE_KEY);
    expect(stored?.state.workOrders).toHaveLength(1);
    expect(stored?.state.missions[0].panelId).toBe('B-17');
    expect(stored?.state.siteSeconds).toBe(900);
  });

  it('restores it on rehydrate, as a reload would', async () => {
    useSession.setState({ siteSeconds: 900, module: 'repairs' });
    useSession.getState().dispatch('A-03');
    useSession.getState().createWorkOrder('A-03', 'Clean and re-test.');

    await reload();

    const s = useSession.getState();
    expect(s.workOrders[0].id).toBe('INC-A03');
    expect(s.missions[0].panelId).toBe('A-03');
    expect(s.siteSeconds).toBe(900);
    expect(s.module).toBe('repairs');
  });

  it('restores a mission such that its phase is recomputed, not replayed', async () => {
    useSession.setState({ siteSeconds: 0 });
    useSession.getState().dispatch('A-03');
    useSession.setState({ siteSeconds: MISSION_TOTAL + 60 });

    await reload();

    const s = useSession.getState();
    expect(missionPhaseAt(s.missions[0], s.siteSeconds)).toBe('complete');
  });
});

describe('only the operator’s own state is stored', () => {
  it('stores no readings, statuses or phases', async () => {
    useSession.getState().dispatch('B-17');
    const stored = await storage().getItem(STORAGE_KEY);
    const keys = Object.keys(stored!.state as Record<string, unknown>);

    // The exact key set, asserted rather than sampled, so a READING cannot drift
    // into storage. Everything here is something the operator did or chose:
    // `tariffInrPerKWh` is their declared assumption about electricity price, not
    // a measurement, and it persists for the same reason a work order does —
    // retyping it after every reload would make it feel like a toy.
    expect(keys.sort()).toEqual([
      'feedFilter', 'injected', 'missions', 'mode', 'module', 'overrides',
      'running', 'selectedPanelId', 'showWorkings', 'siteSeconds',
      'tariffInrPerKWh', 'theme', 'timeScale', 'workOrders',
    ]);
  });

  it('stores no functions', async () => {
    useSession.getState().dispatch('B-17');
    const stored = await storage().getItem(STORAGE_KEY);
    const values = Object.values(stored!.state as Record<string, unknown>);
    expect(values.some((v) => typeof v === 'function')).toBe(false);
  });

  it('clears on reset, so a rehearsal can start from nothing', async () => {
    useSession.getState().dispatch('B-17');
    useSession.getState().createWorkOrder('B-17', 'x');
    useSession.getState().resetSession();

    expect(useSession.getState().workOrders).toHaveLength(0);
    const stored = await storage().getItem(STORAGE_KEY);
    expect(stored?.state.missions).toHaveLength(0);
  });
});

describe('entering the demo does not destroy live work', () => {
  it('keeps missions and orders when the mode flips', () => {
    useSession.getState().dispatch('B-17');
    useSession.getState().createWorkOrder('B-17', 'x');

    useSession.getState().setMode('demo');
    expect(useSession.getState().workOrders).toHaveLength(1);

    useSession.getState().setMode('live');
    expect(useSession.getState().missions).toHaveLength(1);
  });
});
