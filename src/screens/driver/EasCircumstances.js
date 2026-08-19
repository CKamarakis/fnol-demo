import { EAS_STATEMENTS } from '../../data/domain.js';
import { I, el } from '../../core/dom.js';
import { IMPACT_LABEL, svgImpact } from '../../components/svg.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.js';
import { gapShell } from './GapsHub.js';

/* ---------- EAS circumstances ---------- */
export function scrEAS(){
  const s=Store.s, d=s.draft;
  const body=el("div",{});

  body.append(el("div",{class:"card-quiet",style:"margin-bottom:14px"},
    el("div",{style:"display:flex;gap:10px"},el("span",{html:I.info,style:"color:var(--accent);flex:none;margin-top:2px"}),
      el("p",{class:"tiny",style:"line-height:1.5",
        html:"These are the <b style='color:var(--ink-2)'>17 statements from the European Accident Statement</b> — the same list the other driver has in their glovebox, in their language. Tick what was happening. <b style='color:var(--ink-2)'>Nobody is admitting anything by ticking a box.</b>"}))));

  // language for EAS column text
  body.append(el("div",{style:"display:flex;justify-content:flex-end;margin-bottom:10px"},
    el("div",{class:"seg",style:"transform:scale(.9);transform-origin:right"},
      ...["en","de","pl"].map(k=>el("button",{"data-act":"eas-lang","data-v":k,"aria-pressed":String(s.easLangCol===k),
        style:"font-family:var(--sans);font-weight:650"},k.toUpperCase())))));

  const grid=el("div",{class:"eas-grid"});
  grid.append(el("div",{class:"eas-head"},
    el("div",{class:"hA",html:"A<br>You"}), el("div",{},"What was happening"), el("div",{class:"hB",html:"B<br>Them"})));
  EAS_STATEMENTS.forEach(st=>{
    const onA=d.easA.includes(st.n), onB=d.easB.includes(st.n);
    grid.append(el("div",{class:"eas-row"},
      el("div",{class:"eas-tick A"+(onA?" on":""),"data-act":"eas-tick","data-col":"A","data-n":st.n},
        el("i",{html:onA?I.chkS:""})),
      el("div",{class:"txt"}, el("span",{class:"no",text:st.n}), el("span",{text:st[s.easLangCol]||st.en})),
      el("div",{class:"eas-tick B"+(onB?" on":""),"data-act":"eas-tick","data-col":"B","data-n":st.n},
        el("i",{html:onB?I.chkS:""}))
    ));
  });
  grid.append(el("div",{class:"eas-count"},
    el("span",{style:"color:#3d5f54",text:"A — "+d.easA.length+" ticked"}),
    el("span",{style:"color:#9a6410",text:"B — "+d.easB.length+" ticked"})));
  body.append(grid);

  // point of impact
  body.append(el("div",{class:"sp20"}));
  body.append(el("p",{class:"lbl",style:"font-size:15px;color:var(--ink)",text:"Where were you hit? (EAS box 10)"}));
  body.append(el("div",{class:"impact-wrap",html:svgImpact(d.impact)}));
  if(d.impact) body.append(el("p",{class:"tiny",style:"text-align:center;margin-top:7px",text:"Point of impact: "+IMPACT_LABEL[d.impact]}));

  // sketch
  body.append(el("div",{class:"sp20"}));
  body.append(el("p",{class:"lbl",style:"font-size:15px;color:var(--ink)",text:"Draw what happened (EAS box 13)"}));
  body.append(el("div",{class:"sketch-wrap"},el("canvas",{id:"sketchCanvas",width:"640",height:"420"})));
  body.append(el("div",{class:"sketch-tools"},
    el("button",{class:"btn btn-sm btn-ghost","data-act":"sketch-clear"},"Clear"),
    el("span",{class:"tiny",style:"align-self:center"},"Finger or mouse. Arrows and two boxes is plenty.")));

  // signatures
  body.append(el("div",{class:"sp20"}));
  body.append(el("p",{class:"lbl",style:"font-size:15px;color:var(--ink)",text:"Both drivers sign"}));
  body.append(el("div",{style:"display:grid;gap:12px"},
    el("div",{},
      el("div",{class:"tiny",style:"margin-bottom:6px;color:#3d5f54;font-weight:700",text:"A — you (Marek K.)"}),
      el("div",{class:"sig-pad"+(d.sigA?" signed":"")},el("canvas",{id:"sigA",width:"620",height:"220"}),
        el("span",{class:"sig-hint",text:"sign here"}))),
    el("div",{},
      el("div",{class:"tiny",style:"margin-bottom:6px;color:#9a6410;font-weight:700",text:"B — the other driver"}),
      el("div",{class:"sig-pad"+(d.sigB?" signed":"")},el("canvas",{id:"sigB",width:"620",height:"220"}),
        el("span",{class:"sig-hint",text:"hand them the phone"})))
  ));
  body.append(el("div",{style:"display:flex;gap:8px;margin-top:10px"},
    el("button",{class:"btn btn-sm btn-ghost","data-act":"sig-clear","data-v":"A"},"Clear A"),
    el("button",{class:"btn btn-sm btn-ghost","data-act":"sig-clear","data-v":"B"},"Clear B")));

  body.append(el("div",{class:"sp16"}));
  body.append(el("div",{class:"card-quiet",style:"border-color:#e8d3a4"},
    el("div",{style:"display:flex;gap:10px"},el("span",{html:I.warn,style:"color:var(--warn);flex:none;margin-top:2px"}),
      el("p",{class:"tiny",style:"line-height:1.5",
        html:"<b style='color:var(--ink-2)'>Known weak link:</b> half the value of this section depends on a stranger being willing to sign a phone screen. Column B is fully skippable and the report is still valid without it — but be honest that the outcome is materially worse."}))));

  return gapShell({
    id:"eas", title:"What was happening", sub:"The European Accident Statement, box 12 — both columns.",
    body,
    note: dn("Why we adopted the EAS instead of designing a schema",
      "The constat amiable / Europäischer Unfallbericht has been the cross-border standard for decades. Every European handler reads it without training, both parties fill in <b>the same 17 statements</b> in their own language, and — the part that is legally load-bearing — it establishes <b>agreed facts without either party admitting liability</b>. Inventing our own circumstance model would have meant a mapping layer, a translation argument with every counterparty, and no legal precedent. We took the standard and made it tappable.")
  });
}


