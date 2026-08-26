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

const WHO_HURT_NOTE =
  'The standard was checked rather than guessed. <b>ACORD 2</b>&rsquo;s INJURED section is a table ' +
  'with one row per person, and its columns are <b>PED / INS VEH / OTH VEH</b> &mdash; which ' +
  'vehicle each injured party was in, or whether they were on foot. That is not decoration: it ' +
  'routes the claim. An injured third party is a <b>liability notification</b>, an injured driver ' +
  'is an <b>employer&rsquo;s liability</b> matter, and a pedestrian is neither. A single ' +
  '&ldquo;someone is hurt&rdquo; boolean cannot express any of it, and the handler has to phone ' +
  'back to ask. The same check settled the other direction: <b>no ACORD field asks whether the ' +
  'driver is fit to keep driving</b>, so the question that asked it has gone.<br><br>' +
  'Both questions here are <b>multi-select</b>, because the form is a table with one row per ' +
  'person and a table does not force one answer onto a group. A driver walking about, a ' +
  'passenger who needs help and someone unconscious is <i>one</i> accident with three bands, and ' +
  'a single band would set the reserve from whichever the driver happened to tap. ' +
  'No <b>count</b> field: asking a shaken person how many casualties there are invites a number ' +
  'they should not be asked to be sure of, and the bands already tell the handler whether to ' +
  'expect one ambulance or three.';

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

/**
 * Everything that can be reported, alphabetical.
 *
 * One list, used by the main answer and by any additional damage. A driver
 * scanning a dropdown under pressure should not have to learn where a category
 * sits — alphabetical is the only order that needs no explanation. "Other"
 * stays pinned to the end, because it is a fallback rather than a choice.
 */
const TYPE_OPTIONS = [
  ['animal', 'Animal'],
  ['cargo', 'Cargo or load damage'],
  ['collision', 'Collision with another vehicle'],
  ['fire', 'Fire'],
  ['glass', 'Glass or windscreen'],
  ['single', 'Single vehicle — no one else involved'],
  ['spill', 'Spill or leak'],
  ['theft', 'Theft of the vehicle'],
  ['vandalism', 'Vandalism'],
  ['weather', 'Weather or flood'],
  ['other', 'Other'],
];

const typeLabel = v => (TYPE_OPTIONS.find(o => o[0] === v) || [, v])[1];

/** The row shows the whole answer: what happened, plus anything else damaged. */
function typeSummary(d) {
  const base = d.type === 'other'
    ? (d.typeOther?.trim() || 'Other')
    : (TYPE_LABELS[d.type] || typeLabel(d.type));
  const also = (d.alsoDamaged || []).filter(Boolean).map(v => typeLabel(v).toLowerCase());
  return also.length ? `${base} · also ${also.join(', ')}` : base;
}

/**
 * The one control both the main answer and the extras use.
 *
 * A native select rather than a list of buttons: eleven options as full-width
 * rows pushed everything else off the screen, and a dropdown is the control a
 * driver already knows.
 */
function TypeSelect({ id, act, value, index, placeholder }) {
  return (
    <div className="lang-wrap type-wrap">
      <select
        id={id}
        className="lang-sel type-sel"
        data-act={act}
        data-v={index != null ? String(index) : undefined}
        defaultValue={value || ''}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <span className="lang-chev" dangerouslySetInnerHTML={{ __html: I.chevD }} />
    </div>
  );
}

const SEVERITY_OPTIONS = [
  ['walking', 'Walking and talking'],
  ['needs_help', 'Needs help but conscious'],
  ['serious', 'Serious'],
];

/* ACORD 2's INJURED table columns, in driver language. PED / INS VEH / OTH VEH
   on the form; "someone on foot" / "me" / "someone in the other vehicle" here.
   Still no names and no diagnoses — which party, not who or what. */
