import { I } from '../core/utils.js';

/**
 * A yes/no or multi-option button.
 *
 * Repeated across the driver screens, which is why it lives here: the tap
 * target, the tick affordance and the pressed state must be identical
 * everywhere. A driver learning the control once should not have to relearn
 * it three screens later.
 */
/**
 * `multi` squares the tick box. Round means "pick one", square means "pick any
 * number" — the convention every phone keyboard and settings screen already
 * teaches. Without it, a driver has to read the label to learn whether a
 * second tap replaces their first answer or adds to it, and on the injury
 * questions that is the difference between reporting one casualty and three.
 * The role follows the shape, so screen readers get the same distinction.
 */
export function Choice({ act, value, label, selected, multi, children }) {
  return (
    <button
      className="choice"
      data-act={act}
      data-v={value}
      role={multi ? 'checkbox' : undefined}
      aria-checked={multi ? String(!!selected) : undefined}
      aria-pressed={String(!!selected)}
    >
      <span
        className={`cbox${multi ? '' : ' round'}`}
        dangerouslySetInnerHTML={{ __html: selected ? I.chkS : '' }}
      />
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
