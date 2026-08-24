import { FakeApi } from './FakeApi.js';
import { SCENARIOS } from '../data/domain.js';
import { Store, freshDraft, logAdd } from './store.js';
import { el } from './dom.jsx';
import { clockT, rnd, toast, uuid } from './utils.js';
import { gapItems } from '../screens/driver/GapsHub.jsx';

/* ==================================================================
   §13 ACTIONS — one delegated listener for the whole app
   ================================================================== */
export function startTimerIfNeeded(){
  if(!Store.s.startedAt){ Store.s.startedAt=Date.now(); Store.s.stoppedAt=null; }
}

export const ACTIONS = {

  /* ---- chrome ---- */
  "set-persona": v => Store.set({persona:v, exportOpen:false}),
  "go-system":   () => Store.set({persona:"system", sysTab:"log", exportOpen:false}),
  "go-fleet":    () => Store.set({persona:"fleet", fleetTab:"list", exportOpen:false}),
  "set-scenario": v => {
    Store.set({scenario:v, draft:freshDraft(v), screen:"s0", subScreen:null,
      incident:null, reference:null, startedAt:null, stoppedAt:null, detailOpen:false, exportOpen:false});
    toast(SCENARIOS[v].label+" loaded · "+SCENARIOS[v].fieldCount+" fields, 6 of them blocking","",3000);
  },
  "set-lang": v => { Store.set({lang:v}); },
  "set-lang-sel": (v,el2) => { Store.set({lang:(el2&&el2.value)||v}); },
  "eas-lang": v => Store.set({easLangCol:v}),
  "toggle-notes": () => {
    Store.set({notes:!Store.s.notes});
    toast(Store.s.notes ? "Design notes on — the reasoning is now inline on every screen"
                        : "Design notes off","",2600);
  },
  "reset": () => { if(window.confirm("Reset the whole demo? Clears incidents, log, queue and draft.")) { Store.reset(true); toast("Reset.","ok"); } },

  /* ---- failure theatre ---- */
  "fail-tpa": async () => {
    const on=!Store.s.fail.tpa;
    Store.s.fail.tpa=on; Store.save(); Store.emit();
    if(on){
      toast("The TPA is down. Watch the driver's screen change by exactly nothing.","warn",4200);
      logAdd({m:"SYS",p:"TPA health check",s:"502",s5:true,ms:rnd(2000,3000),
        meta:"upstream marked unavailable — all forwards will queue. <em>No driver-facing effect.</em>"});
      // any incident already registered stays registered; pending ones queue
      Object.values(FakeApi._raw.incidents).forEach(inc=>{
        if(inc.tpa_state!=="registered") FakeApi.forwardToTpa(inc,0);
      });
    }else{
      toast("The TPA is back up — draining the queue.","ok",3200);
      logAdd({m:"SYS",p:"TPA health check",s:"200",ms:rnd(120,300),meta:"upstream recovered"});
      await FakeApi.drain();
    }
  },
  "fail-offline": async () => {
    const on=!Store.s.fail.offline;
    Store.s.fail.offline=on; Store.save(); Store.emit();
    if(on){
      toast("No signal. Keep going — nothing will be lost.","warn",4000);
      logAdd({m:"SYS",p:"connectivity",s:"offline",sq:true,ms:0,
        meta:"radio down · writes queue locally with their idempotency keys · reference generation moves client-side"});
    }else{
      toast("Signal restored — replaying the queue.","ok",3200);
      logAdd({m:"SYS",p:"connectivity",s:"online",ms:rnd(40,90),meta:"radio up · replaying outbox"});
      await FakeApi.drain();
    }
  },
  "fail-coverage": () => {
    Store.s.fail.coverage=!Store.s.fail.coverage; Store.save(); Store.emit();
    toast(Store.s.fail.coverage
      ? "Vehicle not on schedule. The driver will see no difference at all."
      : "Coverage check will pass.","warn",4000);
  },
  "triple-tap": async () => {
    startTimerIfNeeded();
    Store.set({persona:"system", sysTab:"log", exportOpen:false});
    await FakeApi.tripleTap();
  },
  "clear-log": () => { Store.s.log=[]; Store.s.hooks=[]; Store.save(); Store.emit(); },

  /* ---- driver: S0 ---- */
  "toggle-detail": () => Store.set({detailOpen:!Store.s.detailOpen}),
  "s0-fine": () => {
    startTimerIfNeeded();
    Store.patchDraft({injured:false});
    Store.set({screen:"s1"});
  },
  "s0-hurt": () => {
    startTimerIfNeeded();
    Store.patchDraft({injured:true});
    // The very next screen is 112. No data collection before it.
    Store.set({screen:"emg"});
    logAdd({m:"SYS",p:"safety route",s:"—",sq:true,ms:0,
      meta:"injury=yes → emergency screen served <em>before</em> any field collection. We never ask a claims question ahead of a safety one."});
  },
  "s0-dismiss": () => Store.set({screen:"dismiss"}),
  "back-s0": () => Store.set({screen:"s0"}),
  "nav-back": () => Store.back(),
  "dismiss-reason": v => {
    FakeApi.dismissFalsePositive(Store.s.scenario, v);
    toast("Dismissed. No claim was created.","ok",3400);
    Store.set({screen:"s0", startedAt:null, stoppedAt:null});
    setTimeout(()=>{ Store.set({persona:"system",sysTab:"log"}); },700);
  },
  "call112": () => {
    logAdd({m:"SYS",p:"tel:112",s:"—",sq:true,ms:0,meta:"emergency dialler invoked (simulated) — available on every screen, above the fold"});
    toast("Dialling 112 — simulated.","err",3000);
  },
  "emg-continue": () => Store.set({screen:"s1"}),

  /* ---- driver: Tier 1 ---- */
  /* Open a row for correction. Telematics is wrong often enough — GPS drift,
     clock skew, the wrong unit on a shared vehicle — that forcing a driver to
     confirm something they can see is wrong is worse than letting them fix it. */
  "edit-field": v => {
    // 'type' is chosen from a list rather than typed, so its editor is the
    // picker. Same entry point, different control.
    if(v==="type"){ Store.set({subScreen: Store.s.subScreen==="type"?null:"type", editing:null}); return; }
    Store.set({editing: Store.s.editing===v ? null : v, subScreen:null});
  },

  "cancel-edit": () => Store.set({editing:null}),

  "save-field": (v, node) => {
    const input = document.querySelector('[data-editfield="'+v+'"]');
    if(!input) return;
    const next = input.value.trim();
    const d = Store.s.draft;
    const key = {location:"location", time:"occurredAt", vehicle:"vehicle"}[v] || v;
    if(next && next !== d[key]){
      const from = d[key];
      Store.patchDraft({
        [key]: next,
        corrected: {...d.corrected, [key]:{from, to:next, at:new Date().toISOString()}},
        // a corrected value still needs confirming, so the driver sees their own edit
        [key==="location"?"locationConfirmed":key==="occurredAt"?"timeConfirmed":"vehicleConfirmed"]: true,
      });
      logAdd({m:"PATCH", p:"/v1/incidents/"+(Store.s.incident?.id||"draft"), s:"200", ms:rnd(30,80), key:uuid(),
        meta:"driver corrected <b>"+key+"</b>: \""+from+"\" → \""+next+"\". Original telematics value retained for the handler."});
      toast("Corrected. We kept what the truck reported too.","ok");
    }
    Store.set({editing:null});
  },

  "confirm-vehicle":  () => Store.patchDraft({vehicleConfirmed:!Store.s.draft.vehicleConfirmed}),
  "confirm-time":     () => Store.patchDraft({timeConfirmed:!Store.s.draft.timeConfirmed}),
  "confirm-location": () => Store.patchDraft({locationConfirmed:!Store.s.draft.locationConfirmed}),
  "confirm-type":     () => {
    // Confirm/unconfirm only. Changing the value goes through 'Not right?',
    // like every other pre-filled row.
    Store.patchDraft({typeConfirmed:!Store.s.draft.typeConfirmed});
    if(Store.s.subScreen==="type") Store.set({subScreen:null});
  },
  "set-type": v => { Store.patchDraft({type:v, typeConfirmed:true}); Store.set({subScreen:null}); },
  "set-injured": v => {
    const yes = v==="yes";
    Store.patchDraft({injured:yes});
    if(yes && Store.s.screen==="s1"){
      Store.set({screen:"emg"});
      logAdd({m:"SYS",p:"safety route",s:"—",sq:true,ms:0,
        meta:"injury flipped to yes mid-form → emergency screen interrupts immediately"});
    }
  },
  "set-severity":  v => Store.patchDraft({injurySeverity:v}),
  "set-emergency": v => Store.patchDraft({injuryEmergency:v==="yes"}),
  "set-drivable":  v => Store.patchDraft({drivable:v==="yes"}),

  "submit-tier1": async () => {
    const s=Store.s;
    if(s.incident){ Store.set({screen:"s2"}); return; }
    Store.s.stoppedAt=Date.now();

    // The idempotency key is generated ONCE when the form opens, not per tap.
    const key = s.tripleKey || uuid();
    Store.s.tripleKey = key;

    // Client-side reference so the driver has it instantly, online or not.
    const t0=performance.now();
    const res = await FakeApi.createIncident({
      key, scenario:s.scenario, draft:s.draft, coverageFail:s.fail.coverage
    });
    const latency=Math.round(performance.now()-t0);
    const inc = res.full ? FakeApi.project(res.full) : res.incident;
    Store.set({
      incident: inc,
      reference: (res.full && res.full.reference) || (res.incident && res.incident.reference) || res.reference,
      refLatencyMs: Math.max(1,Math.min(latency, 180)),
      screen:"s2"
    });
    if(res.queued) toast("No signal — reference generated on this phone. It's already valid.","warn",4200);
  },

  /* ---- gap fill ---- */
  "go-gaps": () => Store.set({screen:"gaps"}),
  "goto": v => Store.set({screen:v, subScreen:null}),
  "finish-now": async () => {
    if(Store.s.incident) await FakeApi.submitIncident(Store.s.incident.id);
    Store.set({screen:"done"});
  },
  "gap-next": async id => {
    await pushDraft("captured: "+id);
    nextGap(id);
  },
  "gap-skip": id => {
    const sk=Store.s.draft.skipped.slice();
    if(!sk.includes(id)) sk.push(id);
    Store.patchDraft({skipped:sk});
    logAdd({m:"PATCH",p:"/v1/incidents/"+(Store.s.incident?Store.s.incident.id:"draft"),s:"200",ms:rnd(40,90),key:uuid(),
      meta:"<em>skipped_deliberately</em> += "+id+" · one tap, no confirmation, no shaming. A skipped item is a <em>known</em> gap, and it goes on the chase list."});
    if(Store.s.incident) FakeApi.patchIncident(Store.s.incident.id,{skipped:sk},"skip "+id);
    nextGap(id);
  },

  "toggle-otherdetail": () => Store.set({subScreen: Store.s.subScreen==="otherdetail"?null:"otherdetail"}),
  "set-witness": v => Store.patchDraft({witnessPresent:v==="yes"}),
  "set-police":  v => Store.patchDraft({policeAttended:v==="yes"}),
  "set-cargo":   v => Store.patchDraft({cargoLaden:v==="yes"}),
  "set-hazard":  v => Store.patchDraft({hazardous:v==="yes"}),

  "shoot": async v => {
    const d=Store.s.draft;
    const photos=Object.assign({},d.photos);
    photos[v]={at:clockT(), skipped:false};
    Store.patchDraft({photos});
    const slot=document.querySelector('[data-act="shoot"][data-v="'+v+'"]');
    if(slot){ slot.classList.add("flashing"); setTimeout(()=>slot.classList.remove("flashing"),460); }
    if(Store.s.incident) await FakeApi.postAttachment(Store.s.incident.id, v);
  },
  "skip-remaining-photos": () => {
    const d=Store.s.draft, sc=SCENARIOS[Store.s.scenario];
    const photos=Object.assign({},d.photos);
    (sc.photos||[]).forEach(k=>{ if(!photos[k]) photos[k]={at:clockT(), skipped:true}; });
    Store.patchDraft({photos});
    toast("Skipped — logged as known gaps, not silent ones.","",2800);
  },

  "eas-tick": (v,elm) => {
    const col=elm.getAttribute("data-col"), n=parseInt(elm.getAttribute("data-n"),10);
    const key = col==="A" ? "easA" : "easB";
    const arr = Store.s.draft[key].slice();
    const i=arr.indexOf(n);
    if(i>=0) arr.splice(i,1); else arr.push(n);
    Store.patchDraft({[key]:arr});
  },
  "impact": v => Store.patchDraft({impact: Store.s.draft.impact===v ? null : v}),
  "sketch-clear": () => { Store.s.draft.sketch=null; Store.save(); const c=document.getElementById("sketchCanvas"); if(c) c.dataset.wired=""; Store.emit(); },
  "sig-clear": v => { Store.s.draft["sig"+v]=null; Store.save(); const c=document.getElementById("sig"+v); if(c) c.dataset.wired=""; Store.emit(); },

  "voice": v => toast("Voice input is a visual affordance in this demo — speech recognition needs a network service and this file makes no requests.","",4200),

  "copy-ref": () => {
    const r=Store.s.reference||"";
    const done=()=>toast("Copied "+r,"ok");
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(r).then(done).catch(fallback); }
    else fallback();
    function fallback(){
      const ta=el("textarea",{style:"position:fixed;opacity:0"}); ta.value=r;
      document.body.append(ta); ta.select();
      try{ document.execCommand("copy"); done(); }catch(e){ toast("Copy blocked by the browser — "+r,"warn",4000); }
      ta.remove();
    }
  },

  /* ---- fleet ---- */
  "fleet-tab": v => Store.set({fleetTab:v}),
  "sys-tab":   v => Store.set({sysTab:v}),
  "sim-dupes": () => {
    FakeApi.simulateDuplicates();
    toast("Three intake events · matcher run on (vehicle, ±15 min, 500 m)","",3600);
  },
  "resolve-merge": () => { FakeApi.resolveMerge(); toast("Merged 3 → 1. €25,000 of phantom reserve released.","ok",3600); },
  "req-refresh": async v => { await FakeApi.getRequirements(v); toast("GET /requirements — see the System pane","",2600); },
  "send-chase": v => {
    const row=Store.s.incidents.find(x=>x.id===v);
    const items=row&&row.completeness? row.completeness.required_next:[];
    logAdd({m:"POST",p:"/v1/notifications",s:"202",ms:rnd(50,120),key:uuid(),
      meta:"chase message to driver · items ["+items.join(", ")+"] · deep-link resumes the flow with progress intact",
      body:JSON.stringify({channel:"sms+push", incident:v, resume_deeplink:"fnol://fnol/"+v, items},null,1)});
    toast("Chase message queued — deep-link resumes exactly where they stopped.","ok",3400);
  },

  /* ---- export ---- */
  "open-export": v => Store.set({exportOpen:true}),
  "close-export": () => Store.set({exportOpen:false}),
  "print": () => window.print(),
};

