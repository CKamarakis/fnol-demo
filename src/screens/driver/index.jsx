import { FakeApi } from '../../core/FakeApi.js';
import { I } from '../../core/utils.js';
import { SCENARIOS } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { emergencyRail, navBar, offlineBanner, statusBar, timerRail } from '../../components/DriverShell.jsx';
import { scrArchive } from './Archive.jsx';
import { scrCargo } from './Cargo.jsx';
import { scrChat } from './Chat.jsx';
import { scrDismiss } from './Dismiss.jsx';
import { scrEAS } from './EasCircumstances.jsx';
import { scrEmergency } from './Emergency.jsx';
import { scrModeChoice } from './ModeChoice.jsx';
import { scrOtherInsurer } from './OtherInsurer.jsx';
import { scrOtherVehicle } from './OtherVehicle.jsx';
import { scrPhotos } from './Photos.jsx';
import { scrPolice } from './Police.jsx';
import { scrReference } from './S2Reference.jsx';
import { scrS0, scrS0Detail } from './S0Detection.jsx';
import { scrSoftStop } from './SoftStop.jsx';
import { scrTier1 } from './S1Tier1.jsx';
import { scrWitness } from './Witness.jsx';

/* ---------------- driver screen router ---------------- */

const SCREENS = {
  s0: scrS0,
  s0det: scrS0Detail,
  dismiss: scrDismiss,
  emg: scrEmergency,
  s0choice: scrModeChoice,
  s1: scrTier1,
  s1chat: scrChat,
  s2: scrReference,
  witness: scrWitness,
  otherv: scrOtherVehicle,
  photos: scrPhotos,
  eas: scrEAS,
  police: scrPolice,
  cargo: scrCargo,
  otherins: scrOtherInsurer,
  done: scrSoftStop,
  archive: scrArchive,
};

/** The timer is a demo instrument, shown only while the blocking path runs. */
const TIMED_SCREENS = ['s1', 's1chat', 's0det'];

export function renderDriver() {
  const s = Store.s;
  const sc = SCENARIOS[s.scenario];
  const Screen = SCREENS[s.screen] || scrS0;

  return (
    <div className="phone-wrap">
      <div>
        <div className="phone">
          <div className="phone-notch" />
          {statusBar()}
          <div className="screen">
            {offlineBanner()}
            {emergencyRail()}
            {navBar()}
            {TIMED_SCREENS.includes(s.screen) && timerRail()}
            {Screen()}
          </div>
          <div className="home-ind" />
        </div>
        <div className="phone-caption">
          {`Driver · ${sc.short} · ${sc.telematics.driver} · 390 × 844`}
        </div>
      </div>
      {renderDriverSidecar()}
    </div>
  );
}

const NO_FAULT_NOTE =
  'No such field exists in this form. Not hidden, not optional &mdash; ' +
  "<b style='color:var(--ink-2)'>absent</b>. The European Accident Statement&rsquo;s design " +
  'principle is that it establishes agreed <i>facts</i> without either party admitting liability. ' +
  'A fault field at the roadside creates an admission a shaken driver is in no position to make, ' +
  'and it is worth money to the other side. Liability is determined later, by people whose job ' +
  'that is.';

/** A slim panel beside the phone: what the audience reads while it is narrated. */
export function renderDriverSidecar() {
  const s = Store.s;
  const sc = SCENARIOS[s.scenario];
  const inc = s.incident;
  const comp = inc ? inc.completeness : null;

  return (
    <div style={{ width: '330px', flex: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="card">
        <div className="sect-h"><h3>{sc.label}</h3></div>
        <p className="tiny" style={{ lineHeight: 1.5 }}>{sc.note}</p>
        <div className="sp12" />
        <div className="chipset">
          <span className="chip info">{sc.fieldCount} fields capturable</span>
          <span className="chip ok">6 block</span>
          {sc.eas && <span className="chip">EAS section</span>}
          {sc.thirdParty && <span className="chip">third party</span>}
        </div>
      </div>

      <div className="card">
        <div className="panel-h" style={{ background: 'none', border: 'none', padding: '0 0 9px' }}>
          Never asked, anywhere
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span
            style={{ color: 'var(--danger-deep)', marginTop: '2px', flex: 'none' }}
            dangerouslySetInnerHTML={{ __html: I.x }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>&ldquo;Whose fault was it?&rdquo;</div>
            <p
              className="tiny"
              style={{ marginTop: '5px', lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: NO_FAULT_NOTE }}
            />
          </div>
        </div>
      </div>

      {comp && (
        <div className="card">
          <div className="panel-h" style={{ background: 'none', border: 'none', padding: '0 0 9px' }}>
            GET /v1/incidents/&#123;id&#125;/requirements
          </div>
          <pre className="json" style={{ maxHeight: '250px', fontSize: '11px' }}>
            {JSON.stringify({
              completeness: comp,
              next_actions: FakeApi.nextActions(
                FakeApi._raw.incidents[inc.id] || { draft: s.draft, completeness: comp },
              ),
            }, null, 1)}
          </pre>
          <p className="tiny" style={{ marginTop: '9px' }}>
            The driver&rsquo;s remaining list and the fleet manager&rsquo;s chase list are the same
            array. The API drives the prompting.
          </p>
        </div>
      )}
    </div>
  );
}
