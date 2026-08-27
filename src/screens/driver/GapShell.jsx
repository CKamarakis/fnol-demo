import { I } from '../../core/utils.js';
import { PERISHABLE, SCENARIOS, T } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn, savedChip } from '../../components/DriverShell.jsx';

/* ---------- the shared shell for every post-reference screen ---------------
   There was a hub screen here: a list of the outstanding items in
   perishability order, which the driver passed through on the way to the
   first one. It was removed. The ordering it displayed is still the ordering
   the flow follows — gapItems() below is what decides which screen comes next,
   and nextGap() walks it — but a screen whose only content is a menu of the
   screens after it makes the driver tap twice to reach the thing they came
   for. The argument for perishability ordering lives in the design notes on
   the screens themselves, where it is read while the ordering is being felt.
   -------------------------------------------------------------------------- */

/** The outstanding items, in the order the flow visits them. */
export function gapItems() {
  const s = Store.s, d = s.draft, sc = SCENARIOS[s.scenario];
  const items = [];
  const add = (id, screen, ic, doneWhen) => {
    if (!sc.perishable.includes(id) && id !== 'otherIns' && id !== 'cargo') return;
    items.push({ id, screen, ic, p: PERISHABLE[id], done: doneWhen, skipped: d.skipped.includes(id) });
  };

  add('witness', 'witness', I.user, d.witnessPresent !== null);
  if (sc.thirdParty) add('otherPlate', 'otherv', I.plate, !!d.otherPlate);
  add('photos', 'photos', I.cam, (sc.photos || []).every(k => d.photos[k]));
  if (sc.eas) add('eas', 'eas', I.pen, d.easA.length > 0 || d.easB.length > 0);
  add('police', 'police', I.police, d.policeAttended !== null);
  if (sc.type !== 'glass') add('cargo', 'cargo', I.box, d.cargoLaden !== null);
  if (sc.thirdParty) add('otherIns', 'otherins', I.shield, !!d.otherInsurer);

  // Sort by perishability. The default half-life ordering lives in PERISHABLE.ord,
  // but a scenario may override it: theft promotes the police reference above
  // photographs, because no German insurer progresses a theft claim without a
  // crime reference and there is no damage to photograph anyway. The scenario's
  // own perishable[] array is the authority when it lists an item.
  const rank = id => {
    const i = sc.perishable.indexOf(id);
    return i >= 0 ? i : 100 + PERISHABLE[id].ord;
  };
  items.sort((a, b) => rank(a.id) - rank(b.id));
  return items;
}

/* generic sub-screen shell with a non-shaming Skip */
export function gapShell({ id, title, sub, body, note, dockExtra, nextLabel }) {
  // PERISHABLE carries the default window and reason. A scenario may override
  // either: the photo entry says "gone once vehicles move" and blames the
  // recovery truck, and neither is true of a theft, where nothing moved and
  // no recovery was called. Copy that describes the wrong incident reads as
  // boilerplate and costs the argument its credibility.
  const sc = SCENARIOS[Store.s.scenario];
  const p = Object.assign({}, PERISHABLE[id], (sc.perishOverride || {})[id]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="scroll">
        <div className="pad" style={{ paddingTop: '16px' }}>
          {/* "All items" pointed at the removed hub. The nav bar above already
              carries a named Back, so a second back control in the body was
              two ways up from one screen even before the hub went. */}
          <div className="step-meta" style={{ justifyContent: 'flex-end' }}>
            {savedChip()}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
            <h2 className="h2">{title}</h2>
            <span className="chip warn" style={{ fontSize: '10px' }}>
              {p ? p.window : 'optional'}
            </span>
          </div>

          {sub && <p className="sub" style={{ fontSize: '14.5px' }}>{sub}</p>}
          <div className="sp16" />

          {body}

          {p && (
            <div className="card-quiet" style={{ marginTop: '16px' }}>
              <p className="tiny" style={{ lineHeight: 1.5 }}>
                <b style={{ color: 'var(--ink-2)' }}>Why now:</b>{' '}
                {p.why}
              </p>
            </div>
          )}

          {note}
          <div className="sp28" />
        </div>
      </div>

      <div className="dock">
        {dockExtra}
        <button className="btn btn-primary btn-lg" data-act="gap-next" data-v={id}>
          {nextLabel || T('contin')}
        </button>
        {/* one tap. never asks "are you sure?". */}
        <button className="skip" data-act="gap-skip" data-v={id}>{T('skip')}</button>
      </div>
    </div>
  );
}

/* Plain text entry. There was a mic button on every one of these; it was
   removed. Its handler raised a toast explaining that speech recognition needs
   a network service and this file makes none — a control that announces it
   cannot do the thing it depicts. Constraint 1 makes that permanent rather
   than a to-do, so the honest form is no button. Same failure as the photo
   slots that opened nothing: if the product cannot do it, do not draw it. */
export function textField(label, key, ph, type) {
  const d = Store.s.draft;
  return (
    <div style={{ marginBottom: '14px' }}>
      <label className="lbl">{label}</label>
      <input
        className="inp"
        data-field={key}
        defaultValue={d[key] || ''}
        placeholder={ph || ''}
        type={type || 'text'}
        inputMode={type === 'tel' ? 'tel' : undefined}
        autoComplete="off"
      />
    </div>
  );
}
