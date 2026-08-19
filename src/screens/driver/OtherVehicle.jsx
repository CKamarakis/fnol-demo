import { el } from '../../core/dom.jsx';
import { I } from '../../core/utils.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { gapShell, textField } from './GapsHub.jsx';

/* ---------- other vehicle · plate first ---------- */
export function scrOtherVehicle(){
  const d=Store.s.draft;
  const body=el("div",{});
  body.append(el("label",{class:"lbl",style:"font-size:15px;color:var(--ink)",text:"The other vehicle's plate"}));
  body.append(el("div",{class:"inp-wrap has-mic"},
    el("input",{class:"inp plate-inp","data-field":"otherPlate",value:d.otherPlate||"",placeholder:"M-XY 1234",autocomplete:"off",autocapitalize:"characters"}),
    el("button",{class:"mic","data-act":"voice","data-v":"otherPlate",html:I.mic})));
  body.append(el("div",{class:"card-quiet",style:"margin-top:12px"},
    el("div",{style:"display:flex;gap:10px"},el("span",{html:I.info,style:"color:var(--accent);flex:none;margin-top:2px"}),
      el("p",{class:"tiny",style:"line-height:1.5;font-size:13.5px",
        html:"<b style='color:var(--ink)'>Just the plate is enough. We'll chase the rest.</b>"}))));

  body.append(el("div",{class:"sp20"}));
  body.append(el("button",{class:"btn btn-ghost","data-act":"toggle-otherdetail"},
    Store.s.subScreen==="otherdetail" ? "Hide the rest" : "They're standing here — add more (optional)"));
  if(Store.s.subScreen==="otherdetail"){
    body.append(el("div",{class:"sp16"}));
    body.append(textField("Make and colour","otherMake","Silver Sprinter"));
    body.append(textField("Their name","otherDriver",""));
    body.append(textField("Their phone","otherPhone","","tel"));
  }
  return gapShell({
    id:"otherPlate", title:"The other vehicle",
    sub:"One field. Everything else about them can be found from it.",
    body,
    note: dn("Plate-first, and everything else demoted",
      "A German plate resolves to the keeper and, through the central register (Zentralruf der Autoversicherer), to the insurer. So the plate is <b>load-bearing</b> and the insurer name is <b>derivable</b> — which is exactly why the insurer field sits at the bottom of the perishable list and not next to this one. Asking a shaken driver for a policy number while the other party is walking to their car costs you the plate.")
  });
}


