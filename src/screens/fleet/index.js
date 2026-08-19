import { I, el } from '../../core/dom.js';
import { PERISHABLE } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.js';

/* ==================================================================
   §8 FLEET MANAGER
   ================================================================== */
export const STATE_LABEL = {
  acknowledged:"acknowledged", submitted:"submitted", registered_with_tpa:"registered_with_tpa",
};
export function stateChip(row){
  if(row.tpa_state==="registered") return el("span",{class:"chip ok",text:"registered_with_tpa"});
  if(row.tpa_state==="queued")     return el("span",{class:"chip warn",text:"notified · TPA queued"});
  return el("span",{class:"chip info",text:"notified"});
}

export function renderFleet(){
  const s=Store.s;
  const body=el("div",{class:"desk-body"});

  const tabs=el("div",{class:"tabs"});
  [["list","Open incidents"],["merge","Duplicate merge queue"],["chase","Outstanding information"]]
    .forEach(([v,l])=>tabs.append(el("button",{"data-act":"fleet-tab","data-v":v,"aria-pressed":String(s.fleetTab===v)},l)));
  body.append(tabs);

  if(s.fleetTab==="list")  body.append(fleetList());
  if(s.fleetTab==="merge") body.append(fleetMerge());
  if(s.fleetTab==="chase") body.append(fleetChase());

  return el("div",{class:"deskframe"},
    el("div",{class:"desk-bar"},
      el("div",{class:"dots"},el("i"),el("i"),el("i")),
      el("span",{class:"desk-title",text:"the insurer Dispatch · Anja Weber · 40-vehicle fleet · Berlin"})),
    body);
}

export function fleetList(){
  const s=Store.s, rows=s.incidents;
  const box=el("div",{});

  const open=rows.length;
  const offRoad=rows.filter(r=>r.drivable===false).length;
  const disputed=rows.filter(r=>r.coverage==="disputed").length;
  const queued=rows.filter(r=>r.tpa_state==="queued").length;
  const avgTtn = s.startedAt && s.stoppedAt ? ((s.stoppedAt-s.startedAt)/1000).toFixed(0)+"s" : "—";

  box.append(el("div",{class:"fl-kpis"},
    kpi("Open incidents", String(open), "live", ""),
    kpi("Time to notification", avgTtn, "from detection to reference", parseFloat(avgTtn)<=90?"good":""),
    kpi("Off road", String(offRoad), offRoad?"recovery dispatched":"none", offRoad?"warn":""),
    kpi("Awaiting TPA", String(queued), queued?"queued — driver unaffected":"all forwarded", queued?"warn":""),
    kpi("Coverage review", String(disputed), disputed?"human task raised":"none", disputed?"warn":"")
  ));

  if(!rows.length){
    box.append(el("div",{class:"card",style:"text-align:center;padding:44px"},
      el("p",{class:"sub",text:"No incidents yet."}),
      el("p",{class:"tiny",style:"margin-top:8px",text:"Switch to the Driver persona and complete a report, or fire the duplicate simulator in the merge queue."}),
      el("div",{class:"sp16"}),
      el("button",{class:"btn btn-secondary btn-sm","data-act":"set-persona","data-v":"driver",style:"margin:0 auto"},"Go to the driver flow")));
    return box;
  }

  const t=el("table",{class:"tbl"});
  t.append(el("thead",{},el("tr",{},
    ...["Reference","Vehicle / driver","Type","Occurred","State","Coverage","Completeness","Time to notify",""]
      .map(h=>el("th",{text:h})))));
  const tb=el("tbody",{});
  rows.forEach(r=>{
    const c=r.completeness||{score:0,required_next:[]};
    const cls = c.score>=80?"hi":c.score>=50?"":"lo";
    tb.append(el("tr",{},
      el("td",{},el("span",{class:"mono",style:"font-weight:700;color:var(--ink)",text:r.reference})),
      el("td",{},
        el("div",{style:"font-weight:650",text:r.vehicle}),
        el("div",{class:"tiny",text:r.driver+" · "+(r.channel==="driver_app"?"driver app":r.channel)})),
      el("td",{},el("span",{class:"chip plain",text:r.type})),
      el("td",{class:"mono",style:"color:var(--ink-2)",text:r.occurredAt}),
      el("td",{},stateChip(r)),
      el("td",{}, r.coverage==="disputed"
        ? el("span",{class:"chip danger",text:"coverage_disputed"})
        : el("span",{class:"chip ok",text:"in_force"})),
      el("td",{},
        el("div",{style:"display:flex;align-items:center;gap:8px"},
          el("span",{class:"comp-bar"},el("i",{class:cls,style:"width:"+c.score+"%"})),
          el("span",{class:"mono",style:"font-size:12px",text:c.score+"%"}))),
      el("td",{},
        r.drivable===false ? el("span",{class:"chip warn",text:"off road · ETA 45m"}) : el("span",{class:"tiny",text:"drivable"})),
      el("td",{},el("button",{class:"linkish","data-act":"open-export","data-v":r.id},"Export →"))
    ));
    if(r.coverage==="disputed"){
      tb.append(el("tr",{},el("td",{colspan:"9",style:"background:#fde5e0;border-bottom:1px solid var(--line)"},
        el("div",{style:"display:flex;gap:11px;align-items:flex-start"},
          el("span",{html:I.warn,style:"color:var(--danger-deep);flex:none;margin-top:2px"}),
          el("div",{},
            el("div",{style:"font-weight:700;font-size:13px;color:#b8341c",text:"Review task · underwriting queue · vehicle not on policy schedule at date of loss"}),
            el("p",{class:"tiny",style:"margin-top:5px;max-width:820px;line-height:1.5",
              html:"The incident was <b style='color:var(--ink-2)'>accepted</b>. A reference was issued and recovery dispatched. The driver saw no difference and was told nothing at the roadside. <b style='color:var(--ink-2)'>Not rejected at intake</b> — GDPR Art. 22: an automated decision producing a legal or similarly significant effect on an individual requires human involvement and a right to contest. Operationally it is also the right call, because schedule data is stale far more often than drivers are dishonest."}))))));
    }
  });
  t.append(tb);
  box.append(el("div",{class:"tbl-wrap"},t));

  box.append(el("div",{class:"sp20"}));
  box.append(dn("Time to notification is the number this whole product moves",
    "Everything upstream — telematics pre-fill, six blocking fields, client-issued reference, accept-then-forward — exists to move this one column. It is not a vanity metric: FNOL latency drives credit-hire exposure, salvage recovery value, and whether the perishable evidence still exists when someone goes looking for it."));
  return box;
}

