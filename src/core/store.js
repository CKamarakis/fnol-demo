import { SCENARIOS, STR, setLangSource } from '../data/domain.js';
import { clockT, rnd } from './utils.js';

/* ==================================================================
   §3 STORE — single state object, localStorage-backed, subscribe/render
   ================================================================== */
export const LS_KEY = "fnol.demo.v1";

/**
 * Screens the driver passes THROUGH rather than navigates to.
 *
 * They are never pushed onto the history and never show a Back control. The
 * 112 screen is the case that matters: it is an interstitial on the way to
 * the six questions, and a Back button above a safety instruction invites the
 * driver to leave it.
 */
export const TRANSIENT = ["emg"];

export function freshDraft(scenId){
  const sc = SCENARIOS[scenId] || SCENARIOS.collision;
  const t  = sc.telematics;
  return {
    // --- Tier 1: the only six fields that block submission ---
    vehicle:      t.vehicle,        vehicleConfirmed:false,
    vin:          t.vin || "",      // ACORD 2 VIN — from the unit, never typed
    // Time and date are separate values because the unit reports one instant
    // and the driver may correct either half. The date was previously not
    // stored at all: the screens rendered `new Date()` beside the time, so a
    // report filed after midnight, or reopened the next day, showed a date
    // nobody entered and the handler received none at all.
    occurredAt:   t.time,           timeConfirmed:false,
    occurredOn:   t.date || "",     // ACORD 2 · 21 DATE OF LOSS
    location:     t.location,       lat:t.lat, lon:t.lon, locationConfirmed:false,
    type:         t.inferred,       typeConfirmed:false,
    typeOther:    "",               // when type is "other", what it actually was
    alsoDamaged:  [],               // damage that came with the main event
    // What the vehicle originally reported. Kept whatever the driver does, so a
    // correction is a recorded disagreement rather than an overwrite — the
    // handler can see both values and who changed which.
    reported:     { vehicle:t.vehicle, occurredAt:t.time, occurredOn:t.date||"", location:t.location, type:t.inferred },
    corrected:    {},   // field -> {from, to, at}
    injured:      null,             // true | false — the one real question
    // ACORD 3 · 38. Drives the reserve and the credit-hire clock, so the fact
    // is needed — but for a theft it is settled by the incident, not by the
    // driver: a stolen vehicle is not drivable and has no inspection address.
    // Pre-answered here rather than asked, which keeps the blocking count at
    // six while removing a question nobody can answer. `drivableSource` marks
    // it so the fleet and export panes never present a derivation as testimony.
    drivable:     sc.type === "theft" ? false : null,
    drivableSource: sc.type === "theft" ? "derived" : null,
    // --- injury detail: presence + band + emergency attended. NOT description. ---
    // ACORD 2 INJURED columns: severity band, who (PED/INS VEH/OTH VEH), help there.
    injurySeverity:[], injuryEmergency:null, injuredParties:[],
    // --- perishable gap-fill ---
    witnessPresent:null, witnessName:"", witnessPhone:"",
    otherPlate:"", otherMake:"", otherDriver:"", otherPhone:"", otherInsurer:"", otherPolicy:"",
    otherInsured:null,              // ACORD 2 OTHER VEH/PROP INS? — uninsured routes differently
    // ACORD 3 · WHERE CAN VEH BE SEEN. The damage DESCRIPTION that used to sit
    // beside it is gone: see ACORD_OMITTED. Where it happened is not where it
    // will be, which is the fact this one holds and question 3 does not.
    whereSeen:"",
    photos:{}, // slot -> {at, skipped}
    easA:[], easB:[], impact:null, sketch:null, sigA:null, sigB:null,
    policeAttended:null, policeRef:"",
    cargoLaden:null, cargoDesc:"", trailer:"", hazardous:null,
    skipped:[],      // ids of things the driver chose to skip — logged, never nagged
    notes:"",
    // Which way the driver chose to answer the six: the form or the chat. A
    // presentation preference, not a claims field — it changes no value that
    // reaches the handler, and nothing downstream reads it. Kept on the draft
    // rather than in app state so a reopened report resumes the way it started.
    intakeMode:null, // "form" | "chat" | null (not yet chosen)
  };
}

/* The chat asks the six one at a time, so it needs to know which one is open.
   Turn indices are positions in the script built by chatTurns() — derived from
   the scenario, never stored — so a stale index is always possible and is
   clamped on load rather than trusted. */
export const CHAT_TURN_MAX = 40;

