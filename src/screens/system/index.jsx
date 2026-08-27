import { el } from '../../core/dom.jsx';
import { I, esc } from '../../core/utils.js';
import { Store } from '../../core/store.js';
import { MAPON_FIXTURES, MAPON_THRESHOLDS, decelerationProfile } from '../../data/mapon.js';
import { dn } from '../../components/DriverShell.jsx';

/* ==================================================================
   §9 SYSTEM CONSOLE — the argument-carrier
   ================================================================== */
export function renderSystem(){
  const s=Store.s;
  const body=el("div",{class:"desk-body"});

  const tabs=el("div",{class:"tabs"});
  [["log","API log"],["telematics","Telematics in"],["contract","Contract & errors"],["states","State machine"],["faked","What's faked"]]
    .forEach(([v,l])=>tabs.append(el("button",{"data-act":"sys-tab","data-v":v,"aria-pressed":String(s.sysTab===v)},l)));
  body.append(tabs);

  if(s.sysTab==="log")      body.append(sysLog());
  if(s.sysTab==="contract") body.append(sysContract());
  if(s.sysTab==="states")   body.append(sysStates());
  if(s.sysTab==="telematics") body.append(sysTelematics());
  if(s.sysTab==="faked")    body.append(sysFaked());

  return el("div",{class:"deskframe"},
    el("div",{class:"desk-bar"},
      el("div",{class:"dots"},el("i"),el("i"),el("i")),
      el("span",{class:"desk-title",text:"FNOL · developer console · everything downstream is simulated"})),
    body);
}

