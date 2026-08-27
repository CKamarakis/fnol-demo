import { I } from '../../core/utils.js';
import { SCENARIOS, T } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { tier1Answered, tier1Ready } from '../../core/tier1.js';
import { dn } from '../../components/DriverShell.jsx';
import { Choice } from '../../components/Choice.jsx';
import {
  EditRow, SEVERITY_OPTIONS, TypeSelect, WHO_HURT_OPTIONS, typeSummary, whenLabel,
} from './S1Tier1.jsx';

/* ---------- S1-CHAT — the same six, asked one at a time ---------- */

const CHAT_NOTE =
  'Every control here is the <b>same component</b> the form uses, wired to the <b>same handler</b>. ' +
  'Confirming the vehicle in this transcript and confirming it on the form both call ' +
  '<code>confirm-vehicle</code>; correcting the location writes the same ' +
  '<code>corrected: {from, to, at}</code> record through the same <code>save-field</code>. ' +
  'Nothing about the claim is collected, derived or shaped differently.' +
  '<br><br>' +
  'That is the whole design constraint. A second intake path that built its own state would be a ' +
  'second thing to keep correct, and the one that gets it wrong is whichever the reviewer is not ' +
  'looking at. So readiness is not reimplemented either: both screens call ' +
  '<code>tier1Ready()</code> from <code>core/tier1.js</code>.';

const TRANSCRIPT_NOTE =
  'An answered turn stays on screen and <b>stays tappable</b>. Correcting an answer is the same ' +
  'gesture as giving it, which is the rule the pre-filled rows on the form already follow.' +
  '<br><br>' +
  'The alternative was a read-only transcript with a review step at the end, and it fails twice: it ' +
  'puts a form at the end of the path chosen to avoid one, and it makes the driver answer six ' +
  'questions before they can fix the first. On a hard shoulder that is five questions of knowing ' +
  'you got something wrong and not being allowed to say so.';

const ORDER_NOTE =
  'The order is fixed and not negotiable by the driver, which is the real cost of this path. ' +
  'The form lets someone answer question 6 first because they already know the truck is drivable ' +
  'and want it recorded; here they answer it sixth.' +
  '<br><br>' +
  'What buys that back is that <b>five of the six are confirmations</b>, not questions. The truck ' +
  'already reported the vehicle, the time, the location and what it thinks happened. Roady states ' +
  'each one and the driver taps once. A linear order costs little when most of the line is already ' +
  'filled in.';

/**
 * The script.
 *
 * Built per render from the scenario and the draft rather than stored, because
 * its shape depends on both: a theft has no drivable question, and the injury
 * detail turns exist only once the driver has said someone is hurt. A stored
 * index into a list that changes shape is a stale index, so `chatTurn` is
 * always clamped against what this returns (see clampTurn below).
 *
 * `label` is deliberately the key holding the question text: tests/copy.mjs
 * enforces its 18-word limit on keys named label/placeholder/title/sub/hint,
 * and a script under any other key would be the most copy-dense object in the
 * product and the only one nothing checks.
 */