export const Store = {
  s:{
    persona:"driver",              // driver | fleet | system
    scenario:"collision",
    lang:"en",
    notes:true,                    // design-notes overlay — ON by default: the
                                   // callouts ARE the argument, and a first-time
                                   // viewer reading the form without them is
                                   // reading the least interesting half.
    fail:{ tpa:false, offline:false, coverage:false },
    screen:"s0",                   // driver flow position
    navStack:[],                   // where the driver came from — every step is reversible
    emgFrom:null,                  // which screen routed to 112, so a mistap returns there
    editing:null,                  // which pre-filled row is open for correction
    subScreen:null,
    chatTurn:0,                    // index of the open question in the chat path
    chatSeen:0,                    // furthest turn reached — reopening one keeps
                                   // the turns after it visible, so correcting
                                   // an early answer does not hide later ones
    draft:freshDraft("collision"),
    incident:null,                 // the server-side record once created
    reference:null,
    refLatencyMs:null,
    startedAt:null,                // 90-second timer origin
    stoppedAt:null,
    tick:0,
    log:[],                        // API call log
    hooks:[],                      // webhook events
    queue:[],                      // outbound queue (accept-then-forward)
    incidents:[],                  // fleet list
    mergeGroup:null,               // duplicate simulator result
    exportOpen:false,
    fleetTab:"list",
    sysTab:"log",
    detailOpen:false,
    lastSaved:null,
    easLangCol:"en",
  },
  subs:[],
  version:0,                     // bumped on every emit; React's snapshot
  sub(f){
    this.subs.push(f);
    return () => { this.subs = this.subs.filter(x => x !== f); };
  },
  getSnapshot(){ return this.version; },
  set(patch){
    // Every screen change records where we came from, so Back always works.
    if(patch && patch.screen && patch.screen!==this.s.screen && !patch.__noHist){
      if(patch.screen==="s0"){
        // Returning to the cold open is a fresh start; the trail resets.
        this.s.navStack=[];
      } else if(!TRANSIENT.includes(this.s.screen)){
        this.s.navStack=[...this.s.navStack, this.s.screen];
      }
      // Leaving a transient screen pushes nothing: the driver continues from
      // it rather than navigating through it, so Back must reach whatever came
      // before — 112 is passed through on the way to the six questions, and
      // Back from there belongs on the cold open, not on a safety instruction.
    }
    if(patch) delete patch.__noHist;
    Object.assign(this.s,patch); this.save(); this.emit();
  },
  back(){
    // 112 is transient: it pushed nothing, so it pops nothing. Back from it
    // returns to whichever screen routed there and clears the answer that did.
    // Cleared to UNANSWERED, not to "no one is hurt": the driver corrected a
    // mistap, which says nothing about the claim field. Question 5 asks it
    // properly, and it must arrive there with nothing pre-selected.
    if(TRANSIENT.includes(this.s.screen)){
      const from=this.s.emgFrom;
      if(!from) return;
      this.s.draft.injured=null;
      /* Nothing routes to 112 from the chat any more — the injury turn behaves
         as the form does and stays put, because both paths already passed the
         cold open's safety question. This clamp stays as a guard rather than a
         behaviour: clearing `injured` removes the three detail turns, so an
         index pointing past them would be stale. Reached only if some future
         screen routes here from the chat. */
      if(from==="s1chat" && this.s.chatTurn>4){
        this.s.chatTurn=4;
        this.s.chatSeen=4;
      }
      this.set({screen:from, emgFrom:null, __noHist:true});
      return;
    }
    const st=[...this.s.navStack];
    const prev=st.pop();
    if(prev==null) return;
    this.s.navStack=st;
    this.set({screen:prev, __noHist:true});
  },
  patchDraft(patch){
    Object.assign(this.s.draft,patch);
    this.s.lastSaved=Date.now();          // persist on every keystroke
    this.save(); this.emit();
  },
  emit(){
    this.version++;
    this.subs.forEach(f=>{ try{ f(); }catch(e){ console.error(e); } });
  },
  save(){
    try{
      const {persona,scenario,lang,notes,fail,screen,subScreen,incident,reference,
             refLatencyMs,startedAt,stoppedAt,log,hooks,queue,incidents,mergeGroup,
             fleetTab,sysTab,exportOpen,easLangCol,chatTurn,chatSeen} = this.s;
      // Photo thumbnails are data URLs — tens of KB each, and the whole app
      // gets ~5 MB of localStorage. Persist that a shot exists, never the
      // pixels: a reopened artifact shows the slot captured, and the image
      // itself belonged to the session that took it.
      const draft = Object.assign({}, this.s.draft);
      const ph = draft.photos;
      if(ph && typeof ph==="object"){
        const lean={};
        for(const k in ph){
          const v=ph[k];
          if(!v || typeof v!=="object"){ lean[k]=v; continue; }
          // Extras multiply the quota risk — five frames of one wing is five
          // data URLs — so they are stripped the same way as the lead image.
          const ex = Array.isArray(v.extra)
            ? v.extra.map(e => (e && typeof e==="object") ? Object.assign({}, e, {thumb:null}) : e)
            : v.extra;
          lean[k]=Object.assign({}, v, {thumb:null, extra:ex});
        }
        draft.photos=lean;
      }
      localStorage.setItem(LS_KEY, JSON.stringify({
        persona,scenario,lang,notes,fail,screen,subScreen,draft,incident,reference,
        refLatencyMs,startedAt,stoppedAt,
        log:log.slice(-140), hooks:hooks.slice(-80), queue, incidents, mergeGroup,
        fleetTab,sysTab,exportOpen,easLangCol,chatTurn,chatSeen
      }));
    }catch(e){ /* quota or private mode — the demo still runs from memory */ }
  },
  /* Restore, defensively.
     The artifact is emailed around and reopened for months, so the state in
     storage is routinely older than the build reading it. Object.assign copies
     every stored key over a default — including screens that no longer exist,
     nulls where objects are expected, and strings where arrays are. Each of
     those renders a blank white screen, which for a file whose whole job is to
     open on someone else's laptop is the worst failure available.
     So: merge, then check every value the render path dereferences. Anything
     unrecognised falls back to its default rather than reaching a component. */
  load(){
    let d=null;
    try{
      const raw=localStorage.getItem(LS_KEY); if(!raw) return;
      d=JSON.parse(raw);
    }catch(e){ return; }          // unreadable or unparseable storage — cold open

    try{
      // Arrays and scalars are not state objects; only a plain object merges.
      if(!d || typeof d!=="object" || Array.isArray(d)) return;
      Object.assign(this.s,d);

      const s=this.s;
      // SCENARIOS[scenario].telematics is read on the first paint.
      if(!SCENARIOS[s.scenario]) s.scenario="collision";
      if(!STR[s.lang]) s.lang="en";
      if(typeof s.screen!=="string" || !s.screen) s.screen="s0";
      if(!["driver","fleet","system"].includes(s.persona)) s.persona="driver";
      // fail.tpa is read by the status bar on every render.
      if(!s.fail || typeof s.fail!=="object") s.fail={tpa:false,offline:false,coverage:false};
      else s.fail={tpa:!!s.fail.tpa, offline:!!s.fail.offline, coverage:!!s.fail.coverage};
      // Every one of these is .filter()ed or .length'd during render.
      for(const k of ["log","hooks","queue","incidents","navStack"]){
        if(!Array.isArray(s[k])) s[k]=[];
      }
      if(!s.draft || typeof s.draft!=="object") s.draft=freshDraft(s.scenario);
      else s.draft=Object.assign(freshDraft(s.scenario), s.draft);

      /* The chat indexes into a script whose length depends on the scenario —
         a theft has one turn fewer, and the injury turns only exist once the
         driver says yes. A stored index is therefore routinely wrong for the
         state being loaded: too high after a scenario switch, or pointing at
         an injury turn for a draft where nobody is hurt. The chat clamps to
         the script it actually built; here we only refuse values that are not
         usable as an index at all, which is what would break the render. */
      for(const k of ["chatTurn","chatSeen"]){
        const n = s[k];
        if(typeof n!=="number" || !Number.isFinite(n) || n<0) s[k]=0;
        else s[k]=Math.min(Math.floor(n), CHAT_TURN_MAX);
      }
      if(s.chatSeen < s.chatTurn) s.chatSeen = s.chatTurn;
      // An unrecognised mode would route to a screen that renders neither path.
      if(!["form","chat"].includes(s.draft.intakeMode)) s.draft.intakeMode=null;
      // A draft belongs to the scenario it was made for. Stored state that
      // names one scenario and carries another's pre-filled values renders the
      // wrong incident type on the confirm rows — a theft showing "Collision
      // with another vehicle". Happens whenever the scenario is set without a
      // matching draft, which a deep link does by omitting draft entirely.
      // The driver's own answers are kept; only the telematics-derived values
      // are re-seeded from the scenario that is actually loaded.
      if(s.draft.type && s.draft.type!==SCENARIOS[s.scenario].telematics.inferred
         && !(s.draft.corrected && s.draft.corrected.type)){
        const t=SCENARIOS[s.scenario].telematics;
        Object.assign(s.draft, {
          vehicle:t.vehicle, vin:t.vin||"", occurredAt:t.time, occurredOn:t.date||"",
          location:t.location, lat:t.lat, lon:t.lon, type:t.inferred,
          reported:{vehicle:t.vehicle, occurredAt:t.time, occurredOn:t.date||"",
            location:t.location, type:t.inferred},
        });
      }

      /* A draft written before the date was stored has no occurredOn at all,
         and the screens would render an empty date rather than the wrong one.
         Seed it from the scenario the draft belongs to: the unit reported one
         instant, so the date that goes with a stored time is the unit's. */
      if(typeof s.draft.occurredOn!=="string" || !s.draft.occurredOn){
        s.draft.occurredOn = SCENARIOS[s.scenario].telematics.date || "";
      }

      // A stale build wrote no drivableSource at all, and a theft draft from
      // one of those has drivable:null — which would show question 6 again and
      // block submission on a field the flow no longer asks. Re-derive it.
      if(SCENARIOS[s.scenario].type==="theft"){
        if(s.draft.drivable===null || s.draft.drivable===undefined){
          s.draft.drivable=false; s.draft.drivableSource="derived";
        }
      }
      if(typeof s.draft.drivableSource!=="string") s.draft.drivableSource=null;

      // photos is keyed and dereferenced on every render of the photo grid and
      // the archive. A stale build wrote {at,skipped}; this one adds kb/thumb.
      // Anything that is not a plain object per slot is dropped rather than
      // repaired — a missing slot renders as un-captured, which is true.
      const ph=s.draft.photos;
      if(!ph || typeof ph!=="object" || Array.isArray(ph)) s.draft.photos={};
      else {
        const clean={};
        for(const k in ph){
          const v=ph[k];
          if(!v || typeof v!=="object" || Array.isArray(v)) continue;
          const th = (v.thumb && typeof v.thumb==="object" && typeof v.thumb.url==="string")
            ? v.thumb : null;
          // extra is .map()ed and .length'd by the photo grid and the archive.
          // A stale build wrote no extras at all, so absent is the normal case.
          const ex = Array.isArray(v.extra)
            ? v.extra.filter(e => e && typeof e==="object" && !Array.isArray(e)).map(e => ({
                at: typeof e.at==="string" ? e.at : "",
                kb: typeof e.kb==="number" ? e.kb : null,
                name: typeof e.name==="string" ? e.name : "",
                thumb: (e.thumb && typeof e.thumb==="object" && typeof e.thumb.url==="string")
                  ? e.thumb : null,
              }))
            : [];
          clean[k]={
            at: typeof v.at==="string" ? v.at : "",
            skipped: !!v.skipped,
            kb: typeof v.kb==="number" ? v.kb : null,
            name: typeof v.name==="string" ? v.name : "",
            thumb: th,
            extra: ex,
          };
        }
        s.draft.photos=clean;
      }
    }catch(e){
      // A shape we cannot repair is still not worth a white screen.
      this.s.screen="s0"; this.s.persona="driver";
    }
  },
  reset(keepPersona){
    const persona = keepPersona ? this.s.persona : "driver";
    const scen = this.s.scenario, lang=this.s.lang, notes=this.s.notes;
    localStorage.removeItem(LS_KEY);
    this.s = Object.assign({}, {
      persona, scenario:scen, lang, notes,
      fail:{tpa:false,offline:false,coverage:false},
      screen:"s0", subScreen:null, draft:freshDraft(scen),
      incident:null, reference:null, refLatencyMs:null, startedAt:null, stoppedAt:null, tick:0,
      log:[], hooks:[], queue:[], incidents:[], mergeGroup:null,
      exportOpen:false, fleetTab:"list", sysTab:"log", detailOpen:false, lastSaved:null,
      easLangCol:"en", chatTurn:0, chatSeen:0,
    });
    this.save(); this.emit();
  }
};

/* --- log helpers --- */
export let logSeq=0;
export function logAdd(entry){
  Store.s.log.push(Object.assign({id:++logSeq, t:clockT()}, entry));
  if(Store.s.log.length>200) Store.s.log.splice(0,Store.s.log.length-200);
  Store.save(); Store.emit();
}
export function hookFire(name, payload){
  Store.s.hooks.push({id:++logSeq, t:clockT(), name, payload:payload||{}});
  if(Store.s.hooks.length>100) Store.s.hooks.splice(0,Store.s.hooks.length-100);
  logAdd({m:"HOOK", p:"→ webhook  "+name, s:"200", ms:rnd(8,34), body:JSON.stringify(payload||{},null,1)});
}

/* domain.js can't import the store (cycle), so hand it the language getter. */
setLangSource(() => Store.s.lang);
