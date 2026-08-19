import { SCENARIOS, setLangSource } from '../data/domain.js';
import { clockT, rnd } from './utils.js';

/* ==================================================================
   §3 STORE — single state object, localStorage-backed, subscribe/render
   ================================================================== */
export const LS_KEY = "fnol.demo.v1";

export function freshDraft(scenId){
  const sc = SCENARIOS[scenId] || SCENARIOS.collision;
  const t  = sc.telematics;
  return {
    // --- Tier 1: the only six fields that block submission ---
    vehicle:      t.vehicle,        vehicleConfirmed:false,
    occurredAt:   t.time,           timeConfirmed:false,
    location:     t.location,       lat:t.lat, lon:t.lon, locationConfirmed:false,
    type:         t.inferred,       typeConfirmed:false,
    injured:      null,             // true | false — the one real question
    drivable:     null,             // true | false — drives the credit-hire clock
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
    notes:false,                   // design-notes overlay
    fail:{ tpa:false, offline:false, coverage:false },
    screen:"s0",                   // driver flow position
    navStack:[],                   // where the driver came from — every step is reversible
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
    // any screen change pushes the screen we're leaving, so Back always works.
    // NO_HISTORY screens are terminal//destructive resets that must not be re-entered backwards.
    if(patch && patch.screen && patch.screen!==this.s.screen && !patch.__noHist){
      // Every transition is recorded, s0 included — a mistap on the cold open
      // must be as correctable as any other. Returning TO s0 resets the trail.
      if(patch.screen==="s0") this.s.navStack=[];
      else this.s.navStack=[...this.s.navStack, this.s.screen];
    }
    if(patch) delete patch.__noHist;
    Object.assign(this.s,patch); this.save(); this.emit();
  },
  back(){
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
  load(){
    try{
      const raw=localStorage.getItem(LS_KEY); if(!raw) return;
      const d=JSON.parse(raw);
      if(d && typeof d==="object") Object.assign(this.s,d);
      if(!this.s.draft) this.s.draft=freshDraft(this.s.scenario);
      // sessions saved before back-navigation existed have no stack
      if(!Array.isArray(this.s.navStack)) this.s.navStack=[];
    }catch(e){}
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
