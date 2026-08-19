import { FakeApi } from '../../core/FakeApi.js';
import { el } from '../../core/dom.jsx';
import { I } from '../../core/utils.js';
import { SCENARIOS } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { emergencyRail, navBar, offlineBanner, statusBar, timerRail } from '../../components/DriverShell.jsx';
import { scrCargo } from './Cargo.jsx';
import { scrDismiss } from './Dismiss.jsx';
import { scrEAS } from './EasCircumstances.jsx';
import { scrEmergency } from './Emergency.jsx';
import { scrGaps } from './GapsHub.jsx';
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
export function renderDriver(){
  const s=Store.s, sc=SCENARIOS[s.scenario];
  const screen = el("div",{class:"screen"});

  const ob=offlineBanner(); if(ob) screen.append(ob);
  screen.append(emergencyRail());

  const nb=navBar(); if(nb) screen.append(nb);

  const t = timerRail(); if(t && ["s1","s0det"].includes(s.screen)) screen.append(t);

  const body = ({
    s0:      scrS0,
    s0det:   scrS0Detail,
    dismiss: scrDismiss,
    emg:     scrEmergency,
    s1:      scrTier1,
    s2:      scrReference,
    gaps:    scrGaps,
    witness: scrWitness,
    otherv:  scrOtherVehicle,
    photos:  scrPhotos,
    eas:     scrEAS,
    police:  scrPolice,
    cargo:   scrCargo,
    otherins:scrOtherInsurer,
    done:    scrSoftStop,
  }[s.screen] || scrS0)();

  screen.append(body);

  const phone = el("div",{class:"phone"},
    el("div",{class:"phone-notch"}), statusBar(), screen, el("div",{class:"home-ind"}));

  return el("div",{class:"phone-wrap"},
    el("div",{},
      phone,
      el("div",{class:"phone-caption",
        text:"Driver · "+sc.short+" · "+(SCENARIOS[s.scenario].telematics.driver)+" · 390 × 844"})
    ),
    renderDriverSidecar()
  );
}

/* a slim side panel next to the phone: what the founders read while narrating */
export function renderDriverSidecar(){
  const s=Store.s, sc=SCENARIOS[s.scenario];
  const inc = s.incident;
  const comp = inc ? inc.completeness : null;
  const box = el("div",{style:"width:330px;flex:none;display:flex;flex-direction:column;gap:12px"});

  box.append(el("div",{class:"card"},
    el("div",{class:"sect-h"},el("h3",{text:sc.label})),
    el("p",{class:"tiny",style:"line-height:1.5",text:sc.note}),
    el("div",{class:"sp12"}),
    el("div",{class:"chipset"},
      el("span",{class:"chip info",text:sc.fieldCount+" fields capturable"}),
      el("span",{class:"chip ok",text:"6 block"}),
      sc.eas && el("span",{class:"chip",text:"EAS section"}),
      sc.thirdParty && el("span",{class:"chip",text:"third party"})
    )
  ));

  box.append(el("div",{class:"card"},
    el("div",{class:"panel-h",style:"background:none;border:none;padding:0 0 9px"},"Never asked, anywhere"),
    el("div",{style:"display:flex;gap:10px;align-items:flex-start"},
      el("span",{html:I.x,style:"color:var(--danger-deep);margin-top:2px;flex:none"}),
      el("div",{},
        el("div",{style:"font-weight:700;font-size:14px",text:"“Whose fault was it?”"}),
        el("p",{class:"tiny",style:"margin-top:5px;line-height:1.5",
          html:"No such field exists in this form. Not hidden, not optional — <b style='color:var(--ink-2)'>absent</b>. The European Accident Statement's design principle is that it establishes agreed <i>facts</i> without either party admitting liability. A fault field at the roadside creates an admission a shaken driver is in no position to make, and it is worth money to the other side. Liability is determined later, by people whose job that is."})
      ))
  ));

  if(comp){
    box.append(el("div",{class:"card"},
      el("div",{class:"panel-h",style:"background:none;border:none;padding:0 0 9px"},"GET /v1/incidents/{id}/requirements"),
      el("pre",{class:"json",style:"max-height:250px;font-size:11px",
        text:JSON.stringify({completeness:comp, next_actions:FakeApi.nextActions(FakeApi._raw.incidents[inc.id]||{draft:s.draft,completeness:comp})},null,1)}),
      el("p",{class:"tiny",style:"margin-top:9px",text:"The driver's remaining list and the fleet manager's chase list are the same array. The API drives the prompting."})
    ));
  }

  return box;
}


