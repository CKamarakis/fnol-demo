import { I, el } from '../../core/dom.js';
import { SCENARIOS, T } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn, savedChip } from '../../components/DriverShell.js';
import { svgMap } from '../../components/svg.js';

/* ---------- S1 · TIER 1 — the six blocking fields ---------- */
export function scrTier1(){
  const s=Store.s, d=s.draft, sc=SCENARIOS[s.scenario];
  const wrap=el("div",{class:"scroll"});
  const head=el("div",{class:"pad",style:"padding-top:16px"});

  const answered = [
    d.vehicleConfirmed || d.vehicle,
    d.timeConfirmed || d.occurredAt,
    d.locationConfirmed || d.location,
    d.typeConfirmed || d.type,
    d.injured!==null,
    d.drivable!==null
  ].filter(Boolean).length;

  head.append(el("div",{class:"step-meta"},
    el("span",{class:"step-count",text:answered+" of 6 · nothing else blocks you"}),
    savedChip()
  ));
  head.append(el("h2",{class:"h2",text:T("tier1")}));
  head.append(el("p",{class:"sub",style:"font-size:14.5px",text:T("tier1sub")}));
  head.append(el("div",{class:"sp16"}));
  wrap.append(head);

  const inner=el("div",{class:"pad"});

  inner.append(dn("Two-tier mandatory — the whole argument in one screen",
    "Six fields block. Everything else in this product is <b>optional at submission</b> and captured afterwards. Five of the six are already answered by the vehicle, so the driver <b>confirms rather than types</b>. An abandoned FNOL is strictly worse than an incomplete one: an incomplete report still starts the clock, still dispatches recovery, still gives the driver something to hand the police officer. A form that demands the other party's policy number before it accepts anything gets closed at the roadside."));

  // 1 vehicle
  inner.append(fieldRow({
    ic:I.truck, label:"1 · Vehicle", value:d.vehicle, pre:true,
    state: d.vehicleConfirmed?"confirmed":"pending",
    act:"confirm-vehicle", hint:"tap to confirm"
  }));
  // 2 date/time
  inner.append(fieldRow({
    ic:I.clock, label:"2 · Date & time", value:d.occurredAt+" · "+new Date().toLocaleDateString("de-DE"), pre:true,
    state:d.timeConfirmed?"confirmed":"pending", act:"confirm-time", hint:"tap to confirm"
  }));
  // 3 location (map)
  const locWrap=el("div",{style:"margin-top:9px"});
  locWrap.append(fieldRow({
    ic:I.pin, label:"3 · Location", value:d.location, pre:true,
    state:d.locationConfirmed?"confirmed":"pending", act:"confirm-location", hint:"tap to confirm"
  }));
  if(!d.locationConfirmed){
    locWrap.append(el("div",{style:"margin-top:8px;border-radius:14px;overflow:hidden;border:1px solid var(--line)",html:svgMap(sc,true)}));
  }
  inner.append(locWrap);

  // 4 type
  inner.append(el("div",{style:"margin-top:9px"},
    fieldRow({
      ic:I.crash, label:"4 · What happened", value:{collision:"Collision with another vehicle",glass:"Glass / windscreen",theft:"Vehicle stolen"}[d.type]||d.type,
      pre:true, state:d.typeConfirmed?"confirmed":"pending", act:"confirm-type", hint:"tap to confirm"
    })
  ));
  if(s.subScreen==="type"){
    const box=el("div",{style:"margin-top:9px"});
    [["collision","Collision with another vehicle"],["glass","Glass / windscreen"],["theft","Vehicle stolen"],
     ["animal","Animal"],["single","Single vehicle — no one else involved"],["cargo","Cargo damage"],["other","Something else"]]
     .forEach(([v,l])=>box.append(el("button",{class:"choice","data-act":"set-type","data-v":v,"aria-pressed":String(d.type===v)},
        el("span",{class:"cbox round"}),el("span",{},l))));
    inner.append(box);
  }

  // 5 injured — the one real question
  inner.append(el("div",{class:"sp20"}));
  inner.append(el("div",{class:"dn-anchor"},
    el("p",{class:"lbl",style:"font-size:15px;color:var(--ink)",text:"5 · Is anyone hurt?"}),
    el("div",{class:"grid2"},
      el("button",{class:"choice","data-act":"set-injured","data-v":"no","aria-pressed":String(d.injured===false)},
        el("span",{class:"cbox round",html:d.injured===false?I.chkS:""}),el("span",{},"No one")),
      el("button",{class:"choice","data-act":"set-injured","data-v":"yes","aria-pressed":String(d.injured===true)},
        el("span",{class:"cbox round",html:d.injured===true?I.chkS:""}),el("span",{},"Yes"))
    )
  ));

  if(d.injured===true){
    inner.append(el("div",{class:"sp12"}));
    inner.append(el("p",{class:"lbl",text:"How bad — roughly?"}));
    [["walking","Walking and talking"],["needs_help","Needs help but conscious"],["serious","Serious"]]
      .forEach(([v,l])=>inner.append(el("button",{class:"choice","data-act":"set-severity","data-v":v,"aria-pressed":String(d.injurySeverity===v)},
        el("span",{class:"cbox round",html:d.injurySeverity===v?I.chkS:""}),el("span",{},l))));
    inner.append(el("div",{class:"sp12"}));
    inner.append(el("p",{class:"lbl",text:"Are emergency services there?"}));
    inner.append(el("div",{class:"grid2"},
      el("button",{class:"choice","data-act":"set-emergency","data-v":"yes","aria-pressed":String(d.injuryEmergency===true)},
        el("span",{class:"cbox round",html:d.injuryEmergency===true?I.chkS:""}),el("span",{},"Yes")),
      el("button",{class:"choice","data-act":"set-emergency","data-v":"no","aria-pressed":String(d.injuryEmergency===false)},
        el("span",{class:"cbox round",html:d.injuryEmergency===false?I.chkS:""}),el("span",{},"Not yet"))
    ));

    // The Art. 9 field — visibly greyed, reason inline. The restraint is the feature.
    inner.append(el("div",{class:"sp12"}));
    inner.append(el("div",{class:"blocked-field dn-anchor"},
      el("div",{class:"bf-label",text:"Description of the injuries"}),
      el("div",{class:"bf-fake",text:"Deliberately not collected here"}),
      el("div",{class:"bf-why"}, el("span",{html:I.warn}),
        el("div",{html:"<b style='color:#546b62'>GDPR Art. 9 — health data.</b> A roadside app on a driver's phone is not an appropriate basis for collecting someone's medical details, and a shaken driver is not a reliable source for them. The loss adjuster gathers this later under a proper basis, from the person it belongs to. <b style='color:#546b62'>Presence + severity band + emergency attended</b> is everything the reserve and the notification actually need."}))
    ));
    inner.append(dn("Why show a field you refuse to have",
      "A missing field reads as an oversight. A <b>visible refusal</b> reads as a decision. This is the same reason the no-fault omission is annotated rather than silent — restraint that nobody notices buys you nothing in a review."));
  }

  // 6 drivable — the money field
  inner.append(el("div",{class:"sp20"}));
  inner.append(el("div",{class:"dn-anchor"},
    el("p",{class:"lbl",style:"font-size:15px;color:var(--ink)",text:"6 · Can you drive it?"}),
    el("div",{class:"grid2"},
      el("button",{class:"choice","data-act":"set-drivable","data-v":"yes","aria-pressed":String(d.drivable===true)},
        el("span",{class:"cbox round",html:d.drivable===true?I.chkS:""}),el("span",{},"Yes")),
      el("button",{class:"choice","data-act":"set-drivable","data-v":"no","aria-pressed":String(d.drivable===false)},
        el("span",{class:"cbox round",html:d.drivable===false?I.chkS:""}),
        el("span",{},"No",el("span",{class:"choice-sub",text:"Recovery is dispatched now"})))
    )
  ));
  inner.append(dn("The money field",
    "“Can you drive it” answered at minute 2 instead of hour 6 is the single highest-value field in the form. It starts recovery, and it starts — or does not start — the <b>credit hire clock</b>. Replacement-vehicle exposure on a tractor unit runs into hundreds of euros a day, and the meter is running whether or not anyone has been told."));

  inner.append(el("div",{class:"sp28"}));
  wrap.append(inner);

  const ready = d.vehicleConfirmed && d.timeConfirmed && d.locationConfirmed && d.typeConfirmed
             && d.injured!==null && d.drivable!==null;

  const dock=el("div",{class:"dock"});
  dock.append(el("button",{class:"btn "+(ready?"btn-primary":"btn-secondary")+" btn-lg","data-act":"submit-tier1",
    disabled: !ready || undefined, style: ready?"":"opacity:.5"},
    ready ? T("submit") : (6-answered)+" left"));
  if(!ready) dock.append(el("p",{class:"tiny",style:"text-align:center;margin-top:8px",text:"Tap each line to confirm what the vehicle already told us."}));
  return el("div",{style:"flex:1;display:flex;flex-direction:column;overflow:hidden"},wrap,dock);
}

export function fieldRow({ic,label,value,pre,state,act,hint}){
  return el("button",{class:"frow "+(state||""),"data-act":act},
    el("span",{class:"frow-ic",html:ic}),
    el("span",{class:"frow-body"},
      el("span",{class:"frow-label"},label, pre?" ":"", pre?el("span",{class:"chip-pre",text:"from the truck"}):null),
      el("span",{class:"frow-value"+(value?"":" empty"),text:value||"—"})),
    el("span",{class:"frow-right"},
      state==="confirmed" ? el("span",{class:"tick",html:I.chk,style:"color:var(--ok)"})
        : el("span",{class:"tiny",style:"font-size:11px",text:hint||""}))
  );
}


