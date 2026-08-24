import { I } from '../../core/utils.js';
import { SCENARIOS, T } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { Choice } from '../../components/Choice.jsx';
import { svgMap } from '../../components/svg.js';

/* ---------- S1 · TIER 1 — the six blocking fields ---------- */

const TIER1_NOTE =
  'Six fields block. Everything else in this product is <b>optional at submission</b> and captured ' +
  'afterwards. Five of the six are already answered by the vehicle, so the driver <b>confirms ' +
  'rather than types</b>. An abandoned FNOL is strictly worse than an incomplete one: an ' +
  'incomplete report still starts the clock, still dispatches recovery, still gives the driver ' +
  "something to hand the police officer. A form that demands the other party&rsquo;s policy " +
  'number before it accepts anything gets closed at the roadside.';

const ART9_NOTE =
  "<b style='color:#546b62'>GDPR Art. 9 &mdash; health data.</b> A roadside app on a driver&rsquo;s " +
  "phone is not an appropriate basis for collecting someone&rsquo;s medical details, and a shaken " +
  'driver is not a reliable source for them. The loss adjuster gathers this later under a proper ' +
  "basis, from the person it belongs to. <b style='color:#546b62'>Presence + severity band + " +
  'emergency attended</b> is everything the reserve and the notification actually need.';

const VISIBLE_REFUSAL_NOTE =
  'A missing field reads as an oversight. A <b>visible refusal</b> reads as a decision. This is ' +
  'the same reason the no-fault omission is annotated rather than silent &mdash; restraint that ' +
  'nobody notices buys you nothing in a review.';

const MONEY_FIELD_NOTE =
  '&ldquo;Can you drive it&rdquo; answered at minute 2 instead of hour 6 is the single ' +
  'highest-value field in the form. It starts recovery, and it starts &mdash; or does not start ' +
  '&mdash; the <b>credit hire clock</b>. Replacement-vehicle exposure on a tractor unit runs into ' +
  'hundreds of euros a day, and the meter is running whether or not anyone has been told.';

const TYPE_LABELS = {
  collision: 'Collision with another vehicle',
  glass: 'Glass / windscreen',
  theft: 'Vehicle stolen',
};

const TYPE_OPTIONS = [
  ['collision', 'Collision with another vehicle'],
  ['glass', 'Glass / windscreen'],
  ['theft', 'Vehicle stolen'],
  ['animal', 'Animal'],
  ['single', 'Single vehicle — no one else involved'],
  ['cargo', 'Cargo damage'],
  ['other', 'Other'],
];

/* Damage that came with the main event. "What happened" stays one question
   with one answer, because the answer routes the claim — one cause, one cover
   section. But a collision can also set a load moving or break glass, and
   asking twice would be the same question twice. */
const ALSO_OPTIONS = [
  ['glass', 'Glass broken'],
  ['cargo', 'Load shifted or damaged'],
  ['fire', 'Fire'],
  ['spill', 'Spill or leak'],
];

/** The row shows the whole answer: the cause, what it actually was if
    "other", and anything else that got damaged. */
function typeSummary(d){
  const base = d.type === 'other'
    ? (d.typeOther?.trim() || 'Other')
    : (TYPE_LABELS[d.type] || d.type);
  const also = (d.alsoDamaged || [])
    .map(v => (ALSO_OPTIONS.find(o => o[0] === v) || [, v])[1].toLowerCase());
  return also.length ? `${base} · also ${also.join(', ')}` : base;
}

const SEVERITY_OPTIONS = [
  ['walking', 'Walking and talking'],
  ['needs_help', 'Needs help but conscious'],
  ['serious', 'Serious'],
];

/**
 * One pre-filled row.
 *
 * Tapping the row confirms it, and tapping again unconfirms — a mistap has to
 * be correctable. Editing is a separate control rather than the same gesture,
 * so a driver checking values quickly cannot wipe one by accident.
 *
 * A corrected value keeps what the vehicle originally reported alongside it.
 * The driver's correction wins on the form; the handler still sees both, and
 * which is which.
 */