/* move to the next perishable item, or the soft stop */
export function nextGap(currentId){
  const items=gapItems();
  const idx=items.findIndex(x=>x.id===currentId);
  const rest=items.slice(idx+1).filter(x=>!x.done && !x.skipped);
  if(rest.length) Store.set({screen:rest[0].screen, subScreen:null});
  else ACTIONS["finish-now"]();
}

export async function pushDraft(label){
  if(!Store.s.incident) return;
  const d=Store.s.draft;
  await FakeApi.patchIncident(Store.s.incident.id, JSON.parse(JSON.stringify(d)), label);
  const inc=FakeApi._raw.incidents[Store.s.incident.id];
  if(inc) Store.set({incident:FakeApi.project(inc)});
}

/* one delegated click listener */
document.addEventListener("click", e=>{
  const node = e.target.closest("[data-act]");
  if(!node) return;
  if(node.tagName==="SELECT") return;   // native control — let it open; 'change' handles it
  const act = node.getAttribute("data-act");
  const v   = node.getAttribute("data-v");
  const fn  = ACTIONS[act];
  if(!fn) return;
  e.preventDefault();
  try{ fn(v, node); }catch(err){ console.error(act,err); toast("Something broke — see the console.","err"); }
});

/* native selects (language) — 'change', because click is preventDefaulted above */
document.addEventListener("change", e=>{
  const node = e.target.closest && e.target.closest("select[data-act]");
  if(!node) return;
  const fn = ACTIONS[node.getAttribute("data-act")];
  if(!fn) return;
  try{ fn(node.value, node); }catch(err){ console.error(err); }
});

/* free-text fields — persist on EVERY keystroke. Nothing is ever lost. */
document.addEventListener("input", e=>{
  const f=e.target.getAttribute && e.target.getAttribute("data-field");
  if(!f) return;
  let val=e.target.value;
  if(f==="otherPlate") val=val.toUpperCase();
  Store.s.draft[f]=val;
  Store.s.lastSaved=Date.now();
  Store.save();
  // no full re-render on keystroke: it would steal focus and the caret.
  const chip=document.querySelector(".step-meta .chip.ok");
  if(!chip){ /* nothing to update */ }
});