export function sysLog(){
  const s=Store.s;
  const grid=el("div",{class:"sys-grid"});

  /* --- left: the API call log --- */
  const logPanel=el("div",{class:"panel"});
  logPanel.append(el("div",{class:"panel-h"},
    el("span",{},"API call log · "+s.log.length+" calls"),
    el("button",{class:"chrome-btn","data-act":"clear-log",style:"font-size:10px;padding:3px 8px"},"clear")));
  const lb=el("div",{class:"panel-b tall"});
  if(!s.log.length){
    lb.append(el("div",{class:"log-empty"},"Nothing yet. Run the driver flow, or flip a failure toggle."));
  }else{
    const log=el("div",{class:"log"});
    s.log.slice().reverse().slice(0,60).forEach(e=>{
      const sc = e.sq ? "sq" : String(e.s).startsWith("2") ? "s2" : String(e.s).startsWith("4") ? "s4" : String(e.s).startsWith("5") ? "s5" : "sq";
      const row=el("div",{class:"log-row"},
        el("span",{class:"log-t",text:e.t}),
        el("span",{class:"log-m "+(e.m||"SYS"),text:e.m||"SYS"}),
        el("span",{class:"log-p",text:e.p}),
        el("span",{class:"log-s "+sc,text:String(e.s)+(e.ms?" · "+e.ms+"ms":"")}));
      if(e.key) row.append(el("span",{class:"log-meta",html:"Idempotency-Key: "+esc(e.key)}));
      if(e.meta) row.append(el("span",{class:"log-meta",html:e.meta}));
      if(e.body) row.append(el("pre",{class:"log-body",text:e.body}));
      log.append(row);
    });
    lb.append(log);
  }
  logPanel.append(lb);
  grid.append(logPanel);

  /* --- right column --- */
  const right=el("div",{style:"display:flex;flex-direction:column;gap:16px"});

  // queue
  const qp=el("div",{class:"panel"});
  qp.append(el("div",{class:"panel-h"},
    el("span",{},"Outbound queue"),
    el("span",{class:s.queue.length?"pulsing":"",style:"color:"+(s.queue.length?"var(--warn)":"var(--ok)"),
      text:s.queue.length? s.queue.length+" waiting":"drained"})));
  const qb=el("div",{class:"panel-b"});
  if(!s.queue.length){
    qb.append(el("div",{class:"log-empty"},"Empty — everything forwarded."));
  }else{
    s.queue.forEach(q=>{
      qb.append(el("div",{class:"qrow"},
        el("span",{style:"color:"+(q.kind==="attachment"?"var(--note)":"var(--warn)"),html:q.kind==="attachment"?I.cam:I.bolt}),
        el("span",{class:"qn"},
          el("div",{},q.method+" "+q.path),
          el("div",{style:"color:#4e5d6f;font-size:10.5px",
            text: q.reason+(q.bytes?" · "+q.bytes:"")+(q.attempts?" · attempt "+(q.attempts+1):"")})),
        el("span",{class:"qa",text: q.nextIn>0 ? "retry in "+q.nextIn+"s" : q.kind==="attachment"?"held":"pending"})
      ));
    });
    qb.append(el("p",{class:"tiny",style:"margin-top:11px;line-height:1.5",
      html:"Field data and attachments are <b style='color:var(--ink-2)'>separate queues</b>. The claim record is a few kilobytes and syncs first; a 4 MB photo must never hold up the reserve."}));
  }
  qp.append(qb);
  right.append(qp);

  // webhooks
  const hp=el("div",{class:"panel"});
  hp.append(el("div",{class:"panel-h"},el("span",{},"Webhook events · "+s.hooks.length)));
  const hb=el("div",{class:"panel-b"});
  if(!s.hooks.length) hb.append(el("div",{class:"log-empty"},"No events fired yet."));
  else s.hooks.slice().reverse().slice(0,24).forEach(h=>{
    hb.append(el("div",{class:"hookrow"},
      el("span",{class:"ht",text:h.t}),
      el("div",{style:"flex:1;min-width:0"},
        el("div",{class:"hk",text:h.name}),
        el("div",{class:"hp",text:Object.entries(h.payload).slice(0,3).map(([k,v])=>k+"="+v).join("  ")}))
    ));
  });
  hp.append(hb);
  right.append(hp);

  // current failure state
  const fp=el("div",{class:"panel"});
  fp.append(el("div",{class:"panel-h"},el("span",{},"Failure theatre · current state")));
  const fb=el("div",{class:"panel-b"});
  const flags=[
    ["TPA down", s.fail.tpa, "TPA forward 502s → queued behind exponential backoff 2s/4s/8s/16s. Driver flow unchanged, byte for byte."],
    ["No signal", s.fail.offline, "Reference generated client-side. Writes queue locally with their idempotency keys. Attachments queue separately."],
    ["Vehicle not on schedule", s.fail.coverage, "Coverage check returns disputed. Incident still accepted, reference still issued, recovery still dispatched. Human review task raised."],
  ];
  flags.forEach(([l,on,why])=>{
    fb.append(el("div",{class:"qrow",style:on?"border-color:#e0a89c;background:#fde5e0":""},
      el("span",{class:"dot",style:"width:8px;height:8px;border-radius:50%;flex:none;background:"+(on?"var(--danger)":"#bccbd6")}),
      el("span",{class:"qn"},
        el("div",{style:"color:"+(on?"#b8341c":"var(--ink-3)")+";font-weight:700"},l+(on?" · ACTIVE":" · off")),
        on ? el("div",{style:"color:#8ba0b5;font-size:10.5px;margin-top:3px;line-height:1.45",text:why}) : null)));
  });
  fb.append(el("div",{class:"sp12"}));
  fb.append(el("button",{class:"btn btn-sm btn-secondary","data-act":"triple-tap",style:"width:100%"},
    "Fire triple-tap submit (3 POSTs, 1 key)"));
  fp.append(fb);
  right.append(fp);

  grid.append(right);

  const box=el("div",{});
  box.append(grid);
  box.append(el("div",{class:"sp20"}));
  box.append(dn("Why this pane exists at all",
    "Every argument in this demo that matters is invisible from the driver's phone — that is the whole point of them. Accept-then-forward looks like <i>nothing happening</i>. Idempotency looks like <i>nothing happening</i>. A coverage dispute that doesn't reject looks like <i>nothing happening</i>. This pane is where “the driver's submission must never depend on the TPA's uptime” stops being a bullet on a slide and becomes something you can watch retry at 2s, 4s and 8s while the driver's screen sits there unchanged."));
  return box;
}