export function kpi(lbl,val,sub,cls){
  return el("div",{class:"kpi "+(cls||"")},
    el("div",{class:"k-lbl",text:lbl}), el("div",{class:"k-val",text:val}), el("div",{class:"k-sub",text:sub}));
}

export function fleetMerge(){
  const g=Store.s.mergeGroup;
  const box=el("div",{});
  box.append(el("div",{class:"fl-head"},
    el("div",{},
      el("h3",{style:"margin:0;font-size:17px",text:"Duplicate merge queue"}),
      el("p",{class:"tiny",style:"margin-top:5px;max-width:660px",
        text:"One collision is routinely reported three ways: the vehicle detects it, the driver reports it, and the fleet manager logs a phone call. Three intake events, three reserves, one accident."})),
    el("button",{class:"btn btn-primary btn-sm","data-act":"sim-dupes"},
      el("span",{html:I.merge}),"Simulate the same collision three ways")
  ));

  if(!g){
    box.append(el("div",{class:"card",style:"text-align:center;padding:40px"},
      el("p",{class:"sub",text:"Nothing in the queue."}),
      el("p",{class:"tiny",style:"margin-top:6px",text:"Fire the simulator above to watch the matcher run."})));
    box.append(el("div",{class:"sp20"}));
    box.append(dn("Why this is a founding-team problem, not a phase-two problem",
      "Duplicate reserves inflate incurred loss on the books and therefore <b>loss ratio</b> — a number the founders are very likely measured on. Three open reserves of €12,500 for one accident is €25,000 of phantom exposure until someone notices manually. The matcher is cheap to build on day one and expensive to retrofit once the reserving history is already wrong."));
    return box;
  }

  const card=el("div",{class:"merge-card"});
  card.append(el("div",{class:"merge-head"},
    el("div",{style:"display:flex;align-items:center;gap:11px;flex-wrap:wrap"},
      el("span",{class:"mono",style:"font-weight:700",text:g.id}),
      el("span",{class:"chip "+(g.decision==="auto_merge"?"ok":"warn"),
        text: g.decision==="auto_merge"?"auto-merge — exact tuple":"human review — near match"}),
      el("span",{class:"tiny",text:"matcher window: vehicle · ±15 min · 500 m"})),
    g.resolved ? el("span",{class:"chip ok",text:"merged · 3 → 1"})
      : el("button",{class:"btn btn-primary btn-sm","data-act":"resolve-merge"},"Merge into one incident")
  ));

  const cols=el("div",{class:"merge-cols"});
  g.reports.forEach((r,i)=>{
    cols.append(el("div",{class:"merge-col"+(i>0?" dup":"")},
      el("h5",{text:(i===0?"SURVIVOR · ":"")+r.label}),
      el("dl",{},
        el("dt",{},"channel"),  el("dd",{text:r.ch}),
        el("dt",{},"at"),       el("dd",{text:r.at}),
        el("dt",{},"vehicle"),  el("dd",{text:r.vehicle}),
        el("dt",{},"Δt"),       el("dd",{text:(r.dtMin>=0?"+":"")+r.dtMin+" min"}),
        el("dt",{},"distance"), el("dd",{text:r.dist+" m"}),
        el("dt",{},"reserve"),  el("dd",{text:"€"+r.reserve.toLocaleString("de-DE")})),
      el("p",{class:"tiny",style:"margin-top:9px;line-height:1.45",text:r.note}),
      el("div",{class:"sp8"}),
      el("div",{class:"match-math"},
        "vehicle ", el("b",{class:r.vehicleMatch?"":"no",text:r.vehicleMatch?"✓":"✕"}),
        "  ·  ±15min ", el("b",{class:r.timeMatch?"":"no",text:r.timeMatch?"✓":"✕"}),
        "  ·  ≤500m ", el("b",{class:r.geoMatch?"":"no",text:r.geoMatch?"✓":"✕"})),
      el("div",{style:"margin-top:9px"},
        el("span",{class:"chip "+(r.exact?"ok":"warn"),style:"font-size:10px",
          text:r.exact?"exact tuple → auto-merge":"near match → human review"}))
    ));
  });
  card.append(cols);

  card.append(el("div",{class:"merge-foot"},
    el("span",{class:"tiny"},"Reserve impact:"),
    el("span",{class:"mono",style:"color:var(--danger-deep);text-decoration:line-through",text:"€"+g.reserveBefore.toLocaleString("de-DE")}),
    el("span",{html:I.chev,style:"color:var(--ink-3)"}),
    el("span",{class:"mono",style:"color:var(--ok);font-weight:700",text:"€"+g.reserveAfter.toLocaleString("de-DE")}),
    el("span",{class:"tiny",style:"margin-left:6px",
      text:g.resolved?"€25,000 of phantom exposure released":"three reserves for one accident until this is resolved"})
  ));
  box.append(card);

  box.append(el("div",{class:"sp20"}));
  box.append(dn("The matching tuple, and why the third one goes to a human",
    "Matcher key is <code>(vehicle_id, occurred_at ±15 min, location ≤500 m)</code>. Telematics and the driver app agree on all three — <b>auto-merge, no human touches it</b>. The fleet manager's phone-call entry is 19 minutes late and 480 m out because she was reading a location back over a phone; time fails, so it lands in <b>human review</b> rather than being silently merged. Auto-merging a near match is how you lose a genuinely separate second incident on the same vehicle the same afternoon — which on a 40-truck fleet is not hypothetical."));
  return box;
}

