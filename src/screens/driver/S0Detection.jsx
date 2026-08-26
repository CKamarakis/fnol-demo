import { I } from '../../core/utils.js';
import { SCENARIOS, T } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn, langSelect } from '../../components/DriverShell.jsx';
import { svgMap } from '../../components/svg.js';

/* ---------- S0 · telematics cold open ---------- */

const COLD_OPEN_NOTE =
  'This is not a form. It is a <b>question about people</b>. The claim can wait ninety seconds; a ' +
  'person on the ground cannot. What the truck already reported is shown plainly underneath, so ' +
  'the driver can see it is right &mdash; but nothing there needs an answer. The first action is ' +
  'never data entry.';

const DISMISS_NOTE =
  'Dismiss is a <b>first-class button</b>, same visual weight class as the others, &le;2 taps to ' +
  'complete. Telematics false positives will be the loudest early problem and the fastest way to ' +
  'lose driver trust. If dismissal is buried, drivers stop opening the app &mdash; and then you ' +
  'lose the true positives too. It reads &ldquo;report something else&rdquo; rather than just ' +
  '&ldquo;dismiss&rdquo;, because a shifted load is still worth reporting.';

/**
 * What the vehicle sent, minus anything already stated in the headline.
 *
 * Location and time appear above; repeating them here made the panel look
 * like filler and buried the four rows that actually tell the driver
 * something — speed, impact, which truck, and whether there is footage.
 */
function truckReport(t) {
  return [
    ['Speed', t.speed],
    ['Impact', t.impact],
    ['Vehicle', `${t.vehicle} · DAF XF 480`],
    ['Dashcam', t.clip],
  ];
}

function TruckReport({ t }) {
  return (
    <div className="card-quiet">
      <div className="trep-head">
        <span style={{ color: 'var(--warn)' }} dangerouslySetInnerHTML={{ __html: I.bolt }} />
        {T('already')}
      </div>

      {truckReport(t).map(([k, v]) => (
        <div key={k} className="trep-row">
          <span className="trep-key">{k}</span>
          <span className="trep-val">{v}</span>
        </div>
      ))}

      <p className="tiny trep-foot">Telemetry data</p>
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
        <div className="pad" style={{ paddingTop: '14px' }}>
          {/* The kicker shares the language switch's row. On its own the switch
              left a band of empty screen above the headline, and the kicker is
              short enough to sit beside it — the switch stays on screen one,
              never buried in settings. */}
          <div className="s0-top">
            <div className="s0-kicker">{T('detected')}</div>
            {langSelect(s.lang)}
          </div>
          {/* Same two-part shape in every language. Falling back to English for
              a scenario that has not been translated keeps the layout intact —
              a missing headline used to leave the kicker standing alone. */}
          <h1 className="h1">{sc.headline[s.lang] || sc.headline.en}</h1>
          <div className="s0-meta">
            <div className="s0-meta-row">
              <span className="s0-meta-ic" dangerouslySetInnerHTML={{ __html: I.pin }} />
              <span>
                {t.location}
                {t.locationNote && <em className="s0-meta-note"> · {t.locationNote}</em>}
              </span>
            </div>
            <div className="s0-meta-row">
              <span className="s0-meta-ic" dangerouslySetInnerHTML={{ __html: I.clock }} />
              <span>{`${t.time} · ${t.date}`}</span>
            </div>
          </div>

          <div className="sp20" />
          <div className="map-bleed" dangerouslySetInnerHTML={{ __html: svgMap(sc, false) }} />

          {dn('Screen 1 of the whole product', COLD_OPEN_NOTE)}

          <div className="sp16" />
          <h2 className="h2">{T('ok')}</h2>
          <div className="sp12" />

          {/* Shown outright, not behind a tap: it is four short rows and the
              driver should be able to check them at a glance. */}
          <TruckReport t={t} />

          {dn('False positives were designed for, not discovered', DISMISS_NOTE)}
          <div className="sp16" />
        </div>
      </div>

      {/* primary actions — bottom third, thumb zone */}
      <div className="dock">
        <button className="btn btn-primary" data-act="s0-fine">{T('fine')}</button>
        <button className="btn btn-danger" data-act="s0-hurt">{T('hurt')}</button>
        <button className="btn btn-ghost btn-quiet-sm" data-act="s0-dismiss">{T('dismiss')}</button>
      </div>
    </div>
  );
}

export function scrS0Detail() { return scrS0(); }
