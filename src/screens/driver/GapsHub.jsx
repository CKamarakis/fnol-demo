import { I } from '../../core/utils.js';
import { PERISHABLE, SCENARIOS, T } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn, savedChip } from '../../components/DriverShell.jsx';

/* ---------- S3 · perishability hub ---------- */

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

function PerishItem({ item }) {
  const { done, skipped, p, ic, screen } = item;
  const icon = done
    ? `<span style="color:var(--ok)">${I.chk}</span>`
    : skipped
      ? `<span style="color:var(--ink-3)">${I.x}</span>`
      : ic;

  return (
    <button
      className={`perish-item ${done ? 'done' : skipped ? 'skipped' : ''}`}
      data-act="goto"
      data-v={screen}
    >
      <span className="pi-clock" dangerouslySetInnerHTML={{ __html: icon }} />
      <span className="pi-body">
        <span className="pi-title">{p.label}</span>
        <span className={`pi-window ${p.half === 'days' ? 'cool' : ''}`}>
          {skipped
            ? <b style={{ color: 'var(--ink-3)' }}>Skipped &mdash; we&rsquo;ll ask later</b>
            : <b>{p.window}</b>}
        </span>
      </span>
      <span style={{ color: 'var(--ink-3)', flex: 'none' }} dangerouslySetInnerHTML={{ __html: I.chev }} />
    </button>
  );
}

const ORDERING_NOTE =
  'Most FNOL forms are ordered by <i>logical grouping</i>: your details, their details, the ' +
  'incident, the vehicle. That ordering optimises for whoever drew the schema. This one is ' +
  'ordered by <b>half-life</b>. A witness is gone in ten minutes; the other party&rsquo;s insurer ' +
  'name is derivable from their plate next week. So the witness is first and the insurer is last ' +
  '&mdash; even though the insurer feels more &ldquo;important&rdquo;. Say plainly what you get ' +
  'for it: the last thing captured is the first thing lost, and contested liability is decided on ' +
  'exactly these items.';

export function scrGaps() {
  const items = gapItems();
  const remaining = items.filter(x => !x.done && !x.skipped);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="scroll">
        <div className="pad" style={{ paddingTop: '18px' }}>
          <div className="step-meta">
            <span className="step-count">optional · nothing here blocks you</span>
            {savedChip()}
          </div>

          <h2 className="h2">{T('perish')}</h2>
          <p className="sub" style={{ fontSize: '14.5px' }}>
            Ordered by how fast each one evaporates. Not by how the form was drawn.
          </p>
          <div className="sp16" />

          {items.map(it => <PerishItem key={it.id} item={it} />)}

          {dn('Perishability ordering — my recommendation, not an industry standard', ORDERING_NOTE)}

          <div className="sp12" />
          <div className="card-quiet">
            <p className="tiny" style={{ lineHeight: 1.5 }}>
              <b style={{ color: 'var(--ink-2)' }}>Never a percentage bar.</b> A progress bar tells
              a driver they are failing at something. This tells them what the world is about to
              take away. Same information, opposite emotional effect on someone with adrenaline in
              their hands.
            </p>
          </div>

          <div className="sp28" />
        </div>
      </div>

      <div className="dock">
        {remaining.length > 0 && (
          <button className="btn btn-primary btn-lg" data-act="goto" data-v={remaining[0].screen}>
            Next: {remaining[0].p.label}
          </button>
        )}
        <button className="btn btn-quiet" data-act="finish-now">
          {remaining.length ? 'Stop here — the rest can wait' : 'Done'}
        </button>
      </div>
    </div>
  );
}

/* generic sub-screen shell with a non-shaming Skip */
export function gapShell({ id, title, sub, body, note, dockExtra, nextLabel }) {
  const p = PERISHABLE[id];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="scroll">
        <div className="pad" style={{ paddingTop: '16px' }}>
          <div className="step-meta">
            <button
              className="step-count"
              data-act="goto"
              data-v="gaps"
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <span style={{ width: '14px' }} dangerouslySetInnerHTML={{ __html: I.back }} />
              All items
            </button>
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
                <b style={{ color: 'var(--ink-2)' }}>Why this is here, in this position:</b>{' '}
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

export function textField(label, key, ph, type) {
  const d = Store.s.draft;
  return (
    <div style={{ marginBottom: '14px' }}>
      <label className="lbl">{label}</label>
      <div className="inp-wrap has-mic">
        <input
          className="inp"
          data-field={key}
          defaultValue={d[key] || ''}
          placeholder={ph || ''}
          type={type || 'text'}
          inputMode={type === 'tel' ? 'tel' : undefined}
          autoComplete="off"
        />
        <button
          className="mic"
          data-act="voice"
          data-v={key}
          title="Dictate — hands may be shaking or occupied"
          dangerouslySetInnerHTML={{ __html: I.mic }}
        />
      </div>
    </div>
  );
}
