import { EAS_STATEMENTS, T } from '../../data/domain.js';
import { I } from '../../core/utils.js';
import { IMPACT_LABEL, svgImpact } from '../../components/svg.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { gapShell } from './GapShell.jsx';

/* ---------- EAS circumstances ---------- */

const INTRO_NOTE =
  "These are the <b style='color:var(--ink-2)'>17 statements from the European Accident " +
  'Statement</b> &mdash; the same list the other driver has in their glovebox, in their language. ' +
  "Tick what was happening. <b style='color:var(--ink-2)'>Nobody is admitting anything by " +
  'ticking a box.</b>';

const WEAK_LINK_NOTE =
  "<b style='color:var(--ink-2)'>Known weak link:</b> half the value of this section depends on a " +
  'stranger being willing to sign a phone screen. Column B is fully skippable and the report is ' +
  'still valid without it &mdash; but be honest that the outcome is materially worse.';

const WHY_EAS_NOTE =
  'The constat amiable / Europäischer Unfallbericht has been the cross-border standard for ' +
  'decades. Every European handler reads it without training, both parties fill in <b>the same 17 ' +
  'statements</b> in their own language, and &mdash; the part that is legally load-bearing &mdash; ' +
  'it establishes <b>agreed facts without either party admitting liability</b>. Inventing our own ' +
  'circumstance model would have meant a mapping layer, a translation argument with every ' +
  'counterparty, and no legal precedent. We took the standard and made it tappable.';

function StatementRow({ st, lang, onA, onB }) {
  return (
    <div className="eas-row">
      <div
        className={`eas-tick A${onA ? ' on' : ''}`}
        data-act="eas-tick" data-col="A" data-n={st.n}
      >
        <i dangerouslySetInnerHTML={{ __html: onA ? I.chkS : '' }} />
      </div>
      <div className="txt">
        <span className="no">{st.n}</span>
        <span>{st[lang] || st.en}</span>
      </div>
      <div
        className={`eas-tick B${onB ? ' on' : ''}`}
        data-act="eas-tick" data-col="B" data-n={st.n}
      >
        <i dangerouslySetInnerHTML={{ __html: onB ? I.chkS : '' }} />
      </div>
    </div>
  );
}

function SignaturePad({ id, label, color, hint, signed }) {
  return (
    <div>
      <div className="tiny" style={{ marginBottom: '6px', color, fontWeight: 700 }}>{label}</div>
      <div className={`sig-pad${signed ? ' signed' : ''}`}>
        <canvas id={id} width="620" height="220" />
        <span className="sig-hint">{hint}</span>
      </div>
    </div>
  );
}

export function scrEAS() {
  const s = Store.s;
  const d = s.draft;

  const body = (
    <div>
      <div className="card-quiet" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span
            style={{ color: 'var(--accent)', flex: 'none', marginTop: '2px' }}
            dangerouslySetInnerHTML={{ __html: I.info }}
          />
          <p
            className="tiny"
            style={{ lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: INTRO_NOTE }}
          />
        </div>
      </div>

      {/* The other driver reads this in their own language, not ours.
          Fewer languages than the UI offers: these are the verbatim EAS
          statements, and a paraphrase of a legal form is worse than English. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <div className="seg" style={{ transform: 'scale(.9)', transformOrigin: 'right' }}>
          {['en', 'de', 'pl'].map(k => (
            <button
              key={k}
              data-act="eas-lang"
              data-v={k}
              aria-pressed={String(s.easLangCol === k)}
              style={{ fontFamily: 'var(--sans)', fontWeight: 650 }}
            >
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="eas-grid">
        <div className="eas-head">
          <div className="hA">A<br />You</div>
          <div>What was happening</div>
          <div className="hB">B<br />Them</div>
        </div>

        {EAS_STATEMENTS.map(st => (
          <StatementRow
            key={st.n}
            st={st}
            lang={s.easLangCol}
            onA={d.easA.includes(st.n)}
            onB={d.easB.includes(st.n)}
          />
        ))}

        <div className="eas-count">
          <span style={{ color: '#3d5f54' }}>A · {d.easA.length} ticked</span>
          <span style={{ color: '#9a6410' }}>B · {d.easB.length} ticked</span>
        </div>
      </div>

      {/* point of impact — EAS box 10 */}
      <div className="sp20" />
      <p className="lbl" style={{ fontSize: '15px', color: 'var(--ink)' }}>
        Where were you hit? (EAS box 10)
      </p>
      <div className="impact-wrap" dangerouslySetInnerHTML={{ __html: svgImpact(d.impact) }} />
      {d.impact && (
        <p className="tiny" style={{ textAlign: 'center', marginTop: '7px' }}>
          Point of impact: {IMPACT_LABEL[d.impact]}
        </p>
      )}

      {/* sketch — EAS box 13 */}
      <div className="sp20" />
      <p className="lbl" style={{ fontSize: '15px', color: 'var(--ink)' }}>
        {T('gEasDraw')}
      </p>
      <div className="sketch-wrap">
        <canvas id="sketchCanvas" width="640" height="420" />
      </div>
      <div className="sketch-tools">
        <button className="btn btn-sm btn-ghost" data-act="sketch-clear">Clear</button>
        <span className="tiny" style={{ alignSelf: 'center' }}>
          Finger or mouse. Arrows and two boxes is plenty.
        </span>
      </div>

      {/* both drivers sign — the EAS requires it */}
      <div className="sp20" />
      <p className="lbl" style={{ fontSize: '15px', color: 'var(--ink)' }}>Both drivers sign</p>
      <div style={{ display: 'grid', gap: '12px' }}>
        <SignaturePad
          id="sigA" label="A · you (Marek K.)" color="#3d5f54"
          hint="sign here" signed={!!d.sigA}
        />
        <SignaturePad
          id="sigB" label="B · the other driver" color="#9a6410"
          hint="hand them the phone" signed={!!d.sigB}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <button className="btn btn-sm btn-ghost" data-act="sig-clear" data-v="A">Clear A</button>
        <button className="btn btn-sm btn-ghost" data-act="sig-clear" data-v="B">Clear B</button>
      </div>

      <div className="sp16" />
      <div className="card-quiet" style={{ borderColor: '#e8d3a4' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span
            style={{ color: 'var(--warn)', flex: 'none', marginTop: '2px' }}
            dangerouslySetInnerHTML={{ __html: I.warn }}
          />
          <p
            className="tiny"
            style={{ lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: WEAK_LINK_NOTE }}
          />
        </div>
      </div>
    </div>
  );

  return gapShell({
    id: 'eas',
    title: T('gEasTitle'),
    sub: T('gEasSub'),
    body,
    note: dn('Why we adopted the EAS instead of designing a schema', WHY_EAS_NOTE),
  });
}
