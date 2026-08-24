import { PERISHABLE, SCENARIOS } from '../data/domain.js';
import { Store, hookFire, logAdd } from './store.js';
import { clockT, rnd, sleep, toast, uuid } from './utils.js';

/* ==================================================================
   §4 FakeApi — implements the REAL contract. The contract is the
   artefact; the server is not. Transport is simulated, honestly.

   Endpoints
     POST   /v1/incidents                       (idempotent, Idempotency-Key)
     PATCH  /v1/incidents/{id}
     POST   /v1/incidents/{id}/attachments
     POST   /v1/incidents/{id}/submit
     GET    /v1/incidents/{id}
     GET    /v1/incidents/{id}/requirements

   Error model — four categories, and only ONE of them ever fails
   the driver:
     auth        401/403  → real failure, driver re-auths
     validation  422      → only Tier 1 can produce this
     business    200 + flag → NEVER rejected. Coverage disputes,
                  schedule mismatches. Art. 22: an automated adverse
                  decision on an individual needs human review.
     transient   accepted + queued → 202-equivalent. The TPA being down
                  is our problem, not the driver's.
   ================================================================== */
export const FakeApi = (function(){

  const store = { incidents:{}, idem:{} };   // idem: key -> {id, status, at}

  function refFor(){
    // Human-readable, sub-second, client-generatable. INS-DE-YYYY-NNNNNN.
    const y = new Date().getFullYear();
    const n = String(rnd(10000,999999)).padStart(6,"0");
    return "INS-DE-"+y+"-"+n;
  }

  /* completeness — the API drives the prompting, not a hardcoded UI.
     The fleet chase list and the driver's perishable list both read
     from exactly this object. */
  function completeness(inc){
    const d = inc.draft, sc = SCENARIOS[inc.scenario];
    const blocking = [];
    if(!d.vehicle) blocking.push("vehicle");
    if(!d.occurredAt) blocking.push("occurred_at");
    if(!d.location) blocking.push("location");
    if(!d.type) blocking.push("type");
    if(d.injured===null) blocking.push("injuries_present");
    if(d.drivable===null) blocking.push("vehicle_drivable");

    const req=[], per=[];
    const want = (id,cond)=>{
      if(!cond) return;
      if(d.skipped.includes(id)) return;
      const p = PERISHABLE[id];
      req.push(id);
      if(p && (p.half==="minutes")) per.push(id);
    };
    want("witness", sc.perishable.includes("witness") && d.witnessPresent===null);
    want("otherPlate", sc.thirdParty && !d.otherPlate);
    want("photos", Object.keys(d.photos).filter(k=>!d.photos[k].skipped).length < (sc.photos||[]).length);
    want("eas", sc.eas && (d.easA.length===0 && d.easB.length===0));
    want("police", d.policeAttended===null);
    want("cargo", sc.type!=="glass" && d.cargoLaden===null);
    want("otherIns", sc.thirdParty && !d.otherInsurer);

    // score: weighted — Tier 1 is 50%, perishables 35%, the rest 15%.
    const t1 = 6 - blocking.length;
    let score = Math.round((t1/6)*50);
    const perTotal = sc.perishable.length || 1;
    const perDone = sc.perishable.filter(id=>!req.includes(id)).length;
    score += Math.round((perDone/perTotal)*35);
    const coolTotal = 2;
    let coolDone = 0;
    if(d.otherInsurer || !sc.thirdParty) coolDone++;
    if(d.cargoLaden!==null || sc.type==="glass") coolDone++;
    score += Math.round((coolDone/coolTotal)*15);

    return { score:Math.min(100,score), blocking, required_next:req, perishable:per };
  }

  function nextActions(inc){
    const a=[];
    const c=inc.completeness;
    if(c.blocking.length) a.push({action:"complete_tier1", fields:c.blocking});
    // We notify; the fleet's own recovery arrangement does the dispatching.
    if(inc.draft.drivable===false) a.push({action:"dispatch_notified", channel:"fleet_ops", provider:"SIMULATED"});
    if(c.perishable.length) a.push({action:"capture_perishable", items:c.perishable});
    if(inc.coverage_status==="disputed") a.push({action:"human_review", queue:"underwriting", reason:"vehicle_not_on_schedule", basis:"GDPR Art. 22 — no automated adverse decision"});
    if(inc.tpa_state==="queued") a.push({action:"await_tpa_forward", note:"driver-invisible"});
    return a;
  }

  function project(inc){
    return {
      id: inc.id,
      reference: inc.reference,
      state: inc.state,
      tpa_state: inc.tpa_state,
      coverage_status: inc.coverage_status,
      occurred_at: inc.draft.occurredAt,
      completeness: inc.completeness,
      next_actions: nextActions(inc),
    };
  }

  /* --- latency model. Honest: local, so we simulate. --- */
  const lat = () => Store.s.fail.offline ? 0 : rnd(38,120);

  async function transport(method, path, opts){
    opts=opts||{};
    const ms = lat();
    if(Store.s.fail.offline && !opts.local){
      // NO SIGNAL. Not an error the driver sees. Queue and acknowledge.
      const item = {
        id:uuid(), method, path, key:opts.key||null, body:opts.body||null,
        kind:opts.kind||"field_data", attempts:0, at:clockT(), reason:"offline",
      };
      Store.s.queue.push(item);
      logAdd({m:method, p:path, s:"queued", sq:true, ms:0, key:opts.key,
        meta:"no signal · queued locally · driver unblocked", kind:item.kind});
      return {queued:true};
    }
    await sleep(Math.min(ms, 140));
    return {ms};
  }

  /* ---------------- POST /v1/incidents ---------------- */
  async function createIncident({key, scenario, draft, coverageFail}){
    const t0 = performance.now();

    // Idempotency FIRST — before any write. This is the whole point of the key.
    if(store.idem[key]){
      const prev = store.idem[key];
      const inc = store.incidents[prev.id];
      const r = await transport("POST","/v1/incidents",{key, body:{scenario}});
      if(r.queued) return {queued:true, id:prev.id, reference:inc.reference};
      logAdd({m:"POST", p:"/v1/incidents", s:"200", ms:r.ms, key,
        meta:"<em>Idempotent replay</em> · returning the same incident, no new reserve",
        body:JSON.stringify(project(inc),null,1)});
      return {status:200, replay:true, incident:project(inc), full:inc};
    }

    const id = "inc_"+uuid().slice(0,8);
    const reference = refFor();
    const inc = {
      id, reference, scenario, draft:JSON.parse(JSON.stringify(draft)),
      state:"acknowledged", tpa_state:"pending", coverage_status: coverageFail ? "disputed" : "in_force",
      created_at: clockT(), created_ms: Date.now(),
      attachments:[], events:[], channel:"driver_app",
      recovery: draft.drivable===false ? {dispatch_notified:true, arranged_by:"fleet"} : null,
    };
    inc.completeness = completeness(inc);
    store.incidents[id]=inc;
    store.idem[key]={id, at:Date.now()};

    const r = await transport("POST","/v1/incidents",{key, body:{scenario}});
    const took = Math.round(performance.now()-t0);

    if(r.queued){
      // offline: reference was generated CLIENT-SIDE and already shown.
      return {queued:true, id, reference, full:inc, latency:took};
    }

    logAdd({m:"POST", p:"/v1/incidents", s:"201", ms:r.ms, key,
      meta:"<em>Created</em> · reference "+reference+" · accept-then-forward",
      body:JSON.stringify(project(inc),null,1)});

    afterCreate(inc);
    return {status:201, incident:project(inc), full:inc, latency:took};
  }

  /* accept → persist → acknowledge → async forward.
     The driver's submission NEVER depends on the TPA's uptime. */
  function afterCreate(inc){
    hookFire("incident.acknowledged", {incident_id:inc.id, reference:inc.reference, at:inc.created_at});

    if(inc.coverage_status==="disputed"){
      // Business-rule failure. NOT a rejection. 200 + flag + human task.
      logAdd({m:"SYS", p:"coverage check · policy schedule", s:"200", ms:rnd(20,60),
        meta:"<em>business rule</em> · vehicle B-RL 4471 not on schedule as of loss date → <em>coverage_disputed</em>. " +
             "Incident ACCEPTED. Reference issued. Driver experience unchanged. " +
             "Art. 22 — an automated adverse decision on an individual requires human review and a right to contest."});
      hookFire("incident.coverage_disputed", {incident_id:inc.id, reason:"vehicle_not_on_schedule", auto_reject:false, review_queue:"underwriting"});
      pushFleet(inc);
      forwardToTpa(inc);
      return;
    }
    pushFleet(inc);
    forwardToTpa(inc);
  }

  function pushFleet(inc){
    const existing = Store.s.incidents.find(x=>x.id===inc.id);
    const row = {
      id:inc.id, reference:inc.reference, vehicle:inc.draft.vehicle,
      driver: SCENARIOS[inc.scenario].telematics.driver,
      type:inc.draft.type, occurredAt:inc.draft.occurredAt,
      state:inc.state, tpa_state:inc.tpa_state, coverage:inc.coverage_status,
      completeness:inc.completeness, drivable:inc.draft.drivable, injured:inc.draft.injured,
      channel:inc.channel, ttn: inc.ttn || null, merged_from: inc.merged_from||null,
      created_ms: inc.created_ms,
    };
    if(existing) Object.assign(existing,row); else Store.s.incidents.unshift(row);
    Store.save(); Store.emit();
  }

  /* --- async forward to the TPA (the TPA, simulated) with backoff --- */
  const backoff=[2,4,8,16];
  async function forwardToTpa(inc, attempt){
    attempt = attempt||0;
    if(Store.s.fail.tpa || Store.s.fail.offline){
      inc.tpa_state="queued";
      const q = Store.s.queue.find(x=>x.tpaFor===inc.id);
      if(!q){
        Store.s.queue.push({
          id:uuid(), method:"POST", path:"/tpa/v2/claims", tpaFor:inc.id,
          key:uuid(), kind:"tpa_forward", attempts:attempt, at:clockT(),
          reason: Store.s.fail.tpa ? "tpa_unavailable" : "offline",
          nextIn: backoff[Math.min(attempt,backoff.length-1)],
        });
      }
      logAdd({m:"POST", p:"/tpa/v2/claims", s: Store.s.fail.tpa?"502":"queued",
        s5:Store.s.fail.tpa, sq:!Store.s.fail.tpa, ms:Store.s.fail.tpa?rnd(2000,3100):0,
        meta: Store.s.fail.tpa
          ? "<em>transient</em> · upstream unavailable → queued, retry in "+backoff[Math.min(attempt,3)]+"s. <em>Driver already has a reference.</em>"
          : "no signal · TPA forward queued"});
      pushFleet(inc);
      // schedule a visible retry
      scheduleRetry(inc, attempt);
      return;
    }
    inc.tpa_state="registered";
    Store.s.queue = Store.s.queue.filter(x=>x.tpaFor!==inc.id);
    logAdd({m:"POST", p:"/tpa/v2/claims", s:"201", ms:rnd(380,900),
      meta:"<em>SIMULATED</em> · no the TPA endpoint was contacted. TPA claim id DKR-"+rnd(100000,999999)});
    hookFire("incident.registered_with_tpa", {incident_id:inc.id, tpa:"TPA (simulated)", tpa_claim_id:"DKR-"+rnd(100000,999999)});
    hookFire("claim.opened", {incident_id:inc.id, reference:inc.reference, reserve_eur: inc.draft.type==="glass"?850: inc.draft.type==="theft"? 46000 : 12500});
    inc.state="registered_with_tpa";
    pushFleet(inc);
  }

  const retryTimers = {};
  function scheduleRetry(inc, attempt){
    if(retryTimers[inc.id]) return;
    const wait = backoff[Math.min(attempt,backoff.length-1)];
    let left = wait;
    const q = Store.s.queue.find(x=>x.tpaFor===inc.id);
    retryTimers[inc.id] = setInterval(()=>{
      left--;
      if(q){ q.nextIn=left; q.attempts=attempt; }
      Store.emit();
      if(left<=0){
        clearInterval(retryTimers[inc.id]); delete retryTimers[inc.id];
        logAdd({m:"SYS", p:"retry · attempt "+(attempt+2), s:"…", sq:true, ms:0,
          meta:"exponential backoff — "+backoff.slice(0,attempt+2).map(x=>x+"s").join(" → ")});
        forwardToTpa(inc, attempt+1);
      }
    },1000);
  }

  /* drain the queue when a toggle flips back off — visibly, on screen */
  async function drain(){
    const items = Store.s.queue.slice();
    if(!items.length) return;
    logAdd({m:"SYS", p:"queue drain · "+items.length+" item"+(items.length===1?"":"s"), s:"…", sq:true, ms:0,
      meta:"connection restored — replaying with the original idempotency keys"});
    for(const it of items){
      await sleep(340);
      if(it.tpaFor){
        const inc = store.incidents[it.tpaFor];
        Store.s.queue = Store.s.queue.filter(x=>x.id!==it.id);
        if(retryTimers[it.tpaFor]){ clearInterval(retryTimers[it.tpaFor]); delete retryTimers[it.tpaFor]; }
        if(inc) await forwardToTpa(inc, 0);
      }else{
        Store.s.queue = Store.s.queue.filter(x=>x.id!==it.id);
        const replay = it.key && store.idem[it.key];
        logAdd({m:it.method, p:it.path, s: replay?"200":"201", ms:rnd(60,180), key:it.key,
          meta: replay
            ? "<em>Idempotent replay</em> · server returns the SAME incident "+store.idem[it.key].id+" — not a second one"
            : "replayed from offline queue"});
        if(it.kind==="attachment") hookFire("attachment.received", {incident_id:it.incidentId, slot:it.slot});
      }
      Store.emit();
    }
    // anything created purely offline now needs its TPA forward
    for(const id in store.incidents){
      const inc=store.incidents[id];
      if(inc.tpa_state==="pending" || inc.tpa_state==="queued"){ await sleep(200); await forwardToTpa(inc,0); }
    }
  }

  /* ---------------- PATCH /v1/incidents/{id} ---------------- */
  async function patchIncident(id, patch, label){
    const inc = store.incidents[id];
    if(!inc) return {status:404};
    Object.assign(inc.draft, patch);
    inc.completeness = completeness(inc);
    const key = uuid();
    const r = await transport("PATCH","/v1/incidents/"+id,{key, body:patch});
    if(r.queued){ pushFleet(inc); return {queued:true}; }
    logAdd({m:"PATCH", p:"/v1/incidents/"+id, s:"200", ms:r.ms, key,
      meta:(label||"field update")+" · completeness "+inc.completeness.score+"% · required_next ["+inc.completeness.required_next.join(", ")+"]",
      body:JSON.stringify({completeness:inc.completeness, next_actions:nextActions(inc)},null,1)});
    pushFleet(inc);
    return {status:200, incident:project(inc)};
  }

  /* ---------------- POST /v1/incidents/{id}/attachments ---------------- */
  async function postAttachment(id, slot){
    const inc = store.incidents[id];
    const key = uuid();
    // Attachments queue SEPARATELY from field data. Field data is small and
    // must sync first; a 4 MB photo must never hold up the claim record.
    const r = await transport("POST","/v1/incidents/"+id+"/attachments",{key, kind:"attachment", body:{slot}});
    if(r.queued){
      const q=Store.s.queue[Store.s.queue.length-1];
      if(q){ q.incidentId=id; q.slot=slot; q.bytes=rnd(1800,4400)+" KB"; }
      return {queued:true};
    }
    if(inc){ inc.attachments.push({slot, id:"att_"+uuid().slice(0,6), at:clockT()}); }
    logAdd({m:"POST", p:"/v1/incidents/"+id+"/attachments", s:"201", ms:r.ms+rnd(200,700), key,
      meta:"slot=<em>"+slot+"</em> · "+rnd(1800,4400)+" KB · separate queue from field data"});
    hookFire("attachment.received", {incident_id:id, slot});
    return {status:201};
  }

  /* ---------------- POST /v1/incidents/{id}/submit ---------------- */
  async function submitIncident(id){
    const inc = store.incidents[id];
    if(!inc) return {status:404};
    const key = uuid();
    const r = await transport("POST","/v1/incidents/"+id+"/submit",{key});
    inc.state = inc.state==="acknowledged" ? "submitted" : inc.state;
    if(r.queued) return {queued:true};
    logAdd({m:"POST", p:"/v1/incidents/"+id+"/submit", s:"200", ms:r.ms, key,
      meta:"perishable capture closed · completeness "+inc.completeness.score+"%"});
    hookFire("incident.perishables_captured", {incident_id:id, completeness:inc.completeness.score});
    pushFleet(inc);
    return {status:200};
  }

  /* ---------------- GET ---------------- */
  async function getIncident(id){
    const inc=store.incidents[id]; if(!inc) return {status:404};
    const r=await transport("GET","/v1/incidents/"+id,{local:true});
    logAdd({m:"GET", p:"/v1/incidents/"+id, s:"200", ms:r.ms||rnd(20,60),
      body:JSON.stringify(project(inc),null,1)});
    return {status:200, incident:project(inc)};
  }
  async function getRequirements(id){
    const inc=store.incidents[id]; if(!inc) return {status:404};
    inc.completeness=completeness(inc);
    const r=await transport("GET","/v1/incidents/"+id+"/requirements",{local:true});
    logAdd({m:"GET", p:"/v1/incidents/"+id+"/requirements", s:"200", ms:r.ms||rnd(18,50),
      meta:"the API drives the prompting — the fleet chase list reads exactly this",
      body:JSON.stringify({completeness:inc.completeness, next_actions:nextActions(inc)},null,1)});
    return {status:200, completeness:inc.completeness};
  }

  /* ---------------- false positive dismissal ---------------- */
  function dismissFalsePositive(scenario, reason){
    const key=uuid();
    logAdd({m:"POST", p:"/v1/telematics-events/evt_"+uuid().slice(0,6)+"/dismiss", s:"200", ms:rnd(40,110), key,
      meta:"<em>false_positive</em> · reason="+reason+" · <em>no incident created, no reserve, no notification</em>",
      body:JSON.stringify({event_type:"false_positive", reason, vehicle:SCENARIOS[scenario].telematics.vehicle,
        dismissed_by:"driver", taps_to_dismiss:2, feeds:"detection threshold tuning"},null,1)});
    hookFire("telematics.false_positive", {reason, vehicle:SCENARIOS[scenario].telematics.vehicle, claim_created:false});
  }

  /* ---------------- duplicate matcher ----------------
     Matching tuple: (vehicle_id, occurred_at ±15 min, location within 500 m).
     Exact tuple → auto-merge. Near match → human review.
     Three channels reporting one collision is the normal case, not the edge case. */
  function haversine(a,b){
    const R=6371000, r=x=>x*Math.PI/180;
    const dLat=r(b.lat-a.lat), dLon=r(b.lon-a.lon);
    const h=Math.sin(dLat/2)**2 + Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2;
    return Math.round(2*R*Math.asin(Math.sqrt(h)));
  }
  function simulateDuplicates(){
    const sc=SCENARIOS.collision, t=sc.telematics;
    const base={lat:t.lat, lon:t.lon};
    const reports=[
      {ch:"telematics",   label:"Vehicle auto-detect", at:"14:32:04", lat:t.lat,          lon:t.lon,          vehicle:t.vehicle, reserve:12500, note:"3.1 g front-left, airbag not deployed"},
      {ch:"driver_app",   label:"Driver app report",   at:"14:38:11", lat:t.lat+0.00019,  lon:t.lon+0.00027,  vehicle:t.vehicle, reserve:12500, note:"Marek K., 6 Tier-1 fields"},
      {ch:"phone_call",   label:"Fleet manager call",  at:"14:51:40", lat:t.lat+0.0041,   lon:t.lon-0.0026,   vehicle:t.vehicle, reserve:12500, note:"Anja logged from a phone call, location approximate"},
    ];
    reports.forEach(r=>{
      r.dist = haversine(base,{lat:r.lat,lon:r.lon});
      const mins = (parseInt(r.at.slice(0,2))*60+parseInt(r.at.slice(3,5))) - (14*60+32);
      r.dtMin = mins;
      r.vehicleMatch = r.vehicle===t.vehicle;
      r.timeMatch = Math.abs(mins)<=15;
      r.geoMatch  = r.dist<=500;
      r.exact = r.vehicleMatch && r.timeMatch && r.geoMatch;
    });
    const auto = reports.filter(r=>r.exact);
    const review = reports.filter(r=>!r.exact);
    const group = {
      id:"grp_"+uuid().slice(0,6),
      reports, auto, review,
      decision: review.length? "human_review":"auto_merge",
      survivor: reports[0],
      reserveBefore: reports.length*12500,
      reserveAfter: 12500,
      resolved:false,
    };
    logAdd({m:"SYS", p:"duplicate matcher · window (vehicle, ±15 min, 500 m)", s:"200", ms:rnd(30,80),
      meta:"3 intake events · "+auto.length+" exact tuple match → auto-merge · "+review.length+" near match → human review",
      body:JSON.stringify(reports.map(r=>({channel:r.ch, at:r.at, vehicle_match:r.vehicleMatch,
        delta_min:r.dtMin, distance_m:r.dist, within_500m:r.geoMatch, verdict:r.exact?"auto_merge":"human_review"})),null,1)});
    hookFire("incident.duplicate_detected", {group_id:group.id, candidates:3, auto_merge:auto.length, review:review.length});
    Store.set({mergeGroup:group});
    return group;
  }
  function resolveMerge(){
    const g=Store.s.mergeGroup; if(!g) return;
    g.resolved=true;
    logAdd({m:"POST", p:"/v1/incidents/merge", s:"200", ms:rnd(60,140), key:uuid(),
      meta:"3 → 1 · reserve €"+g.reserveBefore.toLocaleString("de-DE")+" → €"+g.reserveAfter.toLocaleString("de-DE")+" · duplicate reserves are loss-ratio noise",
      body:JSON.stringify({survivor_channel:"telematics", merged:["driver_app","phone_call"],
        released_reserve_eur:g.reserveBefore-g.reserveAfter},null,1)});
    hookFire("incident.merged", {group_id:g.id, survivors:1, merged:2, reserve_released_eur:g.reserveBefore-g.reserveAfter});
    Store.set({mergeGroup:g});
  }

  /* triple-tap: three POSTs, one key */
  async function tripleTap(){
    const d=Store.s.draft;
    const key = Store.s.tripleKey || uuid();
    Store.s.tripleKey = key;
    logAdd({m:"SYS", p:"driver taps Submit three times (bad signal, no feedback)", s:"…", sq:true, ms:0,
      meta:"one Idempotency-Key generated at form open — reused for all three"});
    let first=null;
    for(let i=0;i<3;i++){
      const res = await createIncident({key, scenario:Store.s.scenario, draft:d, coverageFail:Store.s.fail.coverage});
      if(i===0) first=res;
      await sleep(260);
    }
    toast("Three POSTs, one idempotency key, one incident.","ok",3600);
    return first;
  }

  return {
    createIncident, patchIncident, postAttachment, submitIncident, getIncident, getRequirements,
    completeness, project, nextActions, drain, dismissFalsePositive, simulateDuplicates,
    resolveMerge, tripleTap, forwardToTpa,
    _raw:store,
  };
})();


