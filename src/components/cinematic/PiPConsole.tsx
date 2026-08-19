'use client';

/**
 * PiPConsole — THE SMARTEST ELEMENT IN THE DESIGN, and nearly free.
 *
 * This renders the ACTUAL <ConsoleRoot /> at scale(0.31). Not a screenshot, not a
 * video, not a simplified mock — the same component tree the console view uses,
 * driven by the same clock, mounted at the same time.
 *
 * That is why it is persuasive: the audience watches the operator console react in
 * real time to the physical event happening behind it, and nobody has to claim the
 * two halves are one system. If it were a capture, this would be theatre. Because
 * it is the real tree, it is proof.
 *
 * It costs one component boundary and works only because ConsoleRoot is a pure
 * function of the store with no route-level state — which is why that rule has been
 * enforced since Phase 2.
 */

import { ConsoleRoot } from '@/components/console/ConsoleRoot';

const SCALE = 0.31;
const W = 1920 * SCALE;   // 595.2
const H = 1080 * SCALE;   // 334.8

function Bracket({ style }: { style: React.CSSProperties }) {
  return <span aria-hidden style={{ position: 'absolute', width: 16, height: 16, ...style }} />;
}

export function PiPConsole() {
  return (
    <div style={{ position: 'absolute', bottom: 32, left: 32 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        width: W, paddingBottom: 6,
      }}>
        <span className="t-h1" style={{ color: 'var(--sev-active)', letterSpacing: '0.14em' }}>
          ⊡ CMD FEED · OPERATOR
        </span>
        <span className="t-h1" style={{ color: 'var(--text-secondary)' }}>SLAVED</span>
      </div>

      <div style={{
        position: 'relative', width: W, height: H,
        border: '2px solid var(--sev-active)',
        background: 'var(--surface-void)',
        overflow: 'hidden',
      }}>
        {/* aria-hidden: this is a second rendering of content the console view
            already exposes. Announcing it twice would be noise, not access. */}
        <div
          aria-hidden
          style={{
            width: 1920, height: 1080,
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <ConsoleRoot />
        </div>

        <Bracket style={{ top: -1, left: -1, borderTop: '2px solid var(--sev-active)', borderLeft: '2px solid var(--sev-active)' }} />
        <Bracket style={{ top: -1, right: -1, borderTop: '2px solid var(--sev-active)', borderRight: '2px solid var(--sev-active)' }} />
        <Bracket style={{ bottom: -1, left: -1, borderBottom: '2px solid var(--sev-active)', borderLeft: '2px solid var(--sev-active)' }} />
        <Bracket style={{ bottom: -1, right: -1, borderBottom: '2px solid var(--sev-active)', borderRight: '2px solid var(--sev-active)' }} />
      </div>
    </div>
  );
}
