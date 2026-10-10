import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useSession } from '@/store/session';
import { WorkflowPanel } from './WorkflowPanel';
import { LinkedMatrix } from './LinkedMatrix';

afterEach(() => { cleanup(); useSession.getState().resetSession(); useWorkflow.setState({ open: false, tab: 'evidence', watchingRepair: null, inspection: null }); });

it('links a matrix selection to one array and never borrows its readings for another', () => {
  useSession.getState().resetSession();
  const view = render(<LinkedMatrix panelId="B-17" />);
  fireEvent.click(screen.getByRole('button', { name: /Row 2, column 4/ }));
  expect(useWorkflow.getState().selectedCell).toEqual({ panelId: 'B-17', row: 2, col: 4 });
  expect(screen.getByRole('status').textContent).toContain('Recorded hot-band cell');
  view.rerender(<LinkedMatrix panelId="A-01" />);
  expect(screen.queryAllByRole('button')).toHaveLength(0);
  expect(screen.getByText(/No measured cell matrix/)).toBeTruthy();
});

it('opens the cutaway layers and ties its cell selection to the matrix', () => {
  useSession.getState().resetSession();
  useSession.setState({ selectedPanelId: 'B-17', siteSeconds: 3000, running: false });
  useWorkflow.setState({ tab: 'cutaway' });
  const { container } = render(<WorkflowPanel />);
  expect(container.querySelector('.cutaway-stage')?.getAttribute('data-open')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Close the layers' }));
  expect(container.querySelector('.cutaway-stage')?.getAttribute('data-open')).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: 'Select illustrated cell R2 C4' }));
  expect(useWorkflow.getState().selectedCell?.col).toBe(4);
  expect(screen.getByRole('button', { name: /Row 2, column 4/ }).getAttribute('aria-pressed')).toBe('true');
});

it('keeps approval, simulated dispatch and evidence verification as separate gates', () => {
  useSession.getState().resetSession();
  useSession.setState({ selectedPanelId: 'B-17', siteSeconds: 3000, running: false });
  useWorkflow.setState({ tab: 'repair' });
  render(<WorkflowPanel />);
  expect(screen.getByRole('button', { name: /Approve and create work order/ }).hasAttribute('disabled')).toBe(true);
  act(() => useSession.setState({ missions: [{ id: 'mission', droneId: 'DRONE 01', panelId: 'B-17', startedAt: 0, phase: 'returning' }] }));
  fireEvent.click(screen.getByRole('button', { name: /Approve and create work order/ }));
  expect(useSession.getState().workOrders).toHaveLength(1);
  expect(useWorkflow.getState().repairs).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: /Dispatch simulated crew/ }));
  const run = useWorkflow.getState().repairs[0];
  expect(run).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Watch in the field' }));
  expect(useSession.getState().timeScale).toBe(600);
  expect(useSession.getState().running).toBe(true);
  expect(useSession.getState().followFlight).toBe(false);
  expect(useWorkflow.getState().watchingRepair).toBe('B-17');
  expect(useWorkflow.getState().repairs[0]).toEqual(run);
  act(() => useSession.setState({ siteSeconds: run.completedAt }));
  expect(screen.getByRole('button', { name: 'Accept simulated verification' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'Close incident' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByText(/Recorded thermal evidence remains/)).toBeTruthy();
});