export function sysContract(){
  const box=el("div",{});
  box.append(el("div",{class:"sect"},
    el("div",{class:"sect-h"},el("h3",{text:"Endpoints"}),
      el("span",{class:"sect-note",text:"the contract is the artefact; the server is not"})),
    el("div",{class:"tbl-wrap"}, (()=>{
      const t=el("table",{class:"tbl"});
      t.append(el("thead",{},el("tr",{},...["Method","Path","Behaviour"].map(h=>el("th",{text:h})))));
      const rows=[
        ["POST","/v1/incidents","Create. Requires <code>Idempotency-Key</code>. Returns 201 with reference, or 200 replay for a seen key. Never blocked by downstream availability."],
        ["PATCH","/v1/incidents/{id}","Partial update, field-by-field. Every response carries a recomputed <code>completeness</code> and <code>next_actions</code>."],
        ["POST","/v1/incidents/{id}/attachments","Media. Queued separately from field data so a photo can never delay the claim record."],
        ["POST","/v1/incidents/{id}/submit","Closes the perishable window. Not required for the incident to exist — the incident existed from the 201."],
        ["GET","/v1/incidents/{id}","Read-back. Same projection everywhere."],
        ["GET","/v1/incidents/{id}/requirements","<code>completeness</code> + <code>next_actions</code>. Drives both the driver's list and the fleet chase list."],
      ];
      const tb=el("tbody",{});
      rows.forEach(([m,p,d])=>tb.append(el("tr",{},
        el("td",{},el("span",{class:"log-m "+m,style:"font-family:var(--mono);font-weight:700",text:m})),
        el("td",{},el("span",{class:"mono",style:"color:var(--ink)",text:p})),
        el("td",{html:d}))));
      t.append(tb); return t;
    })())
  ));

  box.append(el("div",{class:"sect"},
    el("div",{class:"sect-h"},el("h3",{text:"The completeness object"}),
      el("span",{class:"sect-note",text:"returned on every write"})),
    el("pre",{class:"json",text:JSON.stringify({
      completeness:{
        score:72,
        blocking:[],
        required_next:["photos","eas","police","otherIns"],
        perishable:["photos","eas"]
      },
      next_actions:[
        {action:"capture_perishable", items:["photos","eas"]},
        {action:"recovery_dispatched", eta_minutes:45, provider:"SIMULATED"}
      ]
    },null,2)}),
    el("p",{class:"tiny",style:"margin-top:9px;line-height:1.5",
      html:"<b style='color:var(--ink-2)'><code>blocking</code> is empty the moment Tier 1 is answered</b> and never fills again. Everything else lives in <code>required_next</code>, which is advisory. The client cannot construct a state where an optional field prevents a write, because the server never reports one."}))
  );

  box.append(el("div",{class:"sect"},
    el("div",{class:"sect-h"},el("h3",{text:"Error model — four categories, one of which fails the driver"})),
    el("div",{class:"tbl-wrap"},(()=>{
      const t=el("table",{class:"tbl"});
      t.append(el("thead",{},el("tr",{},...["Category","HTTP","Driver sees","Example"].map(h=>el("th",{text:h})))));
      const rows=[
        ["auth","401 / 403","Re-authenticate. The only category that legitimately stops them.","Expired device token"],
        ["validation","422","Correction, only ever on a Tier-1 field.","occurred_at in the future"],
        ["business rule","<b>200 + flag</b>","<b>Nothing.</b> Accepted, flagged, routed to a human.","Vehicle not on policy schedule → <code>coverage_disputed</code>"],
        ["transient","<b>accepted + queued</b>","<b>Nothing.</b> Reference already issued.","TPA 502, no signal, timeout"],
      ];
      const tb=el("tbody",{});
      rows.forEach(([a,b,c,d])=>tb.append(el("tr",{},
        el("td",{},el("span",{class:"chip "+(a==="auth"?"danger":a==="validation"?"warn":"ok"),text:a})),
        el("td",{html:b}), el("td",{html:c}), el("td",{html:d}))));
      t.append(tb); return t;
    })()),
    el("div",{class:"sp12"}),
    dn("The category that does the work is “business rule”",
      "Most intake systems collapse business rules into validation and reject at the door. That is where the Art. 22 problem lives, and it is where operational damage lives too: the roadside is the <b>worst possible place</b> to litigate whether a truck was on cover. Accept it, flag it, let an underwriter look at it on Monday. Cost if wrong: some genuinely uninsured incidents enter the pipeline and have to be backed out — which is bounded, reversible, and vastly cheaper than a driver stranded because a schedule file was three days stale."))
  );

  box.append(el("div",{class:"sect"},
    el("div",{class:"sect-h"},el("h3",{text:"Webhooks"})),
    el("div",{class:"chipset"}, ...[
      "incident.acknowledged","incident.registered_with_tpa","claim.opened","incident.coverage_disputed",
      "incident.duplicate_detected","incident.merged","attachment.received","incident.perishables_captured",
      "telematics.false_positive","recovery.dispatched"
    ].map(n=>el("span",{class:"chip note",text:n})))
  ));
  return box;
}

