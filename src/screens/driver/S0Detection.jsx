import { I } from '../../core/utils.js';
import { SCENARIOS, T } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn, langSelect } from '../../components/DriverShell.jsx';
import { svgMap } from '../../components/svg.js';

/* ---------- S0 · telematics cold open ---------- */

const COLD_OPEN_NOTE =
  'This is not a form. It is a <b>question about people</b>. The claim can wait ninety seconds; a ' +
  'person on the ground cannot. Everything the vehicle already knows is collapsed below &mdash; ' +
  '<b>three taps to see it, zero to ignore it</b>. The driver&rsquo;s first action is never data ' +
  'entry.';

const DISMISS_NOTE =
  'Dismiss is a <b>first-class button</b>, same visual weight class as the others, &le;2 taps to ' +
  'complete. Telematics false positives will be the loudest early problem and the fastest way to ' +
  'lose driver trust. If dismissal is buried, drivers stop opening the app &mdash; and then you ' +
  'lose the true positives too.';

const WORKS_COUNCIL_NOTE =
  "Auto-notification from the vehicle is a <b style='color:var(--ink-2)'>works agreement</b> " +
  '(Betriebsvereinbarung) question in Germany before it is a product question. The works council ' +
  'signs off on this, not the PM.';

function TelematicsDetail({ t }) {
  const rows = [
    ['Location', t.location],
    ['Time', `${t.time} · ${new Date().toLocaleDateString('de-DE')}`],
    ['Speed', t.speed],
    ['Impact', t.impact],
    ['Vehicle', `${t.vehicle} · DAF XF 480 · fleet`],
    ['Driver', `${t.driver} · tacho card active since 06:10`],
    ['Dashcam', t.clip],
  ];

  return (
    <div className="card-quiet" style={{ marginTop: '9px' }}>
      {rows.map(([k, v]) => (
        <div
          key={k}
          style={{
            display: 'flex', gap: '12px', padding: '6px 0',
            borderBottom: '1px solid var(--line-soft)',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: '11px', color: 'var(--ink-3)', width: '76px',
              flex: 'none', textTransform: 'uppercase', letterSpacing: '.05em',
            }}
          >
            {k}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--ink-2)', flex: 1 }}>{v}</span>
        </div>
      ))}
      <p
        className="tiny"
        style={{ marginTop: '10px', lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: WORKS_COUNCIL_NOTE }}
      />
    </div>
  );
}

export function scrS0() {
  const s = Store.s;
  const sc = SCENARIOS[s.scenario];
  const t = sc.telematics;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="scroll">
        <div className="pad" style={{ paddingTop: '22px' }}>
          {/* language switch — on screen one, never buried in settings */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: '10px',
          }}>
            <div className="chip plain" style={{ borderColor: 'var(--line)', gap: '7px' }}>
              <span style={{ color: 'var(--warn)' }} dangerouslySetInnerHTML={{ __html: I.bolt }} />
              Detected by the vehicle
            </div>
            {langSelect(s.lang)}
          </div>

          <div className="sp20" />
          <h1 className="h1">{s.lang === 'en' ? sc.headline : T('detected')}</h1>
          <p className="sub" style={{ fontSize: '16.5px' }}>
            {`${t.location.split(',')[0]} · ${t.time} · ${T('today')}`}
          </p>

          <div className="sp20" />
          <div className="map-bleed" dangerouslySetInnerHTML={{ __html: svgMap(sc, false) }} />

          {dn('Screen 1 of the whole product', COLD_OPEN_NOTE)}

          <div className="sp20" />
          <h2 className="h2">{T('ok')}</h2>
          <div className="sp16" />

          {/* everything the vehicle already knows — collapsed by default */}
          <button className="frow" data-act="toggle-detail" style={{ width: '100%' }}>
            <span className="frow-ic" dangerouslySetInnerHTML={{ __html: I.bolt }} />
            <span className="frow-body">
              <span className="frow-label">{T('already')}</span>
              <span className="frow-value" style={{ fontSize: '14.5px', fontWeight: 550 }}>
                Location · time · speed · impact · vehicle · driver · dashcam
              </span>
            </span>
            <span className="frow-right" dangerouslySetInnerHTML={{ __html: I.chevD }} />
          </button>

          {s.detailOpen && <TelematicsDetail t={t} />}

          <div className="sp16" />
        </div>
      </div>

      {/* primary actions — bottom third, thumb zone */}
      <div className="dock">
        <button className="btn btn-primary btn-lg" data-act="s0-fine">{T('fine')}</button>
        <button className="btn btn-danger btn-lg" data-act="s0-hurt">{T('hurt')}</button>
        <button className="btn btn-ghost" data-act="s0-dismiss">{T('dismiss')}</button>
        {dn('False positives were designed for, not discovered', DISMISS_NOTE)}
      </div>
    </div>
  );
}

export function scrS0Detail() { return scrS0(); }