const WHO_HURT_OPTIONS = [
  ['driver', 'Me'],
  ['our_vehicle', 'Someone else in my vehicle'],
  ['other_vehicle', 'Someone in the other vehicle'],
  ['pedestrian', 'Someone on foot or on a bike'],
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
      {/* ACORD 2's INJURED section is a table with one row per person, and its
          columns are PED / INS VEH / OTH VEH — which vehicle each injured
          party was in, or whether they were on foot. It routes the claim: an
          injured third party is a liability notification, an injured driver is
          an employer's-liability matter, and a pedestrian is neither. Asked as
          a multi-select because more than one can be true.

          Who before how bad: the driver is looking at people, and naming them
          is what makes the severity question answerable. */}
      <div className="sp12" />
      <p className="lbl">Who is hurt? Tap all that apply.</p>
      {WHO_HURT_OPTIONS.map(([v, l]) => (
        <Choice key={v} act="toggle-injured-party" value={v} label={l}
          selected={(d.injuredParties || []).includes(v)} />
      ))}

      {/* Also multi-select, and for the same reason. A single band forces one
          answer onto a group — a walking driver and an unconscious passenger
          collapse to whichever the driver picks, and the reserve is set from
          the wrong one. Tapping every band that applies is honest and is still
          one tap per band. No count: "how many" invites a number a shaken
          driver should not be asked to be sure of, and the bands already tell
          the handler whether to send one ambulance or three. */}
      <div className="sp12" />
      <p className="lbl">How bad — roughly? Tap all that apply.</p>
      {SEVERITY_OPTIONS.map(([v, l]) => (
        <Choice key={v} act="toggle-severity" value={v} label={l}
          selected={(d.injurySeverity || []).includes(v)} />
      ))}

      <div className="sp12" />
      <p className="lbl">Are emergency services there?</p>
      <div className="grid2">
        <Choice act="set-emergency" value="yes" label="Yes" selected={d.injuryEmergency === true} />
        <Choice act="set-emergency" value="no" label="Not yet" selected={d.injuryEmergency === false} />
      </div>

      {/* The Art. 9 refusal is a design note, not a greyed-out field. A driver
          at the roadside gains nothing from a disabled input; the argument is
          for the reviewer, and it belongs where the other arguments live.
          Presence + severity + emergency attended is the whole collection. */}
      {dn('Checked against the standard, not guessed', WHO_HURT_NOTE)}
      {dn('The injury field we refuse to have', ART9_NOTE)}
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
              <label className="lbl" htmlFor="type-main">What happened?</label>
              <TypeSelect id="type-main" act="set-type" value={d.type} />

              {/* Picking "Other" without being able to say what it was leaves a
                  claim nobody can route. */}
              {d.type === 'other' && (
                <div style={{ marginTop: '10px' }}>
                  <label className="lbl" htmlFor="type-other">What was it?</label>
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

              {/* Still one question. A collision can also break glass and shift
                  a load, so the answer takes as many lines as it needs rather
                  than becoming a second question later in the flow. */}
              <div className="also-block">
                <p className="lbl">
                  Anything else damaged?{' '}
                  <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}>Optional</span>
                </p>

                {(d.alsoDamaged || []).map((v, i) => (
                  <div className="also-row" key={i}>
                    <TypeSelect
                      id={`type-also-${i}`}
                      act="set-also"
                      index={i}
                      value={v}
                      placeholder="Choose…"
                    />
                    <button
                      className="also-remove"
                      data-act="remove-also"
                      data-v={String(i)}
                      aria-label="Remove this one"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button className="also-add" data-act="add-also">
                  <span aria-hidden="true">+</span>
                  {(d.alsoDamaged || []).length ? 'Add another' : 'Add damage'}
                </button>
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
              6 · Can the vehicle still be driven?
            </p>
            {/* Plain yes/no. The sub-label promised "we mark it off the road",
                which is fleet-side language for a consequence the driver has no
                stake in — and arranging recovery is the fleet's job, not this
                system's. The answer is what matters; what it triggers belongs
                on the fleet screen. */}
            <div className="grid2">
              <Choice act="set-drivable" value="yes" label="Yes" selected={d.drivable === true} />
              <Choice act="set-drivable" value="no" label="No" selected={d.drivable === false} />
            </div>
          </div>

          {dn('The money field', MONEY_FIELD_NOTE)}

          <div className="sp28" />
        </div>
      </div>

      <div className="dock">
        {/* Two different controls wearing one slot. Submitting is impossible
            until six are answered, but the counter that says so was a disabled
            button — it named a number and refused to be tapped, while the field
            it counted was somewhere up the scroll. Unanswered, it is a live
            control that goes and finds the next one. */}
        {ready ? (
          <button className="btn btn-primary btn-lg" data-act="submit-tier1">
            {T('submit')}
          </button>
        ) : (
          <button className="btn btn-secondary btn-lg btn-seek" data-act="goto-unanswered">
            {`${6 - answered} ${T('stillToCheck')} · ${T('seekHint')}`}
          </button>
        )}
      </div>
    </div>
  );
}