export function sysStates(){
  const s=Store.s, inc=s.incident;
  const cur = !inc ? null : (inc.tpa_state==="registered" ? "registered_with_tpa"
    : inc.tpa_state==="queued" ? "queued_for_tpa" : "acknowledged");
  const box=el("div",{});
  const nodes=[
    ["detected","Telematics event detected", "The vehicle fires. No claim exists yet."],
    ["acknowledged","acknowledged", "Accepted, persisted, reference issued. Sub-second. This is the point of no return for the driver's obligation — everything after is the insurer's problem."],
    ["queued_for_tpa","queued_for_tpa", "TPA unreachable. Exponential backoff. Invisible to the driver."],
    ["registered_with_tpa","registered_with_tpa", "The TPA has it. Only now does the TPA claim id exist."],
    ["claim_opened","claim.opened", "Reserve set. Handler assigned."],
  ];
  const sm=el("div",{class:"sm"});
  const order=["detected","acknowledged","queued_for_tpa","registered_with_tpa","claim_opened"];
  const curIdx = cur ? order.indexOf(cur) : (s.startedAt?0:-1);
  nodes.forEach((n,i)=>{
    if(i) sm.append(el("div",{class:"sm-arrow"}));
    const isCur = order[i]===cur;
    const done = curIdx>i && !(order[i]==="queued_for_tpa" && cur!=="queued_for_tpa" && !s.fail.tpa);
    const skip = order[i]==="queued_for_tpa" && cur!=="queued_for_tpa";
    sm.append(el("div",{class:"sm-node "+(isCur?"cur":done&&!skip?"done":"")},
      el("span",{class:"sm-dot"}),
      el("div",{style:"flex:1"},
        el("div",{style:"font-weight:700"},n[1]),
        el("div",{style:"font-size:10.5px;color:var(--ink-3);margin-top:3px;line-height:1.45",text:n[2]})),
      isCur?el("span",{class:"chip info",style:"font-size:9.5px"},"you are here"):null,
      skip&&!isCur?el("span",{class:"chip plain",style:"font-size:9.5px;opacity:.5"},"bypassed"):null
    ));
  });

  const grid=el("div",{class:"sys-grid"});
  const p1=el("div",{class:"panel"},
    el("div",{class:"panel-h"},el("span",{},"Incident state machine")),
    el("div",{class:"panel-b tall"}, sm,
      el("div",{class:"sm-branch"},"↘ dismissed_false_positive — terminal, no claim record, no reserve"),
      el("div",{class:"sm-branch"},"↘ merged_into(incident_id) — terminal for the duplicate, survivor keeps the reserve"),
      el("div",{class:"sm-branch"},"⚑ coverage_disputed — a FLAG, not a state. Runs alongside any state. Never terminal, never blocking.")
    ));
  const p2=el("div",{class:"panel"},
    el("div",{class:"panel-h"},el("span",{},"Current record")),
    el("div",{class:"panel-b tall"},
      inc ? el("pre",{class:"json",style:"border:none;background:none;padding:0"},
              JSON.stringify(inc,null,2))
          : el("div",{class:"log-empty"},"No incident yet — run the driver flow.")));
  grid.append(p1,p2);
  box.append(grid);
  box.append(el("div",{class:"sp20"}));
  box.append(dn("coverage_disputed is a flag, not a state",
    "Modelling it as a state would make it terminal by construction and put a rejection path into the state machine — which is precisely the thing we said we would never do at intake. As an orthogonal flag it rides alongside <code>acknowledged</code> and <code>registered_with_tpa</code> without ever preventing either, and it can be cleared by a human without a state transition."));
  return box;
}

