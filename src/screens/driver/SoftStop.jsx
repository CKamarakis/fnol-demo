import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { gapItems } from './GapShell.jsx';
import { svgRing } from '../../components/svg.js';

/* ---------- soft stop ---------- */

const SOFT_STOP_NOTE =
  'There is no final &ldquo;Submit&rdquo; here because the report was <b>already filed</b> at ' +
  'second 42. This screen exists to give a driver permission to stop. The alternative &mdash; a ' +
  'form that never says you&rsquo;re finished &mdash; is how you get abandonment on the last ' +
  'screen and a claim with photographs but no witness.';

export function scrSoftStop() {
  const s = Store.s;
  const score = s.incident ? s.incident.completeness.score : 0;
  const outstanding = gapItems().filter(x => x.skipped || !x.done);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="scroll">
        <div className="pad" style={{ paddingTop: '30px', textAlign: 'center' }}>
          <div className="softstop">
            <div dangerouslySetInnerHTML={{ __html: svgRing(score) }} />
            <h1 className="h1">That&rsquo;s everything perishable.</h1>
            <p className="sub" style={{ fontSize: '16.5px' }}>
              The rest can wait. We&rsquo;ll message you.
            </p>
          </div>

          <div className="sp20" />

          <div className="card" style={{ textAlign: 'left' }}>
            <div
              className="tiny"
              style={{ textTransform: 'uppercase', letterSpacing: '.07em', fontSize: '10.5px' }}
            >
              Reference
            </div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '3px' }}>
              {s.reference || '—'}
            </div>
            <div className="sp12" />
            <div className="chipset">
              <span className="chip ok">{score}% complete</span>
              {/* States the fact the driver reported, not a service this system
                  does not run. Recovery is the fleet's to arrange. */}
              {s.draft.drivable === false && <span className="chip info">Reported off road</span>}
              {s.fail.offline && (
                <span className="chip warn">Will sync when you&rsquo;re back in signal</span>
              )}
            </div>
          </div>

          {outstanding.length > 0 && (
            <>
              <div className="sp16" />
              <div className="card-quiet" style={{ textAlign: 'left' }}>
                <div
                  className="tiny"
                  style={{ fontWeight: 700, color: 'var(--ink-2)', marginBottom: '8px' }}
                >
                  We&rsquo;ll ask you about these later
                </div>
                <div className="chipset">
                  {outstanding.map(x => (
                    <span key={x.id} className="chip" style={{ fontSize: '10.5px' }}>
                      {x.p.label}
                    </span>
                  ))}
                </div>
                <p className="tiny" style={{ marginTop: '10px' }}>
                  No nagging now. A message tomorrow when you&rsquo;re not standing on a hard
                  shoulder.
                </p>
              </div>
            </>
          )}

          {dn('A soft stop, not a submit button', SOFT_STOP_NOTE)}
          <div className="sp28" />
        </div>
      </div>

      {/* One control. "See what dispatch sees" was the demo harness leaking
          into the product — the persona switcher in the chrome already does
          that, and a driver has no such button. "Add something after all"
          pointed at the perishability hub, which is gone: with the hub
          removed there is no list to return to, and the outstanding items are
          already named above as things we will message about. */}
      <div className="dock">
        <button className="btn btn-primary btn-lg" data-act="goto" data-v="archive">
          See your copy
        </button>
      </div>
    </div>
  );
}
