import { I } from '../../core/utils.js';
import { SCENARIOS, T } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn, savedChip } from '../../components/DriverShell.jsx';
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
  ['other', 'Something else'],
];

const SEVERITY_OPTIONS = [
  ['walking', 'Walking and talking'],
  ['needs_help', 'Needs help but conscious'],
  ['serious', 'Serious'],
];

export function fieldRow({ ic, label, value, pre, state, act, hint }) {
  return (
    <button className={`frow ${state || ''}`} data-act={act}>
      <span className="frow-ic" dangerouslySetInnerHTML={{ __html: ic }} />
      <span className="frow-body">
        <span className="frow-label">
          {label}
          {pre && ' '}
          {pre && <span className="chip-pre">from the truck</span>}
        </span>
        <span className={`frow-value${value ? '' : ' empty'}`}>{value || '—'}</span>
      </span>
      <span className="frow-right">
        {state === 'confirmed'
          ? <span className="tick" style={{ color: 'var(--ok)' }} dangerouslySetInnerHTML={{ __html: I.chk }} />
          : <span className="tiny" style={{ fontSize: '11px' }}>{hint || ''}</span>}
      </span>
    </button>
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

  const answered = [
    d.vehicleConfirmed || d.vehicle,
    d.timeConfirmed || d.occurredAt,
    d.locationConfirmed || d.location,
    d.typeConfirmed || d.type,
    d.injured !== null,
    d.drivable !== null,
  ].filter(Boolean).length;

  const ready = d.vehicleConfirmed && d.timeConfirmed && d.locationConfirmed
    && d.typeConfirmed && d.injured !== null && d.drivable !== null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="scroll">
        <div className="pad" style={{ paddingTop: '16px' }}>
          <div className="step-meta">
            <span className="step-count">{answered} of 6 · nothing else blocks you</span>
            {savedChip()}
          </div>
          <h2 className="h2">{T('tier1')}</h2>
          <p className="sub" style={{ fontSize: '14.5px' }}>{T('tier1sub')}</p>
          <div className="sp16" />
        </div>

        <div className="pad">
          {dn('Two-tier mandatory — the whole argument in one screen', TIER1_NOTE)}

          {fieldRow({
            ic: I.truck, label: '1 · Vehicle', value: d.vehicle, pre: true,
            state: d.vehicleConfirmed ? 'confirmed' : 'pending',
            act: 'confirm-vehicle', hint: 'tap to confirm',
          })}

          {fieldRow({
            ic: I.clock, label: '2 · Date & time',
            value: `${d.occurredAt} · ${new Date().toLocaleDateString('de-DE')}`, pre: true,
            state: d.timeConfirmed ? 'confirmed' : 'pending',
            act: 'confirm-time', hint: 'tap to confirm',
          })}

          <div style={{ marginTop: '9px' }}>
            {fieldRow({
              ic: I.pin, label: '3 · Location', value: d.location, pre: true,
              state: d.locationConfirmed ? 'confirmed' : 'pending',
              act: 'confirm-location', hint: 'tap to confirm',
            })}
            {!d.locationConfirmed && (
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
              ic: I.crash, label: '4 · What happened',
              value: TYPE_LABELS[d.type] || d.type, pre: true,
              state: d.typeConfirmed ? 'confirmed' : 'pending',
              act: 'confirm-type', hint: 'tap to confirm',
            })}
          </div>

          {s.subScreen === 'type' && (
            <div style={{ marginTop: '9px' }}>
              {TYPE_OPTIONS.map(([v, l]) => (
                <Choice key={v} act="set-type" value={v} label={l} selected={d.type === v} />
              ))}
            </div>
          )}

          {/* 5 — the one question the vehicle cannot answer */}
          <div className="sp20" />
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
              6 · Can you drive it?
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
                  <span className="choice-sub">Recovery is dispatched now</span>
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
          {ready ? T('submit') : `${6 - answered} left`}
        </button>
        {!ready && (
          <p className="tiny" style={{ textAlign: 'center', marginTop: '8px' }}>
            Tap each line to confirm what the vehicle already told us.
          </p>
        )}
      </div>
    </div>
  );
}
