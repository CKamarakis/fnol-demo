import { $, el } from '../../core/dom.jsx';
import { I, esc } from '../../core/utils.js';
import { ACORD_MAP, EAS_STATEMENTS, PHOTO_SLOTS, SCENARIOS } from '../../data/domain.js';
import { IMPACT_LABEL } from '../../components/svg.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';

/* ==================================================================
   §10 EAS EXPORT — the closing move
   ================================================================== */
export function buildIncidentJson(){
  const s=Store.s, d=s.draft, sc=SCENARIOS[s.scenario], t=sc.telematics;
  const inc=s.incident;
  return {
    schema:"fnol.incident/v1",
    id: inc? inc.id : "inc_(unsaved)",
    reference: s.reference || null,
    state: inc? inc.state : "draft",
    coverage_status: inc? inc.coverage_status : "in_force",
    occurred_at: new Date().toISOString().slice(0,11)+d.occurredAt+":00+02:00",
    reported_at: new Date().toISOString(),
    reporting_channel: "driver_app",
    detected_by: "telematics",
    type: d.type,
    location: { description:d.location, lat:d.lat, lon:d.lon, source:"telematics", country:"DE" },
    vehicle: {
      registration:d.vehicle, make_model:"DAF XF 480", drivable:d.drivable,
      damage_points: d.impact? [d.impact] : [], fleet_id:"INS-FL-0087"
    },
    driver: {
      // Driver linkage is a purpose-limited ASSOCIATION with its own retention
      // clock, not a field on a monolithic person record. Costs nothing now,
      // very expensive to retrofit.
      association_id:"drv_assoc_"+(inc?inc.id.slice(4,10):"xxxxxx"),
      display_name:t.driver, purpose:"claims_handling",
      retention:"P7Y from claim closure", linked_profile:"external_ref_only"
    },
    injuries: d.injured===null ? null : {
      present: d.injured,
      severity_band: d.injurySeverity,
      emergency_services_attended: d.injuryEmergency,
      description: null,
      description_omitted_reason: "GDPR Art. 9 — special category health data not collected at intake"
    },
    third_parties: sc.thirdParty && d.otherPlate ? [{
      vehicle:{ plate:d.otherPlate, make_model:d.otherMake||null },
      driver:{ name:d.otherDriver||null, phone:d.otherPhone||null },
      insurer_name: d.otherInsurer||null, policy_number: d.otherPolicy||null
    }] : [],
    witnesses: d.witnessPresent && (d.witnessName||d.witnessPhone)
      ? [{name:d.witnessName||null, phone:d.witnessPhone||null}] : [],
    authority: { attended:d.policeAttended, reference:d.policeRef||null },
    cargo: sc.type==="glass" ? null : {
      laden:d.cargoLaden, description:d.cargoDesc||null,
      trailer:d.trailer||null, hazardous_adr:d.hazardous
    },
    eas: sc.eas ? {
      standard:"European Accident Statement (constat amiable / Europäischer Unfallbericht)",
      circumstances_a: d.easA.slice().sort((a,b)=>a-b),
      circumstances_b: d.easB.slice().sort((a,b)=>a-b),
      point_of_impact: d.impact,
      sketch_present: !!d.sketch,
      signature_a_present: !!d.sigA,
      signature_b_present: !!d.sigB,
      liability_statement: "No admission of liability is recorded or requested by this document."
    } : null,
    fault: null,
    fault_note: "Intentionally absent. No field in this product asks who was at fault.",
    attachments: Object.keys(d.photos).filter(k=>!d.photos[k].skipped)
      .map(k=>({slot:k, label:(PHOTO_SLOTS[k]||{}).label, captured_at:d.photos[k].at})),
    skipped_deliberately: d.skipped,
    completeness: inc ? inc.completeness : null,
  };
}

export function jsonHighlight(obj){
  const raw=JSON.stringify(obj,null,2);
  return esc(raw)
    .replace(/&quot;([^&]*?)&quot;(\s*:)/g,'<span class="k">"$1"</span>$2')
    .replace(/:\s&quot;(.*?)&quot;/g,': <span class="s">"$1"</span>')
    .replace(/:\s(-?\d+\.?\d*)/g,': <span class="n">$1</span>')
    .replace(/:\s(true|false|null)/g,': <span class="b">$1</span>');
}

