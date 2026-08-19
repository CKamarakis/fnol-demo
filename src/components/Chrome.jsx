import { useEffect } from 'react';
import { SCENARIOS } from '../data/domain.js';
import { Store } from '../core/store.js';

/* ==================================================================
   §6 CHROME (demo scaffolding — deliberately not product-styled)
   ================================================================== */

function Seg({ items, current, kind }) {
  return (
    <div className="seg">
      {items.map(([v, l]) => (
        <button key={v} data-act={`set-${kind}`} data-v={v} aria-pressed={String(current === v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Toggle({ act, on, label, fire }) {
  return (
    <button
      className={`tog${fire ? ' fire' : ''}`}
      data-act={act}
      aria-pressed={fire ? undefined : String(!!on)}
    >
      <i className="dot" />
      {label}
    </button>
  );
}

/**
 * The demo harness bar, rendered into its own root above the product.
 *
 * Styled deliberately unlike the product: this is scaffolding, and it must
 * never be mistaken for the thing being demonstrated.
 */
export function renderChrome() {
  const s = Store.s;
  const anyFailure = s.fail.tpa || s.fail.offline || s.fail.coverage;

  return (
    <>
      <ChromeEffects notes={s.notes} />

      {/* row 1 — who is looking, and at which scenario */}
      <div className="chrome-row">
        <span className="chrome-brand"><b>INS</b> FNOL</span>
        <span className="chrome-hint">demo harness — not the product</span>
        <div className="chrome-sep" />

        <span className="chrome-tag">Persona</span>
        <Seg
          items={[['driver', 'Driver'], ['fleet', 'Fleet manager'], ['system', 'System']]}
          current={s.persona}
          kind="persona"
        />
        <div className="chrome-sep" />

        <span className="chrome-tag">Scenario</span>
        <Seg
          items={Object.values(SCENARIOS).map(x => [x.id, x.label])}
          current={s.scenario}
          kind="scenario"
        />

        <div className="chrome-spacer" />
        <button className="tog note" data-act="toggle-notes" aria-pressed={String(s.notes)}>
          <i className="dot" />
          Design notes
        </button>
        <button className="chrome-btn danger" data-act="reset">Reset</button>
      </div>

      {/* row 2 — failure theatre: flip these mid-flow */}
      <div className="chrome-row">
        <span className="chrome-tag">Failure theatre</span>
        <Toggle act="fail-tpa" on={s.fail.tpa} label="TPA down" />
        <Toggle act="fail-offline" on={s.fail.offline} label="No signal" />
        <Toggle act="triple-tap" label="Triple-tap submit" fire />
        <Toggle act="fail-coverage" on={s.fail.coverage} label="Vehicle not on schedule" />

        <div className="chrome-sep" />
        <span className="chrome-hint">
          {anyFailure
            ? "flip these mid-flow — the driver's screens do not change"
            : 'flip any of these mid-flow'}
        </span>

        <div className="chrome-spacer" />
        {s.persona !== 'system' && (
          <button className="chrome-btn" data-act="go-system">
            Watch it in the System pane →
          </button>
        )}
      </div>
    </>
  );
}

/**
 * Design notes are toggled by a body class, because the callouts they reveal
 * are scattered across every screen. Kept in an effect rather than inline:
 * it is a document-level side effect, not part of this component's tree.
 */
function ChromeEffects({ notes }) {
  useEffect(() => {
    document.body.classList.toggle('notes-on', !!notes);
  }, [notes]);

  useEffect(() => {
    const bar = document.getElementById('chrome');
    if (bar) {
      document.documentElement.style.setProperty('--chrome-h', `${bar.offsetHeight || 88}px`);
    }
  });

  return null;
}
