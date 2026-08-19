import { I, el } from '../../core/dom.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.js';
import { gapShell, textField } from './GapsHub.js';

/* ---------- police ---------- */
export function scrPolice(){
  const d=Store.s.draft, s=Store.s;
  const theft = s.scenario==="theft";
  const body=el("div",{});
  body.append(el("div",{class:"grid2",style:"margin-bottom:14px"},
    el("button",{class:"choice","data-act":"set-police","data-v":"yes","aria-pressed":String(d.policeAttended===true)},
      el("span",{class:"cbox round",html:d.policeAttended===true?I.chkS:""}),el("span",{},"Yes")),
    el("button",{class:"choice","data-act":"set-police","data-v":"no","aria-pressed":String(d.policeAttended===false)},
      el("span",{class:"cbox round",html:d.policeAttended===false?I.chkS:""}),el("span",{},"No"))
  ));
  if(d.policeAttended===true){
    body.append(textField(theft?"Crime reference (Aktenzeichen)":"Reference number, if they gave you one","policeRef","e.g. 2026/074/0084217"));
  }
  if(theft && d.policeAttended!==true){
    body.append(el("div",{class:"card-quiet",style:"border-color:#e8d3a4"},
      el("div",{style:"display:flex;gap:10px"},el("span",{html:I.warn,style:"color:var(--warn);flex:none;margin-top:2px"}),
        el("p",{class:"tiny",style:"line-height:1.5",
          html:"<b style='color:var(--ink-2)'>For a theft this is nearly blocking.</b> No German insurer will progress a theft claim without a police report. We still don't block on it — you may be on a motorway at 4 a.m. — but we will chase this one hard."}))));
  }
  return gapShell({
    id:"police", title:theft?"Have you reported it stolen?":"Did the police attend?",
    sub:theft?"This is the one thing a theft claim cannot proceed without.":"One question while the officer is still here.",
    body,
    note: dn("Hours, not minutes",
      "A police reference is retrievable next week with a phone call, so it sits <b>below</b> the witness and the plate. It is above cargo and the other insurer because the officer is standing here <i>now</i> and it costs one question. Theft inverts this: no report, no claim, so it moves to the top for that scenario.")
  });
}