export function fieldRow({ ic, label, value, state, act, hint, editKey, corrected }) {
  const confirmed = state === 'confirmed';

  return (
    <div className={`frow-wrap${confirmed ? ' is-confirmed' : ''}`}>
      <button className={`frow ${state || ''}`} data-act={act}>
        <span className="frow-ic" dangerouslySetInnerHTML={{ __html: ic }} />
        <span className="frow-body">
          <span className="frow-label">{label}</span>
          <span className={`frow-value${value ? '' : ' empty'}`}>{value || '—'}</span>
          {corrected && (
            <span className="frow-corrected">
              you corrected this · truck reported &ldquo;{corrected.from}&rdquo;
            </span>
          )}
        </span>
        <span className="frow-right">
          {confirmed
            ? <span className="tick" style={{ color: 'var(--ok)' }} dangerouslySetInnerHTML={{ __html: I.chk }} />
            : <span className="tiny" style={{ fontSize: '11px' }}>{hint || ''}</span>}
          {editKey && (
            <span className="frow-edit" data-act="edit-field" data-v={editKey} role="button" tabIndex={0}>
              Not right?
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

/** Inline correction for one row. */
function EditRow({ editKey, label, value, hint }) {
  return (
    <div className="frow-editor">
      <label className="lbl" htmlFor={`edit-${editKey}`}>{label}</label>
      <input
        id={`edit-${editKey}`}
        className="inp"
        data-editfield={editKey}
        defaultValue={value}
        placeholder={hint}
        autoComplete="off"
      />
      <p className="tiny" style={{ margin: '8px 0 10px', lineHeight: 1.45 }}>
        What the truck reported is kept either way, so the handler can see both.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-primary btn-sm" data-act="save-field" data-v={editKey}>
          Use my version
        </button>
        <button className="btn btn-ghost btn-sm" data-act="cancel-edit">Cancel</button>
      </div>
    </div>
  );
}

/** Injury detail: presence, band, and whether help is there. Never a diagnosis. */
function InjuryDetail({ d }) {
  return (
    <>
      <div className="sp12" />
      <p className="lbl">How bad — roughly?</p>
      {SEVERITY_OPTIONS.map(([v, l]) => (
        <Choice key={v} act="set-severity" value={v} label={l} selected={d.injurySeverity === v} />
      ))}

      <div className="sp12" />
      <p className="lbl">Are emergency services there?</p>
      <div className="grid2">
        <Choice act="set-emergency" value="yes" label="Yes" selected={d.injuryEmergency === true} />
        <Choice act="set-emergency" value="no" label="Not yet" selected={d.injuryEmergency === false} />
      </div>

      {/* The Art. 9 field — visibly greyed, reason inline. The restraint is the feature. */}
      <div className="sp12" />
      <div className="blocked-field dn-anchor">
        <div className="bf-label">Description of the injuries</div>
        <div className="bf-fake">Deliberately not collected here</div>
        <div className="bf-why">
          <span dangerouslySetInnerHTML={{ __html: I.warn }} />
          <div dangerouslySetInnerHTML={{ __html: ART9_NOTE }} />
        </div>
      </div>

      {dn('Why show a field you refuse to have', VISIBLE_REFUSAL_NOTE)}
    </>
  );
}

export function scrTier1() {
  const s = Store.s;
  const d = s.draft;
  const sc = SCENARIOS[s.scenario];

  // Count what the DRIVER has settled, not what arrived pre-filled. Counting
  // pre-filled values made the screen open at "5 of 6", telling a driver they
  // had completed five things before they had touched anything.
  const answered = [
    d.vehicleConfirmed,
    d.timeConfirmed,
    d.locationConfirmed,
    d.typeConfirmed,
    d.injured !== null,
    d.drivable !== null,
  ].filter(Boolean).length;

  const ready = d.vehicleConfirmed && d.timeConfirmed && d.locationConfirmed
    && d.typeConfirmed && d.injured !== null && d.drivable !== null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="scroll">
        <div className="pad" style={{ paddingTop: '16px' }}>
          <h2 className="h2">{T('tier1')}</h2>
          <p className="sub" style={{ fontSize: '14.5px' }}>{T('tier1sub')}</p>
          <div className="sp16" />
        </div>

        <div className="pad">
          {dn('Two-tier mandatory — the whole argument in one screen', TIER1_NOTE)}

          {fieldRow({
            ic: I.truck, label: 'Vehicle', value: d.vehicle,
            state: d.vehicleConfirmed ? 'confirmed' : 'pending',
            act: 'confirm-vehicle', hint: 'tap to confirm',
            editKey: 'vehicle', corrected: d.corrected?.vehicle,
          })}
          {s.editing === 'vehicle' && (
            <EditRow editKey="vehicle" label="Registration" value={d.vehicle} hint="B-RL 4471" />
          )}

          {fieldRow({
            ic: I.clock, label: 'Date & time',
            value: `${d.occurredAt} · ${new Date().toLocaleDateString('de-DE')}`,
            state: d.timeConfirmed ? 'confirmed' : 'pending',
            act: 'confirm-time', hint: 'tap to confirm',
            editKey: 'time', corrected: d.corrected?.occurredAt,
          })}
          {s.editing === 'time' && (
            <EditRow editKey="time" label="Time it happened" value={d.occurredAt} hint="14:32" />
          )}

          <div style={{ marginTop: '9px' }}>
            {fieldRow({
              ic: I.pin, label: 'Location', value: d.location,
              state: d.locationConfirmed ? 'confirmed' : 'pending',
              act: 'confirm-location', hint: 'tap to confirm',
              editKey: 'location', corrected: d.corrected?.location,
            })}
            {s.editing === 'location' && (
              <EditRow
                editKey="location"
                label="Where it happened"
                value={d.location}
                hint="Road, km marker, direction"
              />
            )}
            {!d.locationConfirmed && s.editing !== 'location' && (
              <div
                style={{
                  marginTop: '8px', borderRadius: '14px',
                  overflow: 'hidden', border: '1px solid var(--line)',
                }}
                dangerouslySetInnerHTML={{ __html: svgMap(sc, true) }}
              />
            )}
          </div>

          <div style={{ marginTop: '9px' }}>
            {fieldRow({
              ic: I.crash, label: 'What happened',
              value: typeSummary(d),
              state: d.typeConfirmed ? 'confirmed' : 'pending',
              act: 'confirm-type', hint: 'tap to confirm',
              // corrected by picking from the list rather than typing, but
              // entered through the same 'Not right?' control as the others
              editKey: 'type',
            })}
          </div>

          {s.subScreen === 'type' && (
            <div className="type-picker">
              {TYPE_OPTIONS.map(([v, l]) => (
                <Choice key={v} act="set-type" value={v} label={l} selected={d.type === v} />
              ))}

              {/* Picking "Other" without being able to say what it was leaves a
                  claim nobody can route. */}
              {d.type === 'other' && (
                <div style={{ marginTop: '10px' }}>
                  <label className="lbl" htmlFor="type-other">What happened?</label>
                  <input
                    id="type-other"
                    className="inp"
                    data-field="typeOther"
                    defaultValue={d.typeOther || ''}
                    placeholder="A few words is enough"
                    autoComplete="off"
                  />
                </div>
              )}

              {/* One question — "what happened" — with room for the damage that
                  came with it. Asking a separate "any other damage?" question
                  would be the same question twice. */}
              <div className="also-block">
                <p className="lbl" style={{ marginBottom: '8px' }}>
                  Anything else damaged? <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}>Optional</span>
                </p>
                <div className="also-chips">
                  {ALSO_OPTIONS.filter(([v]) => v !== d.type).map(([v, l]) => (
                    <button
                      key={v}
                      className={`also-chip${(d.alsoDamaged || []).includes(v) ? ' on' : ''}`}
                      data-act="toggle-also"
                      data-v={v}
                      aria-pressed={String((d.alsoDamaged || []).includes(v))}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Everything above came from the truck; everything below is the
              driver's own answer. The rule marks that change of source. */}
          <div className="sect-rule" role="separator" />

          <div className="dn-anchor">
            <p className="lbl" style={{ fontSize: '15px', color: 'var(--ink)' }}>
              5 · Is anyone hurt?
            </p>
            <div className="grid2">
              <Choice act="set-injured" value="no" label="No one" selected={d.injured === false} />
              <Choice act="set-injured" value="yes" label="Yes" selected={d.injured === true} />
            </div>
          </div>

          {d.injured === true && <InjuryDetail d={d} />}

          {/* 6 — the money field */}
          <div className="sp20" />
          <div className="dn-anchor">
            <p className="lbl" style={{ fontSize: '15px', color: 'var(--ink)' }}>
              6 · Are you in a safe enough condition to drive?
            </p>
            <div className="grid2">
              <Choice act="set-drivable" value="yes" label="Yes" selected={d.drivable === true} />
              <button
                className="choice"
                data-act="set-drivable"
                data-v="no"
                aria-pressed={String(d.drivable === false)}
              >
                <span
                  className="cbox round"
                  dangerouslySetInnerHTML={{ __html: d.drivable === false ? I.chkS : '' }}
                />
                <span>
                  No
                  <span className="choice-sub">We mark it off the road</span>
                </span>
              </button>
            </div>
          </div>

          {dn('The money field', MONEY_FIELD_NOTE)}
          <div className="sp28" />
        </div>
      </div>

      <div className="dock">
        <button
          className={`btn ${ready ? 'btn-primary' : 'btn-secondary'} btn-lg`}
          data-act="submit-tier1"
          disabled={!ready || undefined}
          style={ready ? undefined : { opacity: 0.5 }}
        >
          {ready ? T('submit') : `${6 - answered} ${T('stillToCheck')}`}
        </button>

      </div>
    </div>
  );
}
