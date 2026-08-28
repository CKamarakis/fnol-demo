import { I } from '../../core/utils.js';
import { SCENARIOS, T, lang } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { tier1Answered, tier1Ready } from '../../core/tier1.js';
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

const DERIVED_DRIVABLE_NOTE =
  'ACORD 3 &middot; 38 asks whether the vehicle is drivable, and the answer is worth money: it ' +
  'sets the reserve and starts the credit-hire clock. For a theft the fact is <b>already ' +
  'determined</b> &mdash; the vehicle is gone, so it is not drivable and there is no address to ' +
  'inspect it at. Asking anyway would be ritual: a question with one possible answer, put to ' +
  'someone who has just lost a truck. So it is <b>derived from the incident type</b> and carried ' +
  'to the handler marked as derived, never as something the driver said. The blocking count is ' +
  'still six; one of them is settled by the facts rather than by a tap. This is the same move the ' +
  'flow already makes with vehicle, time and location &mdash; the unit reports, the driver ' +
  'confirms. Here there is nothing left to confirm.';

const MONEY_FIELD_NOTE =
  '&ldquo;Can you drive it&rdquo; answered at minute 2 instead of hour 6 is the single ' +
  'highest-value field in the form. It starts recovery, and it starts &mdash; or does not start ' +
  '&mdash; the <b>credit hire clock</b>. Replacement-vehicle exposure on a tractor unit runs into ' +
  'hundreds of euros a day, and the meter is running whether or not anyone has been told.';

/**
 * Everything that can be reported, alphabetical.
 *
 * One list, used by the main answer and by any additional damage. A driver
 * scanning a dropdown under pressure should not have to learn where a category
 * sits — alphabetical is the only order that needs no explanation. "Other"
 * stays pinned to the end, because it is a fallback rather than a choice.
 *
 * A FUNCTION, not a constant. These labels reach the driver, so they go
 * through T() — and a module-level array would resolve every one of them once
 * at import, freezing whichever language was active then. The keys are what is
 * stored and exported; only the labels are translated, so a report filed in
 * Polish still reads `type: "collision"` to the handler.
 *
 * Alphabetical in ENGLISH. Sorting per language would move a category between
 * languages, and the ordering argument is that a driver learns one position.
 * They do not switch language mid-report.
 */
export const TYPE_OPTIONS = () => [
  ['animal', T('tAnimal')],
  ['cargo', T('tCargo')],
  ['collision', T('tCollision')],
  ['fire', T('tFire')],
  ['glass', T('tGlass')],
  ['single', T('tSingle')],
  ['spill', T('tSpill')],
  ['theft', T('tTheft')],
  ['vandalism', T('tVandalism')],
  ['weather', T('tWeather')],
  ['other', T('tOther')],
];

const typeLabel = v => (TYPE_OPTIONS().find(o => o[0] === v) || [, v])[1];

/**
 * When it happened, as one string.
 *
 * Both halves come from the draft. An earlier build rendered
 * `new Date().toLocaleDateString()` beside the stored time, so the date was
 * never stored, never sent to the handler, and silently wrong for any report
 * filed after midnight or reopened the next day — which this artifact, emailed
 * and opened for months, does by design.
 */
/* The unit reports an instant; the driver reads a date in their own language.
   Stored as ISO so the value is language-independent, formatted here where the
   current language is known — a date formatted at seed time would keep
   whichever language created the report, and a French driver saw
   "19 August 2026". A driver correction is stored as typed and shown back
   unchanged: their words are the record, not something to reformat. */
const DATE_LOCALE = { en: 'en-GB', de: 'de-DE', fr: 'fr-FR', nl: 'nl-NL', pl: 'pl-PL' };

export function dateLabel(iso) {
  if (!iso) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;   // the driver typed it
  const loc = DATE_LOCALE[lang()] || 'en-GB';
  try {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString(loc, {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    });
  } catch { return iso; }
}

export function whenLabel(d) {
  const on = dateLabel(d.occurredOn);
  return on ? `${d.occurredAt} · ${on}` : d.occurredAt;
}

/** The row shows the whole answer: what happened, plus anything else damaged. */
export function typeSummary(d) {
  const base = d.type === 'other'
    ? (d.typeOther?.trim() || T('tOther'))
    : typeLabel(d.type);
  const also = (d.alsoDamaged || []).filter(Boolean).map(v => typeLabel(v).toLowerCase());
  return also.length ? `${base} · ${T('tAlso')} ${also.join(', ')}` : base;
}

/**
 * The one control both the main answer and the extras use.
 *
 * A native select rather than a list of buttons: eleven options as full-width
 * rows pushed everything else off the screen, and a dropdown is the control a
 * driver already knows.
 */
export function TypeSelect({ id, act, value, index, placeholder }) {
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
        {TYPE_OPTIONS().map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <span className="lang-chev" dangerouslySetInnerHTML={{ __html: I.chevD }} />
    </div>
  );
}

/* Functions for the same reason as TYPE_OPTIONS: the labels are read by a
   driver and must follow the language, the keys are what is stored. */
