import { el } from '../core/dom.jsx';
import { I, nowHM } from '../core/utils.js';
import { STR, T } from '../data/domain.js';
import { Store } from '../core/store.js';

/* ==================================================================
   §7 DRIVER FLOW
   ================================================================== */

/* helper: a design-note callout */
export function dn(tag, html){ return el("div",{class:"dn"}, el("span",{class:"dn-tag",text:tag}), el("div",{html})); }

/* the 90-second timer, running from S0 and stopped on submit */
export function timerRail(){
  const s=Store.s;
  if(!s.startedAt) return null;
  const end = s.stoppedAt || Date.now();
  const secs = (end - s.startedAt)/1000;
  const shown = secs.toFixed(1);
  const pct = Math.min(100, secs/90*100);
  const cls = secs>90 ? "over" : secs>65 ? "warn" : "";
  const stopped = !!s.stoppedAt;
  // Wall-clock, so an idle demo window drifts into the thousands and the number
  // stops meaning anything. Past 3 min we say so instead of showing a big number.
  const idle = !stopped && secs>180;
  return el("div",{class:"timer-rail"+(stopped?" stopped":"")+(idle?" idle":""),
      title:"Demo instrument. Times the blocking path — cold open to reference issued — against a 90-second target. Not shown to a real driver."},
    el("span",{class:"timer-tag",text:"DEMO"}),
    el("span",{class:"timer-lbl",text: stopped ? "blocking path took" : T("blockPath")}),
    idle
      ? el("span",{class:"timer-val idle-val",text:"paused — window left open"})
      : el("span",{class:"timer-val "+cls, text: shown+"s"}),
    idle ? el("span",{class:"timer-bar"}) 
         : el("div",{class:"timer-bar"}, el("i",{style:"width:"+pct+"%;background:"+(secs>90?"#EE6B54":secs>65?"#9a6410":"#1f7a5a")})),
    el("span",{class:"timer-lbl",text: stopped ? "stopped" : idle ? "" : "/ 90s target"})
  );
}

/* language chooser — a dropdown, so it stays one control as languages grow */
export function langSelect(cur){
  const sel=el("select",{class:"lang-sel","aria-label":"Language","data-act":"set-lang-sel"});
  Object.keys(STR).forEach(k=>{
    const op=el("option",{value:k,text:k.toUpperCase()+" · "+STR[k].lang});
    if(k===cur) op.selected=true;
    sel.append(op);
  });
  return el("div",{class:"lang-wrap"}, sel, el("span",{class:"lang-chev",html:I.chevD}));
}

/* back bar — a mistap must always be correctable.
   Hidden where reversing is wrong: the cold open (nothing behind it) and
   the 112 screen (never put a Back above a safety instruction). */
export const SCREEN_TITLES={
  s0:"Incident", s0det:"Details", dismiss:"Dismiss", emg:"Emergency",
  s1:"The six questions", s2:"Your reference", gaps:"What disappears",
  witness:"Witness", otherv:"Other vehicle", photos:"Photos", eas:"Circumstances",
  police:"Police", cargo:"Cargo", otherins:"Their insurer", done:"Finished",
};
export const NO_BACK=["s0","emg"];
export function navBar(){
  const s=Store.s;
  if(NO_BACK.includes(s.screen)) return null;
  if(!s.navStack.length) return null;
  const label=(SCREEN_TITLES[s.navStack[s.navStack.length-1]]||"Back");
  return el("div",{class:"nav-bar"},
    el("button",{class:"nav-back","data-act":"nav-back","aria-label":"Go back to "+label},
      el("span",{class:"nav-chev",html:I.chevL}),
      el("span",{class:"nav-lbl",text:label})),
    el("span",{class:"nav-saved",text:s.lastSaved?T("saved"):""})
  );
}

/* the persistent 112 rail — above the fold on EVERY screen */
export function emergencyRail(){
  return el("div",{class:"emg-rail dn-anchor"},
    el("button",{class:"emg-btn","data-act":"call112"}, el("span",{html:I.phone}), T("emgCta"))
  );
}

export function statusBar(){
  const off=Store.s.fail.offline;
  return el("div",{class:"status-bar"},
    el("span",{text:nowHM()}),
    el("span",{class:"sb-right"},
      el("span",{html: off
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a6410" stroke-width="2.4" stroke-linecap="round"><path d="m2 2 20 20"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M12 20h.01"/></svg>'
        : I.wifi}),
      el("span",{html:I.batt})
    )
  );
}

/* saved affordance — "nothing is ever lost", so a shaken user isn't
   afraid to close the app */
export function savedChip(){
  if(!Store.s.lastSaved) return null;
  return el("div",{class:"chip ok",style:"font-size:10.5px"}, el("span",{html:I.save}), T("saved"));
}

export function offlineBanner(){
  if(!Store.s.fail.offline) return null;
  return el("div",{class:"banner banner-offline"},
    el("span",{html:I.offline}),
    el("div",{},
      el("div",{text:"No signal — you can keep going."}),
      el("div",{style:"font-weight:500;opacity:.85;margin-top:2px",
        text:"Everything is saved on the phone and sent when you're back in coverage."})
    )
  );
}


