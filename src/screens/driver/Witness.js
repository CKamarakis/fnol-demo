import { I, el } from '../../core/dom.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.js';
import { gapShell, textField } from './GapsHub.js';

/* ---------- witness ---------- */
export function scrWitness(){
  const d=Store.s.draft;
  const body=el("div",{});
  body.append(el("div",{class:"grid2",style:"margin-bottom:16px"},
    el("button",{class:"choice","data-act":"set-witness","data-v":"yes","aria-pressed":String(d.witnessPresent===true)},
      el("span",{class:"cbox round",html:d.witnessPresent===true?I.chkS:""}),el("span",{},"Yes, someone saw it")),
    el("button",{class:"choice","data-act":"set-witness","data-v":"no","aria-pressed":String(d.witnessPresent===false)},
      el("span",{class:"cbox round",html:d.witnessPresent===false?I.chkS:""}),el("span",{},"No one"))
  ));
  if(d.witnessPresent===true){
    body.append(textField("Their name — first name is enough","witnessName","Anything you can get"));
    body.append(textField("A phone number","witnessPhone","+49 …","tel"));
    body.append(el("div",{class:"card-quiet"},
      el("p",{class:"tiny",style:"line-height:1.5",html:"A number with no name still works. <b style='color:var(--ink-2)'>Do not let the name field stop you getting the number.</b>"})));
  }
  return gapShell({
    id:"witness", title:"Did anyone see it?",
    sub:"If someone stopped, this is the most valuable thirty seconds of the whole report.",
    body,
    note: dn("Highest value per character in the form",
      "An independent witness is often the difference between a liability split and a clean outcome, and they are under <b>zero obligation</b> to stay. Ten minutes from now they are an unreachable stranger. That is why this is screen one of the optional flow, ahead of photographs and ahead of the other driver's paperwork.")
  });
}