export function chatTurns() {
  const s = Store.s;
  const d = s.draft;
  const sc = SCENARIOS[s.scenario];
  const t = [];

  /* Five of the six arrive pre-filled from the unit. Roady states the value and
     the driver confirms or corrects it — the same two gestures as the form.

     `said` is what the answer bubble shows once the turn is closed. For these
     it is NOT the value again: the value is already in Roady's bubble directly
     above, and repeating it verbatim fills a phone screen with a column of
     duplicated registrations. The answer bubble says what the driver *did*,
     and shows the value only when they changed it. */
  const corrected = k => !!(d.corrected && d.corrected[k]);
  const confirmSaid = (ok, k, val) =>
    !ok ? '' : corrected(k) ? val : T('chatConfirm');

  t.push({ id: 'vehicle', kind: 'confirm', label: T('qVehicle'),
    value: d.vehicle, editKey: 'vehicle', editLabel: 'Registration', editHint: 'B-RL 4471',
    act: 'confirm-vehicle', answered: d.vehicleConfirmed,
    said: confirmSaid(d.vehicleConfirmed, 'vehicle', d.vehicle) });

  const when = whenLabel(d);
  t.push({ id: 'time', kind: 'confirm', label: T('qTime'),
    value: when, editKey: 'time', editLabel: 'Time it happened', editHint: '14:32',
    // The date is the second half of one fact, and it has to be correctable:
    // the truck reports an instant, and an incident found just after midnight
    // belongs to the day before.
    editSecond: { key: 'date', label: 'Date it happened', value: d.occurredOn, hint: '19 August 2026' },
    act: 'confirm-time', answered: d.timeConfirmed,
    said: confirmSaid(d.timeConfirmed, 'occurredAt', when) });

  t.push({ id: 'location', kind: 'confirm', label: T('qLocation'),
    value: d.location, editKey: 'location', editLabel: 'Where it happened',
    editHint: 'Road, km marker, direction',
    act: 'confirm-location', answered: d.locationConfirmed,
    said: confirmSaid(d.locationConfirmed, 'location', d.location) });

  /* The type is the exception: it is chosen from a list rather than confirmed
     as typed, so the answer bubble names what was chosen. That is information,
     not an echo. */
  t.push({ id: 'type', kind: 'type', label: T('qType'),
    value: typeSummary(d), answered: d.typeConfirmed, said: typeSummary(d) });

  // The one question the truck cannot answer.
  t.push({ id: 'injured', kind: 'injured', label: T('qInjured'),
    answered: d.injured !== null,
    said: d.injured === true ? 'Yes' : d.injured === false ? 'No one' : '' });

  /* Who and how bad are separate turns rather than one bubble that grows three
     controls tall. A message that expands into a form has stopped being a
     message, and the driver loses the one thing this path offers: a single
     question with a single answer in front of them. */
  if (d.injured === true) {
    t.push({ id: 'parties', kind: 'multi', label: T('qParties'),
      options: WHO_HURT_OPTIONS, act: 'toggle-injured-party', sel: d.injuredParties || [],
      answered: (d.injuredParties || []).length > 0,
      said: labelsFor(WHO_HURT_OPTIONS, d.injuredParties || []) });

    t.push({ id: 'severity', kind: 'multi', label: T('qSeverity'),
      options: SEVERITY_OPTIONS, act: 'toggle-severity', sel: d.injurySeverity || [],
      answered: (d.injurySeverity || []).length > 0,
      said: labelsFor(SEVERITY_OPTIONS, d.injurySeverity || []) });

    t.push({ id: 'emergency', kind: 'yesno', label: T('qEmergency'),
      act: 'set-emergency', value: d.injuryEmergency, yes: 'Yes', no: 'Not yet',
      answered: d.injuryEmergency !== null,
      said: d.injuryEmergency === true ? 'Yes' : d.injuryEmergency === false ? 'Not yet' : '' });
  }

  /* Not asked when the vehicle is gone. Same derivation as the form: a stolen
     truck is not drivable and has no inspection address, so the fact is taken
     from the incident type and marked derived rather than put to someone who
     has just lost a truck. */
  if (sc.type !== 'theft') {
    t.push({ id: 'drivable', kind: 'yesno', label: T('qDrivable'),
      act: 'set-drivable', value: d.drivable, yes: 'Yes', no: 'No',
      answered: d.drivable !== null,
      said: d.drivable === true ? 'Yes' : d.drivable === false ? 'No' : '' });
  }

  return t;
}

function labelsFor(options, values) {
  return options.filter(([v]) => values.includes(v)).map(([, l]) => l).join(', ');
}

/** A stored index outlives the script that produced it. Never trust it. */
function clampTurn(n, len) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), Math.max(0, len - 1));
}