export function sysFaked(){
  const box=el("div",{});
  box.append(el("div",{class:"card",style:"border-color:#e0a89c;background:linear-gradient(160deg,#fde5e0,#ffffff)"},
    el("div",{style:"display:flex;gap:12px;align-items:flex-start"},
      el("span",{html:I.warn,style:"color:var(--danger-deep);flex:none;margin-top:2px"}),
      el("div",{},
        el("h3",{style:"margin:0;font-size:16px",text:"No the TPA API was contacted. Nothing here is a real integration."}),
        el("p",{class:"tiny",style:"margin-top:7px;line-height:1.55;max-width:760px",
          html:"This file makes <b style='color:var(--ink-2)'>zero network requests of any kind</b> — no CDN, no fonts, no map tiles, no analytics. Disconnect the machine and everything below still works. What follows is the complete list of what is simulated, so nothing in this demo can be mistaken for something it isn't."})))));
  box.append(el("div",{class:"sp20"}));

  const groups=[
    ["Simulated — stands in for a real system", [
      ["TPA forward","<code>POST /tpa/v2/claims</code> resolves locally. Latency, 502s and the backoff schedule are modelled. No endpoint exists."],
      ["Telematics detection","Payloads use <b>Mapon's real field names, endpoints and thresholds</b> — see the Telematics tab — but the values are invented. No Mapon account was contacted, no device exists, no CAN bus was read. The deceleration figures are computed from the fixture route rather than written as text, so they are at least internally consistent."],
      ["Crash detection itself","<b>Mapon documents none.</b> The trigger here is derived from a harsh-braking alert plus speed, ignition and movement — our inference, carrying a confidence score, not something the partner sends. Confirming whether the device firmware exposes an accelerometer event is the first question I would ask them."],
      ["Coverage check","A boolean from the toggle. A real check queries the policy schedule at date of loss."],
      ["Recovery dispatch","<b>Not claimed anywhere any more.</b> An earlier build told the driver recovery was dispatched with an ETA; an FNOL system runs no recovery network and cannot know an arrival time. The vehicle being off the road is reported, and arranging recovery is the fleet's."],
      ["Central plate register","Referenced in copy as the route from plate to insurer. Not called."],
      ["Push / SMS resume link","Described in the soft-stop copy. Not sent."],
      ["Voice input","Removed. There was a mic button on every text field; speech recognition needs a network service, so it depicted something this file cannot do."],
      ["Roady, the chat path","A fixed script. Same six fields, same handlers, same draft — asked one at a time instead of all at once. Nothing here is a model, and nothing reads free text."],
      ["Photo capture","Tapping a slot marks it captured and fires a real attachment call with a simulated payload size. The camera is not opened."],
    ]],
    ["Real in this file — genuinely working code", [
      ["Idempotency","Real keys from <code>crypto.randomUUID()</code>, real key store, real replay semantics. Triple-tap genuinely produces one incident."],
      ["Offline queue and drain","Real queue, real separate lanes for field data and attachments, real replay on restore."],
      ["Completeness engine","Really computed from the draft on every write. The driver's list and the fleet chase list really do read the same array."],
      ["Duplicate matcher","Real haversine distance and real time-window arithmetic against the tuple. The 480 m / 19 min near-match is computed, not hardcoded."],
      ["Persistence","Real <code>localStorage</code>. Close the tab mid-flow and reopen it — the draft is where you left it."],
      ["The EAS content","The 17 circumstance statements are the real ones, in English, German and Polish. The export layout is structurally faithful."],
      ["The ACORD mapping","Real ACORD Automobile/Property Loss Notice field numbers. Checkable by anyone with the forms."],
    ]],
    ["Honest limitations of the approach", [
      ["Not shippable architecture","One HTML file with a fake backend. Chosen so it survives being emailed and opened in three weeks with no install. Not how this would be built."],
      ["localStorage is not durability","A real offline store is IndexedDB with a service worker and a durable outbox. The <i>behaviour</i> shown is right; the storage layer is a toy."],
      ["Latency is invented","38–120 ms locally. Real numbers depend on the TPA's round-trip, which is one of my open questions for you."],
      ["No auth","Single hardcoded driver. Real driver linkage should be a purpose-limited association with its own retention clock, not a field on a monolithic profile."],
    ]]
  ];

  groups.forEach(([title,items])=>{
    const sect=el("div",{class:"sect"});
    sect.append(el("div",{class:"sect-h"},el("h3",{text:title})));
    const ul=el("ul",{class:"faked",style:"margin:0;padding-left:18px"});
    items.forEach(([k,v])=>ul.append(el("li",{html:"<b>"+esc(k)+"</b> — "+v})));
    sect.append(ul);
    box.append(sect);
  });

  return box;
}



/* ---------- Telematics in — what the partner actually sends ---------- */

