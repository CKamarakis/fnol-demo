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
    occurredAt:   t.time,           timeConfirmed:false,
    location:     t.location,       lat:t.lat, lon:t.lon, locationConfirmed:false,
    type:         t.inferred,       typeConfirmed:false,
    typeOther:    "",               // when type is "other", what it actually was
    alsoDamaged:  [],               // damage that came with the main event
    // What the vehicle originally reported. Kept whatever the driver does, so a
    // correction is a recorded disagreement rather than an overwrite — the
    // handler can see both values and who changed which.
    reported:     { vehicle:t.vehicle, occurredAt:t.time, location:t.location, type:t.inferred },
    corrected:    {},   // field -> {from, to, at}
    injured:      null,             // true | false — the one real question
    drivable:     null,             // true | false — the VEHICLE; drives the credit-hire clock
    driverFit:    null,             // true | false — the PERSON; fleet welfare, never blocking
    // --- injury detail: presence + band + emergency attended. NOT description. ---
    injurySeverity:null, injuryEmergency:null, injuryCount:null,
    // --- perishable gap-fill ---
    witnessPresent:null, witnessName:"", witnessPhone:"",
    otherPlate:"", otherMake:"", otherDriver:"", otherPhone:"", otherInsurer:"", otherPolicy:"",
    photos:{}, // slot -> {at, skipped}
    easA:[], easB:[], impact:null, sketch:null, sigA:null, sigB:null,
    policeAttended:null, policeRef:"",
    cargoLaden:null, cargoDesc:"", trailer:"", hazardous:null,
    skipped:[],      // ids of things the driver chose to skip — logged, never nagged
    notes:"",
  };
}

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
      const {persona,scenario,lang,notes,fail,screen,subScreen,draft,incident,reference,
             refLatencyMs,startedAt,stoppedAt,log,hooks,queue,incidents,mergeGroup,
             fleetTab,sysTab,exportOpen,easLangCol} = this.s;
      localStorage.setItem(LS_KEY, JSON.stringify({
        persona,scenario,lang,notes,fail,screen,subScreen,draft,incident,reference,
        refLatencyMs,startedAt,stoppedAt,
        log:log.slice(-140), hooks:hooks.slice(-80), queue, incidents, mergeGroup,
        fleetTab,sysTab,exportOpen,easLangCol
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
      easLangCol:"en",
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
