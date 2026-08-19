import { $, I, el, esc } from '../../core/dom.js';
import { PERISHABLE, SCENARIOS, T } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn, savedChip } from '../../components/DriverShell.js';

/* ---------- S3 · perishability hub ---------- */
export function gapItems(){
  const s=Store.s, d=s.draft, sc=SCENARIOS[s.scenario];
  const items=[];
  const add=(id,screen,ic,doneWhen)=>{
    if(!sc.perishable.includes(id) && id!=="otherIns" && id!=="cargo") return;
    const p=PERISHABLE[id];
    items.push({id, screen, ic, p, done:doneWhen, skipped:d.skipped.includes(id)});
  };
  add("witness","witness",I.user, d.witnessPresent!==null);
  if(sc.thirdParty) add("otherPlate","otherv",I.plate, !!d.otherPlate);
  add("photos","photos",I.cam, (sc.photos||[]).every(k=>d.photos[k]));
  if(sc.eas) add("eas","eas",I.pen, d.easA.length>0 || d.easB.length>0);
  add("police","police",I.police, d.policeAttended!==null);
  if(sc.type!=="glass") add("cargo","cargo",I.box, d.cargoLaden!==null);
  if(sc.thirdParty) add("otherIns","otherins",I.shield, !!d.otherInsurer);
  // Sort by perishability. The DEFAULT half-life ordering lives in PERISHABLE.ord,
  // but a scenario may override it: theft promotes the police reference above
  // photographs, because no German insurer progresses a theft claim without a
  // crime reference and there is no damage to photograph anyway. The scenario's
  // own perishable[] array is the authority when it lists an item.
  const rank = id => {
    const i = sc.perishable.indexOf(id);
    return i >= 0 ? i : 100 + PERISHABLE[id].ord;   // scenario order first, then the cool tail
  };
  items.sort((a,b)=> rank(a.id)-rank(b.id));
  return items;
}

export function scrGaps(){
  const s=Store.s;
  const items=gapItems();
  const remaining = items.filter(x=>!x.done && !x.skipped);
  const wrap=el("div",{class:"scroll"});
  const inner=el("div",{class:"pad",style:"padding-top:18px"});

  inner.append(el("div",{class:"step-meta"},
    el("span",{class:"step-count",text:"optional · nothing here blocks you"}), savedChip()));
  inner.append(el("h2",{class:"h2",text:T("perish")}));
  inner.append(el("p",{class:"sub",style:"font-size:14.5px",
    text:"Ordered by how fast each one evaporates. Not by how the form was drawn."}));
  inner.append(el("div",{class:"sp16"}));

  items.forEach(it=>{
    const cls = it.done?"done": it.skipped?"skipped":"";
    const wCls = it.p.half==="minutes" ? "" : it.p.half==="hours" ? "" : "cool";
    inner.append(el("button",{class:"perish-item "+cls,"data-act":"goto","data-v":it.screen},
      el("span",{class:"pi-clock",html: it.done?`<span style="color:var(--ok)">${I.chk}</span>`: it.skipped?`<span style="color:var(--ink-3)">${I.x}</span>`:it.ic}),
      el("span",{class:"pi-body"},
        el("span",{class:"pi-title",text:it.p.label}),
        el("span",{class:"pi-window "+wCls}, it.skipped ? el("b",{style:"color:var(--ink-3)",text:"Skipped — we'll ask later"}) : el("b",{text:it.p.window}))),
      el("span",{html:I.chev,style:"color:var(--ink-3);flex:none"})
    ));
  });

  inner.append(dn("Perishability ordering — my recommendation, not an industry standard",
    "Most FNOL forms are ordered by <i>logical grouping</i>: your details, their details, the incident, the vehicle. That ordering optimises for whoever drew the schema. This one is ordered by <b>half-life</b>. A witness is gone in ten minutes; the other party's insurer name is derivable from their plate next week. So the witness is first and the insurer is last — even though the insurer feels more “important”. Say plainly what you get for it: the last thing captured is the first thing lost, and contested liability is decided on exactly these items."));

  inner.append(el("div",{class:"sp12"}));
  inner.append(el("div",{class:"card-quiet"},
    el("p",{class:"tiny",style:"line-height:1.5",html:"<b style='color:var(--ink-2)'>Never a percentage bar.</b> A progress bar tells a driver they are failing at something. This tells them what the world is about to take away. Same information, opposite emotional effect on someone with adrenaline in their hands."})));

  inner.append(el("div",{class:"sp28"}));
  wrap.append(inner);

  const dock=el("div",{class:"dock"});
  if(remaining.length){
    dock.append(el("button",{class:"btn btn-primary btn-lg","data-act":"goto","data-v":remaining[0].screen},
      "Next: "+remaining[0].p.label));
  }
  dock.append(el("button",{class:"btn btn-quiet","data-act":"finish-now"},
    remaining.length ? "Stop here — the rest can wait" : "Done"));
  return el("div",{style:"flex:1;display:flex;flex-direction:column;overflow:hidden"},wrap,dock);
}

/* generic sub-screen shell with a non-shaming Skip */
export function gapShell({id,title,sub,body,note,dockExtra,nextLabel}){
  const wrap=el("div",{class:"scroll"});
  const inner=el("div",{class:"pad",style:"padding-top:16px"});
  inner.append(el("div",{class:"step-meta"},
    el("button",{class:"step-count","data-act":"goto","data-v":"gaps",style:"display:flex;align-items:center;gap:5px"},
      el("span",{html:I.back,style:"width:14px"}),"All items"),
    savedChip()));
  inner.append(el("div",{style:"display:flex;align-items:center;gap:9px;flex-wrap:wrap"},
    el("h2",{class:"h2",text:title}),
    el("span",{class:"chip warn",style:"font-size:10px",text:PERISHABLE[id]?PERISHABLE[id].window:"optional"})));
  if(sub) inner.append(el("p",{class:"sub",style:"font-size:14.5px",text:sub}));
  inner.append(el("div",{class:"sp16"}));
  inner.append(body);
  if(PERISHABLE[id]) inner.append(el("div",{class:"card-quiet",style:"margin-top:16px"},
    el("p",{class:"tiny",style:"line-height:1.5",html:"<b style='color:var(--ink-2)'>Why this is here, in this position:</b> "+esc(PERISHABLE[id].why)})));
  if(note) inner.append(note);
  inner.append(el("div",{class:"sp28"}));
  wrap.append(inner);

  const dock=el("div",{class:"dock"});
  if(dockExtra) dock.append(dockExtra);
  dock.append(el("button",{class:"btn btn-primary btn-lg","data-act":"gap-next","data-v":id}, nextLabel||T("contin")));
  // one tap. never asks "are you sure?".
  dock.append(el("button",{class:"skip","data-act":"gap-skip","data-v":id}, T("skip")));
  return el("div",{style:"flex:1;display:flex;flex-direction:column;overflow:hidden"},wrap,dock);
}

export function textField(label, key, ph, type){
  const d=Store.s.draft;
  return el("div",{style:"margin-bottom:14px"},
    el("label",{class:"lbl",text:label}),
    el("div",{class:"inp-wrap has-mic"},
      el("input",{class:"inp","data-field":key, value:d[key]||"", placeholder:ph||"", type:type||"text",
        inputmode: type==="tel"?"tel":undefined, autocomplete:"off"}),
      el("button",{class:"mic","data-act":"voice","data-v":key,html:I.mic,title:"Dictate — hands may be shaking or occupied"})
    ));
}