/** Roady's side: a question, or a statement of what the truck reported. */
function Ask({ turn }) {
  return (
    <div className="bub-row bub-row-in">
      <span className="bub-av" aria-hidden="true" dangerouslySetInnerHTML={{ __html: I.truck }} />
      <div className="bub bub-in">
        <span className="bub-q">{turn.label}</span>
        {turn.value && <span className="bub-val">{turn.value}</span>}
      </div>
    </div>
  );
}

/** The driver's side: what they said, tappable to change it. */
function Said({ turn, index }) {
  return (
    <div className="bub-row bub-row-out">
      <button className="bub bub-out" data-act="chat-reopen" data-v={String(index)}>
        <span className="bub-said">{turn.said || '—'}</span>
        <span className="bub-redo" dangerouslySetInnerHTML={{ __html: I.pen }} />
      </button>
    </div>
  );
}

/** The controls for whichever turn is open. */
function Answer({ turn }) {
  const s = Store.s;
  const d = s.draft;

  if (turn.kind === 'confirm') {
    // Correcting opens the same editor the form uses, in the answer slot.
    if (s.editing === turn.editKey) {
      return (
        <EditRow
          editKey={turn.editKey}
          label={turn.editLabel}
          value={turn.editKey === 'time' ? d.occurredAt : d[turn.editKey]}
          hint={turn.editHint}
          second={turn.editSecond}
        />
      );
    }
    /* Buttons, not Choices. A tick box promises a selection that is held and
       can be read back; these two advance the turn and the transcript records
       what happened. A control that ticks and immediately scrolls away is
       claiming a state nothing keeps. */
    return (
      <div className="chat-acts">
        <button className="btn btn-primary chat-act" data-act={turn.act} data-v="yes">
          {T('chatConfirm')}
        </button>
        <button className="btn btn-secondary chat-act" data-act="edit-field" data-v={turn.editKey}>
          {T('chatFix')}
        </button>
      </div>
    );
  }

  if (turn.kind === 'type') {
    return (
      <>
        <div className="chat-acts">
          <button className="btn btn-primary chat-act" data-act="confirm-type" data-v="yes">
            {T('chatConfirm')}
          </button>
          <button className="btn btn-secondary chat-act" data-act="edit-field" data-v="type">
            {T('chatFix')}
          </button>
        </div>
        {s.subScreen === 'type' && (
          <div className="type-picker" style={{ marginTop: '10px' }}>
            <label className="lbl" htmlFor="chat-type">What happened?</label>
            <TypeSelect id="chat-type" act="set-type" value={d.type} />

            {d.type === 'other' && (
              <div style={{ marginTop: '10px' }}>
                <label className="lbl" htmlFor="chat-type-other">What was it?</label>
                <input
                  id="chat-type-other"
                  className="inp"
                  data-field="typeOther"
                  defaultValue={d.typeOther || ''}
                  placeholder="A few words is enough"
                  autoComplete="off"
                />
              </div>
            )}

            {/* Still one question. A collision that also breaks glass does not
                become a second question later in the flow. */}
            <div className="also-block">
              <p className="lbl">
                Anything else damaged?{' '}
                <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}>Optional</span>
              </p>
              {(d.alsoDamaged || []).map((v, i) => (
                <div className="also-row" key={i}>
                  <TypeSelect id={`chat-also-${i}`} act="set-also" index={i} value={v} placeholder="Choose…" />
                  <button className="also-remove" data-act="remove-also" data-v={String(i)} aria-label="Remove this one">
                    ×
                  </button>
                </div>
              ))}
              <button className="also-add" data-act="add-also">
                <span aria-hidden="true">+</span>
                {(d.alsoDamaged || []).length ? 'Add another' : 'Add damage'}
              </button>
            </div>

            {/* The picker had no way out of its own. On the form it opens under
                a row that stays visible and tappable, so Confirm is still on
                screen; in the transcript it replaces the answer slot, and the
                only exit was a button scrolled above it.

                One control, not the Save/Cancel pair the text editors carry:
                the select writes on change, so there is nothing held back to
                save and nothing to roll back on cancel. A Cancel here would
                have to either lie or undo an edit the driver already saw take
                effect. */}
            <button
              className="btn btn-primary btn-sm type-done"
              data-act="type-done"
            >
              Done
            </button>
          </div>
        )}
      </>
    );
  }

  if (turn.kind === 'injured') {
    return (
      <div className="grid2">
        <Choice act="set-injured" value="no" label="No one" selected={d.injured === false} />
        <Choice act="set-injured" value="yes" label="Yes" selected={d.injured === true} />
      </div>
    );
  }

  /* Multi-select cannot advance on a tap: the driver may have three more to
     name, and moving on after the first would collapse a group to whoever they
     happened to tap first — the exact failure the multi-select exists to
     prevent. So it advances on an explicit continue, which stays disabled-
     looking until at least one is chosen by simply not being there. */
  if (turn.kind === 'multi') {
    return (
      <>
        {turn.options.map(([v, l]) => (
          <Choice key={v} act={turn.act} value={v} label={l} multi selected={turn.sel.includes(v)} />
        ))}
        {turn.answered && (
          <button className="btn btn-secondary btn-sm chat-next" data-act="chat-advance" data-v={turn.id}>
            {T('contin')}
          </button>
        )}
      </>
    );
  }

  // yesno
  return (
    <div className="grid2">
      <Choice act={turn.act} value="yes" label={turn.yes} selected={turn.value === true} />
      <Choice act={turn.act} value="no" label={turn.no} selected={turn.value === false} />
    </div>
  );
}

