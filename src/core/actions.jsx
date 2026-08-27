import { FakeApi } from './FakeApi.js';
import { SCENARIOS } from '../data/domain.js';
import { Store, freshDraft, logAdd } from './store.js';
import { el } from './dom.jsx';
import { clockT, rnd, toast, uuid } from './utils.js';
import { gapItems } from '../screens/driver/GapShell.jsx';
import { chatTurns } from '../screens/driver/Chat.jsx';

/* ==================================================================
   §13 ACTIONS — one delegated listener for the whole app
   ================================================================== */
export function startTimerIfNeeded(){
  if(!Store.s.startedAt){ Store.s.startedAt=Date.now(); Store.s.stoppedAt=null; }
}

/* ---- photo capture ----------------------------------------------------
   A phone camera returns 3–6 MB. That is fine to forward and fatal to keep:
   localStorage holds ~5 MB for the whole app, and Store.save() serialises the
   entire draft on every keystroke. So the image is downscaled to a thumbnail
   for the driver's own record, and Store.save strips even that before writing
   (see the photos handling in store.js). The full-size file is never held —
   FakeApi takes its size and forwards it, exactly as the real contract does.
   All of it is FileReader and canvas: no network, no worker, no library. */
const THUMB_MAX = 640;

function thumbnail(file){
  return new Promise(resolve => {
    const fr=new FileReader();
    fr.onerror=()=>resolve(null);
    fr.onload=()=>{
      const img=new Image();
      img.onerror=()=>resolve(null);
      img.onload=()=>{
        try{
          const scale=Math.min(1, THUMB_MAX/Math.max(img.width||1, img.height||1));
          const w=Math.max(1, Math.round((img.width||1)*scale));
          const h=Math.max(1, Math.round((img.height||1)*scale));
          const c=document.createElement("canvas");
          c.width=w; c.height=h;
          c.getContext("2d").drawImage(img,0,0,w,h);
          resolve({url:c.toDataURL("image/jpeg",0.72), w, h});
        }catch(e){ resolve(null); }   // tainted or oversized canvas — metadata still stands
      };
      img.src=fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* A slot holds the FIRST shot at the top level and any further shots in
   `extra`. Damage rarely fits one frame — a wing, a step and a windscreen are
   three pictures of one category — but the named slot is still what an adjuster
   reads, so extras hang off the name rather than becoming an unnamed pile.
   The flat shape is kept for the first shot because six other readers already
   dereference photos[k].thumb / .at, and a slot with one picture is the common
   case. `mode` is "replace" (retake), "add" (another of the same), or falsy
   for the first shot. */
export async function capturePhoto(slot, file, mode){
  const kb=Math.max(1, Math.round(file.size/1024));
  const thumb=await thumbnail(file);
  const photos=Object.assign({}, Store.s.draft.photos);
  const prev=photos[slot];
  const shot={at:clockT(), kb, name:file.name||"", thumb};

  if(mode==="add" && prev && !prev.skipped){
    photos[slot]=Object.assign({}, prev, {extra:(prev.extra||[]).concat([shot])});
  }else{
    // Retaking replaces the lead image and keeps the extras: the driver is
    // correcting one frame, not discarding the set.
    photos[slot]=Object.assign({skipped:false, extra:(prev&&prev.extra)||[]}, shot);
  }

  Store.patchDraft({photos});
  const elm=document.querySelector('[data-act="shoot"][data-v="'+slot+'"]');
  if(elm){ elm.classList.add("flashing"); setTimeout(()=>elm.classList.remove("flashing"),460); }
  if(Store.s.incident) await FakeApi.postAttachment(Store.s.incident.id, slot, kb);
}

/* One file input, built on demand and thrown away. Kept out of the JSX because
   a hidden input per slot is five inputs the render path has to keep in sync
   with the store, and the click has to originate from the user's gesture. */
function pickImages(slot, mode){
  const inp=document.createElement("input");
  inp.type="file"; inp.accept="image/*"; inp.setAttribute("capture","environment");
  if(mode==="add") inp.multiple=true;
  inp.style.display="none";
  inp.addEventListener("change", async () => {
    const files=Array.from(inp.files||[]);
    if(inp.parentNode) inp.parentNode.removeChild(inp);
    // Sequential, not Promise.all: each capture reads the store, and parallel
    // writes would drop all but the last.
    for(let i=0;i<files.length;i++){
      await capturePhoto(slot, files[i], i===0 ? mode : "add");
    }
  });
  document.body.appendChild(inp);
  inp.click();
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
      toast("The TPA is back up. Draining the queue.","ok",3200);
      logAdd({m:"SYS",p:"TPA health check",s:"200",ms:rnd(120,300),meta:"upstream recovered"});
      await FakeApi.drain();
    }
  },
  "fail-offline": async () => {
    const on=!Store.s.fail.offline;
    Store.s.fail.offline=on; Store.save(); Store.emit();
    if(on){
      toast("No signal. Keep going, nothing will be lost.","warn",4000);
      logAdd({m:"SYS",p:"connectivity",s:"offline",sq:true,ms:0,
        meta:"radio down · writes queue locally with their idempotency keys · reference generation moves client-side"});
    }else{
      toast("Signal restored. Replaying the queue.","ok",3200);
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
    /* The cold open asks about PEOPLE, not about the claim. It routes to 112 or
       it does not; it does not fill in question 5. Writing injured:false here
       carried a pre-selected answer onto the six questions and opened the
       screen at "5 still to check" — the same defect the counter was written to
       avoid, arriving from a different direction. The driver answers it on the
       screen that asks it. */
    Store.set({screen:intakeScreen()});
  },
  "s0-hurt": () => {
    startTimerIfNeeded();
    /* Deliberately records nothing. "Someone is hurt" here is a routing signal
       to reach 112 — it is not the claim field, and the driver has not been
       shown question 5 yet. Pre-filling it from a safety answer means the six
       questions open with an answer the driver never gave on that screen. */
    // The very next screen is 112. No data collection before it.
    Store.set({screen:"emg", emgFrom:"s0"});
    logAdd({m:"SYS",p:"safety route",s:"—",sq:true,ms:0,
      meta:"injury=yes → emergency screen served <em>before</em> any field collection. We never ask a claims question ahead of a safety one."});
  },
  "s0-dismiss": () => Store.set({screen:"dismiss"}),
  "back-s0": () => Store.set({screen:"s0"}),
  /* Back from 112 is a mistap correction, not just navigation: it clears the
     injury flag. Worth a log line, because a viewer watching the System pane
     should see that the flag went back down rather than silently persisting. */
  "nav-back": () => {
    const leavingSafety = Store.s.screen === "emg";
    Store.back();
    if(leavingSafety){
      logAdd({m:"SYS",p:"safety route",s:"—",sq:true,ms:0,
        meta:"driver went back from the emergency screen — injury flag cleared. Nothing entered was lost."});
    }
  },
  "dismiss-reason": v => {
    FakeApi.dismissFalsePositive(Store.s.scenario, v);
    toast("Dismissed. No claim was created.","ok",3400);
    Store.set({screen:"s0", startedAt:null, stoppedAt:null});
    setTimeout(()=>{ Store.set({persona:"system",sysTab:"log"}); },700);
  },
  "call112": () => {
    logAdd({m:"SYS",p:"tel:112",s:"—",sq:true,ms:0,meta:"emergency dialler invoked (simulated) — available on every screen, above the fold"});
    toast("Dialling 112, simulated.","err",3000);
  },
  /* Back to wherever the driver was heading. Coming from the cold open that is
     the mode choice; coming from the chat's own injury turn it is the chat,
     which then asks who is hurt. The safety screen never decides the path. */
  "emg-continue": () => Store.set({screen: Store.s.emgFrom==="s1chat" ? "s1chat" : intakeScreen(),
    emgFrom:null}),

  /* ---- driver: which way through the six ---- */
  /* A presentation preference, not a claims field. Nothing downstream reads it
     and no value it produces differs — see the note on the choice screen. */
  "set-intake-mode": v => {
    const mode = v==="chat" ? "chat" : "form";
    startTimerIfNeeded();
    Store.patchDraft({intakeMode:mode});
    const patch = {screen: mode==="chat" ? "s1chat" : "s1", editing:null, subScreen:null};
    /* Switching INTO the chat has to land on the first thing still unanswered.
       A driver who filled three rows on the form and then asked for Roady is
       not asking to be walked back through the three they already did — the
       transcript shows those as settled and the open turn is the next real
       question. Without this the turn index is whatever it was (0 on a first
       switch), which reads as the app having thrown their answers away. */
    if(mode==="chat"){
      const turns = chatTurns();
      let i = turns.findIndex(t => !t.answered);
      if(i < 0) i = Math.max(0, turns.length-1);
      patch.chatTurn = i;
      patch.chatSeen = Math.max(Store.s.chatSeen, i);
    }
    Store.set(patch);
  },

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
    const d = Store.s.draft;
    const EDIT_KEYS = {location:"location", time:"occurredAt", vehicle:"vehicle", date:"occurredOn"};
    const CONFIRMS  = {location:"locationConfirmed", occurredAt:"timeConfirmed",
                       occurredOn:"timeConfirmed", vehicle:"vehicleConfirmed"};
    /* A row may carry two inputs that belong to one fact — date and time are
       the case. Both are read and both are recorded, because a driver
       correcting one and leaving the other is the ordinary use: an incident
       found at 00:20 keeps its time and moves back a day. */
    const fields = v==="time" ? ["time","date"] : [v];

    const patch = {};
    const corrected = {...d.corrected};
    const changed = [];

    for(const f of fields){
      const input = document.querySelector('[data-editfield="'+f+'"]');
      if(!input) continue;
      const next = input.value.trim();
      const key = EDIT_KEYS[f] || f;
      if(!next || next === d[key]) continue;
      patch[key] = next;
      corrected[key] = {from:d[key], to:next, at:new Date().toISOString()};
      if(CONFIRMS[key]) patch[CONFIRMS[key]] = true;   // their own edit still shows as confirmed
      changed.push({key, from:d[key], to:next});
    }

    if(changed.length){
      Store.patchDraft({...patch, corrected});
      logAdd({m:"PATCH", p:"/v1/incidents/"+(Store.s.incident?.id||"draft"), s:"200", ms:rnd(30,80), key:uuid(),
        meta:"driver corrected "+changed.map(c =>
          "<b>"+c.key+"</b>: \""+c.from+"\" → \""+c.to+"\"").join(", ")
          +". Original telematics value retained for the handler."});
      toast("Corrected. We kept what the truck reported too.","ok");
    }
    Store.set({editing:null});
    // A correction settles the turn as surely as a confirmation does.
    chatAdvance({location:"location", time:"time", vehicle:"vehicle"}[v] || v);
  },

  /* Tapping a row toggles it, so a mistap is correctable. In the chat the same
     tap is an answer, and answering moves on — but only when it confirmed:
     un-confirming and then advancing would leave the turn behind unanswered. */
  /* Confirming a pre-filled value.
     On the FORM the control is the row itself, and tapping it toggles: the row
     is the state, so tapping a confirmed row is how a mistap is undone.
     In the CHAT the control is a button labelled "Confirm", and a button that
     un-answers the question it claims to settle is a bug — reopening an
     answered turn and tapping Confirm took a finished report back to "1 still
     to check" and removed the submit control. Same handler, and the gesture
     follows the screen it is on. */
  "confirm-vehicle":  () => confirmField("vehicleConfirmed", "vehicle"),
  "confirm-time":     () => confirmField("timeConfirmed", "time"),
  "confirm-location": () => confirmField("locationConfirmed", "location"),
  "confirm-type":     () => {
    if(Store.s.subScreen==="type") Store.set({subScreen:null});
    confirmField("typeConfirmed", "type");
  },
  /* Close the type picker and settle the answer.
     Not `confirm-type`, which TOGGLES: reusing it here would un-confirm the
     type whenever the driver opened the picker, changed nothing, and tapped
     Done — closing the editor and silently undoing the answer in one gesture.
     Done always means confirmed. */
  "type-done": () => {
    Store.patchDraft({typeConfirmed:true});
    Store.set({subScreen:null, editing:null});
    chatAdvance("type");
  },
  "set-type": (v, node) => {
    const next = node?.value || v;
    Store.patchDraft({type:next, typeConfirmed:true});
    // The picker stays open — the driver may still want to add damage to it.
  },
  /* Additional damage is a repeatable list rather than a fixed set of chips:
     a collision can break glass AND shift a load AND start a fire, and we do
     not know in advance how many lines that takes. */
  "add-also": () => {
    Store.patchDraft({alsoDamaged: [...(Store.s.draft.alsoDamaged || []), ""]});
  },
  "set-also": (v, node) => {
    const i = Number(node?.getAttribute("data-v"));
    const list = [...(Store.s.draft.alsoDamaged || [])];
    if(Number.isNaN(i) || !list.length) return;
    list[i] = node.value;
    Store.patchDraft({alsoDamaged: list});
  },
  "remove-also": v => {
    const i = Number(v);
    const list = (Store.s.draft.alsoDamaged || []).filter((_, idx) => idx !== i);
    Store.patchDraft({alsoDamaged: list});
  },
  /* The counter is the only thing telling a driver they are not finished, and
     it sits in the dock while the unanswered field is somewhere up the scroll.
     Naming a count without saying where is a small cruelty on a hard shoulder,
     so tapping it goes and finds the first one. It is a lookup, not a wizard:
     the driver keeps the freedom to answer in any order. */
  "goto-unanswered": () => {
    const d = Store.s.draft;
    /* The injury question is answered in up to three taps, so the seek has to
       land on the part that is actually missing. Sending a driver back to
       "is anyone hurt?" when they have already said yes reads as the app
       having lost their answer. */
    const noParty = d.injured===true && !(d.injuredParties||[]).length;
    const noBand  = d.injured===true && !(d.injurySeverity||[]).length;
    const first = [
      [!d.vehicleConfirmed,  'confirm-vehicle'],
      [!d.timeConfirmed,     'confirm-time'],
      [!d.locationConfirmed, 'confirm-location'],
      [!d.typeConfirmed,     'confirm-type'],
      [d.injured===null,     'set-injured'],
      [noParty,              'toggle-injured-party'],
      [noBand,               'toggle-severity'],
      [d.drivable===null,    'set-drivable'],
    ].find(([outstanding]) => outstanding);
    if(!first) return;

    const node = document.querySelector('#root [data-act="'+first[1]+'"]');
    if(!node) return;
    // Centred rather than top-aligned: the question above it is the label, and
    // scrolling the answer to the very top hides what it is asking. Guarded
    // because a DOM without a layout engine has no scrollIntoView, and the
    // flash below is still worth doing when the scroll cannot happen.
    if(typeof node.scrollIntoView === "function"){
      node.scrollIntoView({behavior:"smooth", block:"center"});
    }
    // A pulse, because a silent scroll on a small screen is easy to miss.
    const target = node.closest('.frow-wrap') || node.closest('.dn-anchor') || node;
    target.classList.remove('seek-flash');
    void target.offsetWidth;              // restart the animation if it is mid-run
    target.classList.add('seek-flash');
    setTimeout(()=>target.classList.remove('seek-flash'), 1400);
  },

  "set-injured": v => {
    const yes = v==="yes";
    /* No 112 interrupt here. The driver reached this screen by answering the
       cold open's safety question, so they have already been shown the
       emergency screen and have already decided whether to call. Serving it
       again treats a claims field as if it were news, and the 112 rail is on
       this screen too — one tap away, where it always is. */
    /* Answering "no one" clears the detail. A driver who taps yes, names a
       party, then corrects to no one would otherwise ship a report saying
       nobody was hurt with an injured party attached — and the detail is
       hidden at that point, so they could not see it to remove it. */
    Store.patchDraft(yes
      ? {injured:true}
      : {injured:false, injuredParties:[], injurySeverity:[], injuryEmergency:null});
    /* The chat behaves exactly as the form does, and for the same reason.
       An earlier build interrupted to 112 here, on the argument that a driver
       could reach the chat having said everyone was fine and only then find
       otherwise. But both paths reach the six the SAME way — through the cold
       open's safety question — so the chat inherits the same guarantee the
       form relies on, and the interrupt was redundant with a screen the driver
       had already been shown. It also cost them the answer they were giving:
       "yes" is the start of naming who and how badly, and being thrown to a
       safety screen mid-thought is a worse outcome than the rail already
       one tap above. Two paths through one question must not behave
       differently. */
    if(Store.s.screen==="s1chat") chatAdvance("injured");
  },
  /* Multi-select: a group of casualties is rarely one band, and collapsing
     them to one sets the reserve from the wrong person. */
  "toggle-severity": v => {
    const cur = Store.s.draft.injurySeverity || [];
    Store.patchDraft({injurySeverity: cur.includes(v) ? cur.filter(x=>x!==v) : [...cur, v]});
  },
  /* Which party, not who. More than one can be true — an injured driver and an
     injured third party is one of the commonest shapes a motor claim takes,
     and they route to different places. */
  "toggle-injured-party": v => {
    const cur = Store.s.draft.injuredParties || [];
    Store.patchDraft({injuredParties: cur.includes(v) ? cur.filter(x=>x!==v) : [...cur, v]});
  },
  "set-emergency": v => { Store.patchDraft({injuryEmergency:v==="yes"}); chatAdvance("emergency"); },
  "set-drivable":  v => { Store.patchDraft({drivable:v==="yes"}); chatAdvance("drivable"); },

  /* ---- driver: chat path ----
     No handler of its own for answering: every turn uses the form's handler,
     and those call chatAdvance() when the chat is the open screen. A parallel
     set of chat-only writers is how the two paths would start to diverge. */

  /* Reopening an answered turn. The turns after it stay visible — chatSeen is
     untouched — because the driver is correcting one answer, not rewinding the
     report. Correcting a value they can see is wrong is the same gesture here
     as tapping a pre-filled row on the form. */
  "chat-reopen": v => {
    const i = Number(v);
    if(Number.isNaN(i) || i<0) return;
    Store.set({chatTurn:i, editing:null, subScreen:null});
  },

  /* The dock counter, pointed at the first unanswered turn. Same intent as the
     form's goto-unanswered: naming a count without saying where it lives is a
     small cruelty on a hard shoulder. Here "where" is a turn, not a scroll
     position, so it opens that turn rather than scrolling to it. */
  /* The explicit continue on a multi-select turn, where a tap cannot advance. */
  "chat-advance": v => chatAdvance(v),

  "chat-seek": () => {
    const turns = chatTurns();
    const i = turns.findIndex(t => !t.answered);
    if(i<0) return;
    Store.set({chatTurn:i, chatSeen:Math.max(Store.s.chatSeen, i), editing:null, subScreen:null});
  },
  /* "Not sure" is recorded as not-insured rather than as unanswered: an
     uninsured other party routes to the national guarantee fund, and a handler
     needs to know the driver looked and could not tell. */
  "set-other-insured": v => Store.patchDraft({otherInsured:v==="yes"}),

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
    if(res.queued) toast("No signal. Your reference was generated on this phone and is already valid.","warn",4200);
  },

  /* ---- gap fill ---- */
  // The hub's job is to show the perishability ORDER — witness before plate
  // before photographs, each with its half-life. With one item outstanding
  // there is no order to show, and the driver taps twice to reach the only
  // thing on it. Glass is the case that exposed this: two items, one of them
  // already answered, and the hub renders as a waypoint carrying nothing.
  // Two or more outstanding and the list IS the argument, so it stays.
  // Straight to the first outstanding item, in perishability order. There was
  // a hub screen listing them all; it was removed. A menu of the screens that
  // follow it costs the driver a tap and tells them nothing they act on — the
  // ordering still governs what comes next, and nextGap() walks the same list.
  // With nothing outstanding, the flow is already finished.
  "go-gaps": () => {
    const open = gapItems().filter(x => !x.done && !x.skipped);
    if(!open.length) return ACTIONS["finish-now"]();
    Store.set({screen: open[0].screen});
  },
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

  // Opens the real camera. capture="environment" sends a phone straight to the
  // rear lens; the same input on a laptop is a file picker, which is what a
  // fleet manager reviewing the demo needs. Deliberately not getUserMedia:
  // that wants a permission prompt and a live preview surface, and it is
  // refused outright on a file:// page — which is how this artifact is opened.
  "shoot": v => pickImages(v, "replace"),
  // Another picture of the same named thing. multiple=true because a driver
  // walking round a truck takes three in a row, and three round trips through
  // the camera to add three frames is two too many.
  "add-photo": v => pickImages(v, "add"),
  // "Skip the rest" was removed. It marked the remaining slots skipped and
  // stayed on the screen, so it read as doing nothing — and the dock's
  // "Skip — I'll do this later" already leaves with the same gaps recorded.
  // Two controls for one intention, one of them silent.

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

  "copy-ref": () => {
    const r=Store.s.reference||"";
    const done=()=>toast("Copied "+r,"ok");
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(r).then(done).catch(fallback); }
    else fallback();
    function fallback(){
      const ta=el("textarea",{style:"position:fixed;opacity:0"}); ta.value=r;
      document.body.append(ta); ta.select();
      try{ document.execCommand("copy"); done(); }catch(e){ toast("Copy blocked by the browser. "+r,"warn",4000); }
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

/* Which screen the six are answered on. The driver picks once, on s0choice,
   and the choice rides on the draft so a reopened report resumes the same way.
   Unset means they have not been asked yet. */
export function intakeScreen(){
  const m = Store.s.draft.intakeMode;
  return m==="chat" ? "s1chat" : m==="form" ? "s1" : "s0choice";
}

/* Confirm one pre-filled field, and move on if the chat is asking.

   The toggle belongs to the form, where the control IS the row and tapping a
   confirmed row is the only way to take it back. In the chat the control is a
   button that says "Confirm"; there, confirming is idempotent and undoing is
   the Edit button beside it. */
function confirmField(flag, turnId){
  const inChat = Store.s.screen === "s1chat";
  Store.patchDraft({[flag]: inChat ? true : !Store.s.draft[flag]});
  if(Store.s.draft[flag]) chatAdvance(turnId);
}

/* Advance the chat by one turn, if the chat is what is on screen.
   Called from the shared answer handlers rather than from chat-only ones, so
   there is exactly one writer per field and the two paths cannot drift. A
   no-op on the form, which is why the handlers can call it unconditionally.

   Only ever moves FORWARD past turns that are answered: a driver who reopened
   question 2 and re-confirmed it should land back at the end of what they have
   already done, not be walked through it again. */
export function chatAdvance(fromId){
  if(Store.s.screen!=="s1chat") return;
  const turns = chatTurns();
  const i = turns.findIndex(t => t.id===fromId);
  if(i<0) return;
  let next = i+1;
  while(next<turns.length && turns[next].answered) next++;
  if(next>=turns.length) next = turns.length-1;
  Store.set({chatTurn:next, chatSeen:Math.max(Store.s.chatSeen, next),
    editing:null, subScreen:null});
}

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
  try{ fn(v, node); }catch(err){ console.error(act,err); toast("Something broke. See the console.","err"); }
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


