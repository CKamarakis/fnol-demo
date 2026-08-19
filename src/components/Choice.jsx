import { I } from '../core/utils.js';

/**
 * A yes/no or multi-option button.
 *
 * Repeated across the driver screens, which is why it lives here: the tap
 * target, the tick affordance and the pressed state must be identical
 * everywhere. A driver learning the control once should not have to relearn
 * it three screens later.
 */
export function Choice({ act, value, label, selected, children }) {
  return (
    <button
      className="choice"
      data-act={act}
      data-v={value}
      aria-pressed={String(!!selected)}
    >
      <span className="cbox round" dangerouslySetInnerHTML={{ __html: selected ? I.chkS : '' }} />
      <span>{label ?? children}</span>
    </button>
  );
}

/** Two Choices side by side — the shape of nearly every question in the flow. */
export function YesNo({ act, value, yes = 'Yes', no = 'No', style }) {
  return (
    <div className="grid2" style={style}>
      <Choice act={act} value="yes" label={yes} selected={value === true} />
      <Choice act={act} value="no" label={no} selected={value === false} />
    </div>
  );
}

/** An inline advisory note, optionally warning-toned. */
export function Note({ icon = I.info, tone, children, style }) {
  return (
    <div className="card-quiet" style={style}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <span
          style={{ color: tone === 'warn' ? 'var(--warn)' : 'var(--ink-3)', flex: 'none', marginTop: '2px' }}
          dangerouslySetInnerHTML={{ __html: icon }}
        />
        <p className="tiny" style={{ lineHeight: 1.5 }}>{children}</p>
      </div>
    </div>
  );
}