export function fleetChase(){
  const s=Store.s;
  const box=el("div",{});
  box.append(el("div",{class:"fl-head"},
    el("div",{},
      el("h3",{style:"margin:0;font-size:17px",text:"Outstanding information"}),
      el("p",{class:"tiny",style:"margin-top:5px;max-width:680px",
        text:"Driven entirely by completeness.required_next from the API. Nothing on this screen is hardcoded — the same array drives the driver's remaining list."}))
  ));

  if(!s.incidents.length){
    box.append(el("div",{class:"card",style:"text-align:center;padding:40px"},
      el("p",{class:"sub",text:"Nothing outstanding — no incidents yet."})));
    return box;
  }

  const list=el("div",{class:"chase"});
  s.incidents.forEach(r=>{
    const c=r.completeness||{required_next:[],perishable:[],score:0};
    list.append(el("div",{class:"chase-row"},
      el("div",{class:"cr-main"},
        el("div",{style:"display:flex;align-items:center;gap:10px;flex-wrap:wrap"},
          el("span",{class:"mono",style:"font-weight:700",text:r.reference}),
          el("span",{class:"tiny",text:r.vehicle+" · "+r.driver}),
          el("span",{class:"chip "+(c.score>=80?"ok":"warn"),style:"font-size:10.5px",text:c.score+"% complete"})),
        c.required_next.length
          ? el("ul",{class:"chase-list"}, ...c.required_next.map(id=>{
              const p=PERISHABLE[id];
              const perish=c.perishable.includes(id);
              return el("li",{class:perish?"perish":"", title:p?p.why:""},
                (p?p.label:id)+(perish?" · perishable":""));
            }))
          : el("p",{class:"tiny",style:"margin-top:7px;color:var(--ok)",text:"Nothing outstanding."})),
      el("div",{style:"flex:none;display:flex;gap:8px"},
        el("button",{class:"btn btn-sm btn-ghost","data-act":"req-refresh","data-v":r.id},"GET /requirements"),
        c.required_next.length ? el("button",{class:"btn btn-sm btn-secondary","data-act":"send-chase","data-v":r.id},"Message the driver") : null)
    ));
  });
  box.append(list);
  box.append(el("div",{class:"sp20"}));
  box.append(dn("The API drives the prompting, not the UI",
    "Both the driver's remaining-items list and this chase list read the same <code>completeness.required_next</code> array off the incident. Add a field to the model and both surfaces update; there is no second place where “what's still missing” is decided. Items still inside their perishability window are highlighted, because chasing a witness contact tomorrow is <b>pointless</b> while chasing an insurer name tomorrow is entirely normal."));
  return box;
}