export function renderExport(){
  const s=Store.s, d=s.draft, sc=SCENARIOS[s.scenario], t=sc.telematics;
  const wrap=el("div",{class:"export-shell"});

  wrap.append(el("div",{class:"fl-head noprint"},
    el("div",{},
      el("h3",{style:"margin:0;font-size:18px",text:"Export · "+(s.reference||"draft")}),
      el("p",{class:"tiny",style:"margin-top:5px;max-width:700px",
        text:"Two outputs. One a European handler recognises without training, one a carrier system ingests without transcription."})),
    el("div",{style:"display:flex;gap:8px"},
      el("button",{class:"btn btn-sm btn-secondary","data-act":"print"},"Print / save as PDF"),
      el("button",{class:"btn btn-sm btn-ghost","data-act":"close-export"},"Back"))
  ));

  /* ---- (a) the EAS-equivalent document ---- */
  const doc=el("div",{class:"eas-doc"});
  doc.append(el("div",{class:"eas-doc-head"},
    el("div",{},
      el("h2",{text:"European Accident Statement — equivalent"}),
      el("p",{class:"sub",text:"Constat amiable européen d'accident automobile · Europäischer Unfallbericht"}),
      el("p",{class:"sub",style:"margin-top:5px",
        text:"Reference "+(s.reference||"—")+"  ·  "+d.occurredAt+" "+new Date().toLocaleDateString("de-DE")+"  ·  "+d.location})),
    el("div",{class:"eas-fake-stamp",html:"DEMO ARTEFACT<br>generated by an FNOL prototype<br>not a filed document"})
  ));

  const cols=el("div",{class:"eas-cols"});

  // column A — blue, us
  const A=el("div",{class:"eas-col A"});
  A.append(el("h4",{text:"A · Vehicle A"}));
  [["Insured / policyholder","the insurer GmbH (fleet)"],["Policy number","INS-FLEET-0087"],
   ["Vehicle","DAF XF 480"],["Registration",d.vehicle],["Country","D"],
   ["Driver",t.driver],["Licence no.","B4471-88213-DE"],
   ["Point of impact", d.impact?IMPACT_LABEL[d.impact]:""],
   ["Visible damage", d.impact?("Impact zone: "+IMPACT_LABEL[d.impact]):""],
   ["Remarks", d.notes||""]
  ].forEach(([k,v])=>A.append(easField(k,v)));
  cols.append(A);

  // middle — the 17 statements
  const M=el("div",{class:"eas-col M"});
  M.append(el("h4",{text:"12 · Circumstances"}));
  const mt=el("table",{class:"eas-mid-tbl"});
  EAS_STATEMENTS.forEach(st=>{
    const onA=d.easA.includes(st.n), onB=d.easB.includes(st.n);
    mt.append(el("tr",{},
      el("td",{class:"b"},el("div",{class:"eas-box A"+(onA?" on":""),text:onA?"✕":""})),
      el("td",{class:"n",text:st.n}),
      el("td",{},st.en),
      el("td",{class:"b"},el("div",{class:"eas-box B"+(onB?" on":""),text:onB?"✕":""}))
    ));
  });
  mt.append(el("tr",{},
    el("td",{class:"b",style:"font-weight:800;font-size:9px;text-align:center",text:d.easA.length}),
    el("td",{class:"n"}),
    el("td",{style:"font-size:8.5px;color:#64786f;letter-spacing:.05em",text:"BOXES MARKED"}),
    el("td",{class:"b",style:"font-weight:800;font-size:9px;text-align:center",text:d.easB.length})));
  M.append(mt);
  cols.append(M);

  // column B — yellow, them
  const B=el("div",{class:"eas-col B"});
  B.append(el("h4",{text:"B · Vehicle B"}));
  [["Insured / policyholder",""],["Policy number",d.otherPolicy||""],
   ["Vehicle",d.otherMake||""],["Registration",d.otherPlate||""],["Country", d.otherPlate?"D":""],
   ["Driver",d.otherDriver||""],["Licence no.",""],
   ["Insurer",d.otherInsurer||""],
   ["Point of impact",""],["Remarks",""]
  ].forEach(([k,v])=>B.append(easField(k,v)));
  cols.append(B);
  doc.append(cols);

  // sketch + impact row
  const sr=el("div",{class:"eas-sketchrow"});
  sr.append(el("div",{},
    el("h4",{text:"10 · Point of impact"}),
    el("div",{class:"eas-imgbox"+(d.impact?"":" empty")},
      d.impact ? el("div",{style:"padding:6px;height:100%",html:svgImpactPrint(d.impact)}) : "not marked")));
  sr.append(el("div",{},
    el("h4",{text:"13 · Sketch of the accident"}),
    el("div",{class:"eas-imgbox"+(d.sketch?"":" empty")},
      d.sketch ? el("img",{src:d.sketch,alt:"Accident sketch"}) : "not drawn")));
  doc.append(sr);

  // witnesses / authority strip
  doc.append(el("div",{style:"border-top:1px solid #b9c6d6;padding:10px 14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;font-size:10px"},
    el("div",{}, el("div",{style:"font-size:8.5px;letter-spacing:.07em;text-transform:uppercase;color:#64786f;font-weight:700"},"5 · Witnesses"),
      el("div",{style:"margin-top:3px"}, d.witnessName||d.witnessPhone ? (d.witnessName||"—")+" · "+(d.witnessPhone||"—") : el("i",{style:"color:#546b62"},"none recorded"))),
    el("div",{}, el("div",{style:"font-size:8.5px;letter-spacing:.07em;text-transform:uppercase;color:#64786f;font-weight:700"},"Police / authority"),
      el("div",{style:"margin-top:3px"}, d.policeAttended===true ? ("attended · "+(d.policeRef||"reference pending")) : d.policeAttended===false ? "did not attend" : el("i",{style:"color:#546b62"},"not asked"))),
    el("div",{}, el("div",{style:"font-size:8.5px;letter-spacing:.07em;text-transform:uppercase;color:#64786f;font-weight:700"},"Injuries"),
      el("div",{style:"margin-top:3px"}, d.injured===true ? ("yes · band: "+(d.injurySeverity||"—")+" · emergency services "+(d.injuryEmergency?"attended":"not attended")) : d.injured===false ? "none reported" : el("i",{style:"color:#546b62"},"—")),
      d.injured===true ? el("div",{style:"margin-top:3px;font-size:8.5px;color:#7a8590;font-style:italic"},"Injury description deliberately not collected — GDPR Art. 9. To be gathered by the adjuster under a proper basis.") : null)
  ));

  // signatures
  const sig=el("div",{class:"eas-sigrow"});
  sig.append(el("div",{},
    el("h4",{style:"margin:0 0 7px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#2b6fd4"},"15 · Signature of driver A"),
    el("div",{class:"eas-sig-line"}, d.sigA? el("img",{src:d.sigA,alt:"Signature A"}) : ""),
    el("div",{style:"margin-top:4px;font-size:9px;color:#7d8f9c",text:t.driver})));
  sig.append(el("div",{},
    el("h4",{style:"margin:0 0 7px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#96700a"},"15 · Signature of driver B"),
    el("div",{class:"eas-sig-line"}, d.sigB? el("img",{src:d.sigB,alt:"Signature B"}) : ""),
    el("div",{style:"margin-top:4px;font-size:9px;color:#7d8f9c", text: d.otherDriver||(d.sigB?"signed":"not signed")})));
  doc.append(sig);

  // the no-liability statement — the legally load-bearing part
  doc.append(el("div",{class:"eas-nofault"},
    el("span",{style:"font-size:13px;line-height:1"},"⚖"),
    el("div",{},
      el("b",{},"This document records agreed facts. It is not an admission of liability by either party. "),
      "No field in the capturing application asks, or has ever asked, who was at fault. Liability is determined by the insurers on the facts recorded above, and neither driver's signature here concedes anything.")
  ));
  wrap.append(doc);

  /* ---- (b) incident.json + ACORD mapping ---- */
  wrap.append(el("div",{class:"sp28 noprint"}));
  const mapWrap=el("div",{class:"map-wrap noprint"});
  mapWrap.append(el("div",{},
    el("div",{class:"sect-h"},el("h3",{text:"incident.json"}),
      el("span",{class:"sect-note",text:"our canonical schema"})),
    el("pre",{class:"json",html:jsonHighlight(buildIncidentJson())})
  ));
  const mapCol=el("div",{});
  mapCol.append(el("div",{class:"sect-h"},el("h3",{text:"ACORD mapping"}),
    el("span",{class:"sect-note",text:"the carrier-exchange target, made explicit"})));
  const mt2=el("table",{class:"map"});
  mt2.append(el("thead",{},el("tr",{},el("th",{text:"our field"}),el("th",{text:"ACORD"}),el("th",{text:"meaning"}))));
  const mtb=el("tbody",{});
  ACORD_MAP.forEach(r=>mtb.append(el("tr",{},
    el("td",{class:"f",text:r.f}), el("td",{class:"a",text:r.a}), el("td",{class:"e",text:r.e}))));
  mt2.append(mtb);
  mapCol.append(el("div",{class:"tbl-wrap"},mt2));
  mapCol.append(el("div",{class:"sp16"}));
  mapCol.append(dn("Why the mapping column is on the screen and not in a spreadsheet",
    "The point of the EAS export is that <b>nobody transcribes anything</b>, and transcription at the liability stage is exactly where money leaks — a mistyped plate or a dropped circumstance number becomes a contested split three months later. Two fields have <b>no ACORD equivalent</b> and I have said so rather than forcing them: the EAS circumstance array and the point of impact travel as a structured extension, because European handlers read them natively and inventing a lossy ACORD mapping for them would be worse than carrying them cleanly."));
  mapWrap.append(mapCol);
  wrap.append(mapWrap);

  return el("div",{class:"deskframe"},
    el("div",{class:"desk-bar noprint"},
      el("div",{class:"dots"},el("i"),el("i"),el("i")),
      el("span",{class:"desk-title",text:"Export · EAS-equivalent + incident.json"})),
    el("div",{class:"desk-body"}, wrap));
}

