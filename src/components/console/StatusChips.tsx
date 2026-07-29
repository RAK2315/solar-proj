'use client';

/**
 * StatusChips — the two verdict chips above the inverter table.
 *
 *   ● CRITICAL   suspect: INV-B
 *   RISK HIGH    act before 14:00
 *
 * Both are DERIVED, not written by the agent. The suspect component comes from
 * farm.json's wiring (which inverter drives B-17), the severity from the panel's
 * status, and the deadline from forecast.json's computed thermal-dose crossing.
 * The agent writes prose about these; it never sources them.
 */

import { useForecast, usePanelStatus, useSelectedPanelId } from '@/store/selectors';
import { getPanel } from '@/lib/data';

export function StatusChips() {
  const panelId = useSelectedPanelId();
  const status = usePanelStatus(panelId);
  const forecast = useForecast();
  const panel = getPanel(panelId);
  if (!panel) return null;

  const critical = status === 'critical';
  const colour = critical ? 'var(--sev-critical)'
    : status === 'scheduled' ? 'var(--panel-scheduled)' : 'var(--sev-warning)';

  return (
    <div style={{
      display: 'grid', gap: 'var(--sp-2)',
      border: '1px solid var(--line-hairline)', padding: 'var(--sp-3)',
      background: 'var(--surface-inset)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <span className="badge badge-solid" style={{ background: colour }}>
          ● {status}
        </span>
        <span className="t-data" style={{ color: 'var(--text-secondary)' }}>
          suspect: <span className="t-data-em" style={{ color: 'var(--text-primary)' }}>
            {panel.inverterId}
          </span>
        </span>
      </div>

      {/* A deadline only exists if something is actually degrading. Showing
          "act before 14:00" over a healthy array would be the clearest possible
          sign that the panel is decoration rather than a readout. */}
      {status === 'critical' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span className="badge" style={{ color: 'var(--sev-warning)', borderColor: 'var(--sev-warning)' }}>
            Risk high
          </span>
          <span className="t-data" style={{ color: 'var(--text-secondary)' }}>
            act before <span className="t-data-em" style={{ color: 'var(--sev-warning)' }}>
              {forecast.actBefore}
            </span>
          </span>
        </div>
      ) : (
        <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
          {status === 'healthy'
            ? 'Within tolerance. No intervention scheduled.'
            : 'Degraded. Monitor; no hard deadline yet.'}
        </span>
      )}
    </div>
  );
}