export function scrChat() {
  const s = Store.s;
  const d = s.draft;
  const turns = chatTurns();
  const cur = clampTurn(s.chatTurn, turns.length);

  /* Show every turn up to the furthest reached, so reopening question 2 does
     not hide the answers to 3 and 4 — the driver is correcting one thing, not
     rewinding the report. */
  const seen = Math.max(cur, clampTurn(s.chatSeen, turns.length));

  const answered = tier1Answered(d);
  const ready = tier1Ready(d);
  const outstanding = 6 - answered;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="scroll">
        <div className="pad" style={{ paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
            <h2 className="h2">{T('chatTitle')}</h2>
            <span className="chip">{`${answered} of 6`}</span>
          </div>
          <p className="sub" style={{ fontSize: '14.5px' }}>{T('chatSub')}</p>
          <div className="sp16" />

          {dn('The same six, the same handlers', CHAT_NOTE)}

          <div className="transcript">
            {turns.slice(0, seen + 1).map((turn, i) => (
              <div key={turn.id} className={`turn${i === cur ? ' turn-open' : ''}`}>
                <Ask turn={turn} />
                {/* Open turn shows its controls; a closed one shows what was
                    said, and tapping that reopens it. */}
                {i === cur ? <div className="bub-answer"><Answer turn={turn} /></div>
                  : turn.answered ? <Said turn={turn} index={i} /> : null}
              </div>
            ))}
          </div>

          {dn('An answered turn stays tappable', TRANSCRIPT_NOTE)}
          {dn('What a fixed order costs', ORDER_NOTE)}

          <div className="sp28" />
        </div>
      </div>

      <div className="dock chat-dock">
        {/* Same two-controls-in-one-slot pattern as the form: submitting is
            impossible until six are answered, and until then the control goes
            and finds the first one that is not. */}
        {ready ? (
          <button className="btn btn-primary btn-lg" data-act="submit-tier1">{T('submit')}</button>
        ) : (
          <button className="btn btn-secondary btn-lg btn-seek" data-act="chat-seek">
            {`${outstanding} ${T('stillToCheck')} · ${T('seekHint')}`}
          </button>
        )}
        <button className="skip chat-switch" data-act="set-intake-mode" data-v="form">
          {T('chatSwitch')}
        </button>
      </div>
    </div>
  );
}