export function easField(k,v){
  return el("div",{class:"eas-f"},
    el("div",{class:"fl",text:k}),
    el("div",{class:"fv"+(v?"":" empty"),text:v||"not captured"}));
}

/* print-friendly (light) impact marker */
export function svgImpactPrint(sel){
  const pts={front_left:[52,26],front:[82,20],front_right:[112,26],side_left:[40,74],side_right:[124,74],
    rear_left:[52,126],rear:[82,134],rear_right:[112,126],roof:[82,74]};
  const p=pts[sel]||[82,74];
  return `<svg viewBox="0 0 164 156" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <path d="M56 12 q0 -6 6 -6 h40 q6 0 6 6 v24 h-52 z" fill="#fff" stroke="#ffffff" stroke-width="1.4"/>
    <rect x="50" y="38" width="64" height="102" rx="5" fill="#fff" stroke="#ffffff" stroke-width="1.4"/>
    <path d="M50 62 h64 M50 90 h64 M50 116 h64" stroke="#465a53" stroke-width="1"/>
    <rect x="42" y="44" width="9" height="17" rx="3" fill="#ffffff"/><rect x="113" y="44" width="9" height="17" rx="3" fill="#ffffff"/>
    <rect x="42" y="106" width="9" height="17" rx="3" fill="#ffffff"/><rect x="113" y="106" width="9" height="17" rx="3" fill="#ffffff"/>
    <path d="M${p[0]-9} ${p[1]-9} L${p[0]+9} ${p[1]+9} M${p[0]+9} ${p[1]-9} L${p[0]-9} ${p[1]+9}" stroke="#b8341c" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${p[0]}" cy="${p[1]}" r="14" fill="none" stroke="#b8341c" stroke-width="1.6"/>
  </svg>`;
}


