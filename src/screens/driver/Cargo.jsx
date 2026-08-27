import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { Choice, YesNo } from '../../components/Choice.jsx';
import { gapShell, textField } from './GapShell.jsx';

/* ---------- cargo (freight profile only) ---------- */
export function scrCargo() {
  const d = Store.s.draft;

  const body = (
    <div>
      <p className="lbl">Are you loaded?</p>
      <div className="grid2" style={{ marginBottom: '14px' }}>
        <Choice act="set-cargo" value="yes" label="Loaded" selected={d.cargoLaden === true} />
        <Choice act="set-cargo" value="no" label="Empty" selected={d.cargoLaden === false} />
      </div>

      {d.cargoLaden === true && (
        <>
          {textField("Roughly what's on board", 'cargoDesc', '24 pallets, packaged food')}
          {textField('Trailer number', 'trailer', 'B-RL 8829')}

          <p className="lbl">Anything hazardous (ADR)?</p>
          <div className="grid2">
            {/* Plain Yes and No. The question above already says ADR, so
                "Yes, an ADR load" restated it inside the answer. */}
            <Choice act="set-hazard" value="no" label="No" selected={d.hazardous === false} />
            <Choice act="set-hazard" value="yes" label="Yes" selected={d.hazardous === true} />
          </div>

          {d.hazardous === true && (
            <div className="card-quiet" style={{ marginTop: '12px', borderColor: '#e0a89c' }}>
              <p className="tiny" style={{ lineHeight: 1.5 }}>
                <b style={{ color: '#b8341c' }}>ADR load flagged.</b> This escalates immediately.
                It changes the recovery provider, the road closure, and who has to be told.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );

  return gapShell({
    id: 'cargo',
    title: 'Cargo and trailer',
    sub: 'Only shown because this vehicle has a freight profile.',
    body,
    note: dn(
      'Conditional on the vehicle profile, not on the driver',
      'A van on a service round never sees this section. The cargo detail is reachable afterwards from the CMR note and the TMS, which is why it sits near the bottom — <b>with one exception</b>: a hazardous load is not a claims field at all, it is a safety escalation, and if the profile flags ADR I would promote that single question into Tier 1.',
    ),
  });
}