const NO_CRASH_API_NOTE =
  'Mapon documents harsh-event thresholds, CAN bus data, ignition state and an alert stream. It ' +
  'does <b>not</b> document a crash-detection endpoint &mdash; nothing in the API says &ldquo;this ' +
  'was a collision&rdquo;. So the trigger is <b>derived</b>, not received: a harsh-braking alert ' +
  'whose speed reaches zero and stays there, with the ignition off and no movement afterwards. ' +
  'That inference is ours, it carries a confidence, and it is the entire reason the dismissal path ' +
  'is a first-class button rather than a buried one. <b>This is the first thing I would want to ' +
  'confirm with Mapon</b> — if the device firmware exposes an accelerometer event, one file changes.';

function ThresholdRow({ name, t, breached }) {
  return (
    <div className={`thr-row${breached ? ' breached' : ''}`}>
      <span className="thr-name">{name}</span>
      <span className="thr-val">{t.value} {t.unit}</span>
      <span className="thr-note">{t.note}</span>
    </div>
  );
}

export function sysTelematics() {
  const scenario = Store.s.scenario;
  const fx = MAPON_FIXTURES[scenario];
  if (!fx) return el('div', {});

  const decel = decelerationProfile(fx.route);
  const conf = Math.round(fx.trigger.confidence * 100);

  return (
    <div className="sys-grid">
      <div>
        <div className="panel">
          <div className="panel-h">
            GET /unit/list.json &nbsp;·&nbsp; include=can,ignition,tachograph,device,drivers
          </div>
          <pre className="json" style={{ maxHeight: '340px' }}>
            {JSON.stringify({ data: { units: [fx.unit] } }, null, 1)}
          </pre>
        </div>

        <div className="panel" style={{ marginTop: '12px' }}>
          <div className="panel-h">
            GET /alert/list.json &nbsp;·&nbsp; {fx.alerts.length} alert(s)
          </div>
          <pre className="json" style={{ maxHeight: '200px' }}>
            {fx.alerts.length
              ? JSON.stringify({ data: fx.alerts }, null, 1)
              : '// nothing fired.\n// A stone chip is below every threshold Mapon has,\n// which is why the driver-initiated path must exist.'}
          </pre>
        </div>
      </div>

      <div>
        <div className="panel">
          <div className="panel-h">Trigger — derived, not received</div>
          <div className="panel-body">
            <div className="trig-head">
              <span className={`chip ${conf >= 70 ? 'ok' : conf >= 40 ? 'warn' : ''}`}>
                {fx.trigger.classified_as.replace(/_/g, ' ')}
              </span>
              <span className="trig-conf">{conf}% confidence</span>
            </div>
            <p className="tiny" style={{ marginTop: '9px', lineHeight: 1.5 }}>
              <b style={{ color: 'var(--ink-2)' }}>Inferred from:</b> {fx.trigger.basis}
            </p>
          </div>
        </div>

        <div className="panel" style={{ marginTop: '12px' }}>
          <div className="panel-h">Mapon's documented thresholds</div>
          <div className="panel-body">
            <ThresholdRow
              name="Harsh braking"
              t={MAPON_THRESHOLDS.harshBraking}
              breached={decel.exceedsHarshBraking}
            />
            <ThresholdRow name="Harsh acceleration" t={MAPON_THRESHOLDS.harshAcceleration} />
            <ThresholdRow name="Harsh cornering" t={MAPON_THRESHOLDS.harshCornering} />
            <ThresholdRow name="Excessive idling" t={MAPON_THRESHOLDS.excessiveIdling} />
          </div>
        </div>

        <div className="panel" style={{ marginTop: '12px' }}>
          <div className="panel-h">Speed profile — computed from route/list</div>
          <div className="panel-body">
            <div className="spd-row">
              <span>Stop</span>
              <b>{decel.spanFrom} → {decel.spanTo} km/h in {decel.spanSeconds} s</b>
            </div>
            <div className="spd-row">
              <span>Peak segment</span>
              <b>{decel.from} → {decel.to} km/h in {decel.seconds} s</b>
            </div>
            <div className="spd-row">
              <span>Peak deceleration</span>
              <b>{decel.peakMs2} m/s² · {decel.peakG} g</b>
            </div>
            <p className="tiny" style={{ marginTop: '8px', lineHeight: 1.5 }}>
              Both figures are computed from the route points, not stored as text. The span is what
              a driver recognises; the peak is what breaches the threshold. Reporting the span as
              the peak would overstate the force by about a third.
            </p>
          </div>
        </div>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        {dn('The gap in the partner API', NO_CRASH_API_NOTE)}
      </div>
    </div>
  );
}
