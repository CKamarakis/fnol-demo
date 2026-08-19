import { I, el } from '../../core/dom.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.js';
import { gapShell, textField } from './GapsHub.js';

/* ---------- cargo (freight profile only) ---------- */
export function scrCargo(){
  const d=Store.s.draft;
  const body=el("div",{});
  body.append(el("p",{class:"lbl",text:"Are you loaded?"}));
  body.append(el("div",{class:"grid2",style:"margin-bottom:14px"},
    el("button",{class:"choice","data-act":"set-cargo","data-v":"yes","aria-pressed":String(d.cargoLaden===true)},
      el("span",{class:"cbox round",html:d.cargoLaden===true?I.chkS:""}),el("span",{},"Loaded")),
    el("button",{class:"choice","data-act":"set-cargo","data-v":"no","aria-pressed":String(d.cargoLaden===false)},
      el("span",{class:"cbox round",html:d.cargoLaden===false?I.chkS:""}),el("span",{},"Empty"))
  ));
  if(d.cargoLaden===true){
    body.append(textField("What's on board — roughly","cargoDesc","24 pallets, packaged food"));
    body.append(textField("Trailer number","trailer","B-RL 8829"));
    body.append(el("p",{class:"lbl",text:"Anything hazardous (ADR)?"}));
    body.append(el("div",{class:"grid2"},
      el("button",{class:"choice","data-act":"set-hazard","data-v":"no","aria-pressed":String(d.hazardous===false)},
        el("span",{class:"cbox round",html:d.hazardous===false?I.chkS:""}),el("span",{},"No")),
      el("button",{class:"choice","data-act":"set-hazard","data-v":"yes","aria-pressed":String(d.hazardous===true)},
        el("span",{class:"cbox round",html:d.hazardous===true?I.chkS:""}),el("span",{},"Yes — ADR load"))));
    if(d.hazardous===true) body.append(el("div",{class:"card-quiet",style:"margin-top:12px;border-color:#e0a89c"},
      el("p",{class:"tiny",style:"line-height:1.5",html:"<b style='color:#b8341c'>ADR load flagged.</b> This escalates immediately — it changes the recovery provider, the road closure, and who has to be told. This is the one “late” field that would justify being promoted."})));
  }
  return gapShell({
    id:"cargo", title:"Cargo and trailer",
    sub:"Only shown because this vehicle has a freight profile.",
    body,
    note: dn("Conditional on the vehicle profile, not on the driver",
      "A van on a service round never sees this section. The cargo detail is reachable afterwards from the CMR note and the TMS, which is why it sits near the bottom — <b>with one exception</b>: a hazardous load is not a claims field at all, it is a safety escalation, and if the profile flags ADR I would promote that single question into Tier 1.")
  });
}