export const SEVERITY_OPTIONS = () => [
  ['walking', T('oWalking')],
  ['needs_help', T('oNeedsHelp')],
  ['serious', T('oSerious')],
];

/* ACORD 2's INJURED table columns, in driver language. PED / INS VEH / OTH VEH
   on the form; "someone on foot" / "me" / "someone in the other vehicle" here.
   Still no names and no diagnoses — which party, not who or what. */
export const WHO_HURT_OPTIONS = () => [
  ['driver', T('oDriver')],
  ['our_vehicle', T('oOurVeh')],
  ['other_vehicle', T('oOtherVeh')],
  ['pedestrian', T('oPed')],
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
              {T('fNotRight')}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

/** Inline correction for one row. Shared with the chat, which puts the same
    editor in the answer slot of a turn rather than under a row. */
export function EditRow({ editKey, label, value, hint, second }) {
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
      {/* A row can carry two values that belong to one fact. Date and time are
          the case: the unit reports a single instant, and a driver correcting
          when it happened may need to move either half — an incident found at
          00:20 belongs to yesterday. Editing one and being unable to see the
          other is how a report ends up dated the day it was filed. */}
      {second && (
        <>
          <label className="lbl" htmlFor={`edit-${second.key}`} style={{ marginTop: '10px' }}>
            {second.label}
          </label>
          <input
            id={`edit-${second.key}`}
            className="inp"
            data-editfield={second.key}
            defaultValue={second.value}
            placeholder={second.hint}
            autoComplete="off"
          />
        </>
      )}
      <p className="tiny" style={{ margin: '8px 0 10px', lineHeight: 1.45 }}>
        {T('fKeepBoth')}
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-primary btn-sm" data-act="save-field" data-v={editKey}>
          {T('fUseMine')}
        </button>
        <button className="btn btn-ghost btn-sm" data-act="cancel-edit">{T('fCancel')}</button>
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
      <p className="lbl">{T('fWhoHurt')}</p>
      {WHO_HURT_OPTIONS().map(([v, l]) => (
        <Choice key={v} act="toggle-injured-party" value={v} label={l} multi
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
      <p className="lbl">{T('fHowBad')}</p>
      {SEVERITY_OPTIONS().map(([v, l]) => (
        <Choice key={v} act="toggle-severity" value={v} label={l} multi
          selected={(d.injurySeverity || []).includes(v)} />
      ))}

      <div className="sp12" />
      <p className="lbl">{T('fEmergency')}</p>
      <div className="grid2">
        <Choice act="set-emergency" value="yes" label={T('fYes')} selected={d.injuryEmergency === true} />
        <Choice act="set-emergency" value="no" label={T('fNotYet')} selected={d.injuryEmergency === false} />
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

  /* Both the form and the chat collect these six, so what "answered" and
     "ready" mean lives in core/tier1.js and is shared. Two screens that block
     on the same six must never be able to disagree about whether they are
     done — see the note there. */
  const answered = tier1Answered(d);
  const ready = tier1Ready(d);

  // Six fields block, always. For a theft, `drivable` arrives pre-answered
  // from freshDraft(), so it is already inside `answered` and this counts only
  // what is still visible on screen — a driver told "1 still to check" with
  // nothing left to check would be reading a bug.
  const outstanding = 6 - answered;

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
            ic: I.truck, label: T('fVehicle'), value: d.vehicle,
            state: d.vehicleConfirmed ? 'confirmed' : 'pending',
            act: 'confirm-vehicle', hint: T('fTapConfirm'),
            editKey: 'vehicle', corrected: d.corrected?.vehicle,
          })}
          {s.editing === 'vehicle' && (
            <EditRow editKey="vehicle" label={T('fReg')} value={d.vehicle} hint="B-RL 4471" />
          )}

          {fieldRow({
            ic: I.clock, label: T('fWhen'),
            value: whenLabel(d),
            state: d.timeConfirmed ? 'confirmed' : 'pending',
            act: 'confirm-time', hint: T('fTapConfirm'),
            editKey: 'time', corrected: d.corrected?.occurredAt,
          })}
          {s.editing === 'time' && (
            <EditRow
              editKey="time" label={T('fTimeLbl')} value={d.occurredAt} hint="14:32"
              second={{ key: 'date', label: T('fDateLbl'), value: dateLabel(d.occurredOn), hint: dateLabel('2026-08-19') }}
            />
          )}

          <div style={{ marginTop: '9px' }}>
            {fieldRow({
              ic: I.pin, label: T('fLocation'), value: d.location,
              state: d.locationConfirmed ? 'confirmed' : 'pending',
              act: 'confirm-location', hint: T('fTapConfirm'),
              editKey: 'location', corrected: d.corrected?.location,
            })}
            {s.editing === 'location' && (
              <EditRow
                editKey="location"
                label={T('fWhereLbl')}
                value={d.location}
                hint={T('fWhereHint')}
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
              ic: I.crash, label: T('fWhat'),
              value: typeSummary(d),
              state: d.typeConfirmed ? 'confirmed' : 'pending',
              act: 'confirm-type', hint: T('fTapConfirm'),
              // corrected by picking from the list rather than typing, but
              // entered through the same 'Not right?' control as the others
              editKey: 'type',
            })}
          </div>

          {s.subScreen === 'type' && (
            <div className="type-picker">
              <label className="lbl" htmlFor="type-main">{T('fWhat')}</label>
              <TypeSelect id="type-main" act="set-type" value={d.type} />

              {/* Picking "Other" without being able to say what it was leaves a
                  claim nobody can route. */}
              {d.type === 'other' && (
                <div style={{ marginTop: '10px' }}>
                  <label className="lbl" htmlFor="type-other">{T('fWhatWasIt')}</label>
                  <input
                    id="type-other"
                    className="inp"
                    data-field="typeOther"
                    defaultValue={d.typeOther || ''}
                    placeholder={T('fFewWords')}
                    autoComplete="off"
                  />
                </div>
              )}

              {/* Still one question. A collision can also break glass and shift
                  a load, so the answer takes as many lines as it needs rather
                  than becoming a second question later in the flow. */}
              <div className="also-block">
                <p className="lbl">
                  {T('fAlsoDamaged')}{' '}
                  <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}>{T('fOptional')}</span>
                </p>

                {(d.alsoDamaged || []).map((v, i) => (
                  <div className="also-row" key={i}>
                    <TypeSelect
                      id={`type-also-${i}`}
                      act="set-also"
                      index={i}
                      value={v}
                      placeholder={T('fChoose')}
                    />
                    <button
                      className="also-remove"
                      data-act="remove-also"
                      data-v={String(i)}
                      aria-label={T('fRemoveOne')}
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button className="also-add" data-act="add-also">
                  <span aria-hidden="true">+</span>
                  {(d.alsoDamaged || []).length ? T('fAddAnother') : T('fAddDamage')}
                </button>
              </div>

              {/* The picker closes on its own control, like the text editors
                  do. The row above it can still be tapped to confirm, but that
                  is a second gesture for one intention and it is above the
                  fold once the also-damaged list has a few rows in it. */}
              <button className="btn btn-primary btn-sm type-done" data-act="type-done">
                {T('fDone')}
              </button>
            </div>
          )}

          {/* Everything above came from the truck; everything below is the
              driver's own answer. The rule marks that change of source. */}
          <div className="sect-rule" role="separator" />

          <div className="dn-anchor">
            <p className="lbl" style={{ fontSize: '15px', color: 'var(--ink)' }}>
              {T('q5')}
            </p>
            <div className="grid2">
              <Choice act="set-injured" value="no" label={T('fNoOne')} selected={d.injured === false} />
              <Choice act="set-injured" value="yes" label={T('fYes')} selected={d.injured === true} />
            </div>
          </div>

          {d.injured === true && <InjuryDetail d={d} />}

          {/* 6 — the money field.

              Not asked when the vehicle is gone. "Can the vehicle still be
              driven?" has no answer a theft victim can give, and the fact it
              exists to establish is already settled by the incident type: a
              stolen vehicle is not drivable and has no inspection address.
              freshDraft() pre-answers it and marks it derived, so the field
              still reaches the handler, the six-field count is untouched, and
              the driver is not asked to confirm the obvious about a truck
              they cannot see. */}
          {sc.type !== 'theft' && (
            <>
              <div className="sp20" />
              <div className="dn-anchor">
                <p className="lbl" style={{ fontSize: '15px', color: 'var(--ink)' }}>
                  {T('q6')}
                </p>
                {/* Plain yes/no. The sub-label promised "we mark it off the road",
                    which is fleet-side language for a consequence the driver has no
                    stake in — and arranging recovery is the fleet's job, not this
                    system's. The answer is what matters; what it triggers belongs
                    on the fleet screen. */}
                <div className="grid2">
                  <Choice act="set-drivable" value="yes" label={T('fYes')} selected={d.drivable === true} />
                  <Choice act="set-drivable" value="no" label={T('fNo')} selected={d.drivable === false} />
                </div>
              </div>

              {dn('The money field', MONEY_FIELD_NOTE)}
            </>
          )}

          {sc.type === 'theft' && dn('A field answered by the facts', DERIVED_DRIVABLE_NOTE)}

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
            {`${outstanding} ${T('stillToCheck')} · ${T('seekHint')}`}
          </button>
        )}
        {/* The way back to Roady. The fork promised the driver could switch at
            any point, and until this existed that promise only held in one
            direction — the chat could reach the form and the form was a dead
            end. Someone who picked the form and finds the roadside harder than
            expected should not have to go back two screens to change their
            mind.

            Hidden once all six are answered: at that point switching would walk
            a driver back through questions they have already settled, and the
            only control that should be in front of them is the one that files
            the report. */}
        {!ready && (
          <button className="skip chat-switch" data-act="set-intake-mode" data-v="chat">
            {T('formSwitch')}
          </button>
        )}
      </div>
    </div>
  );
}
