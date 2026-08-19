import { $, el } from '../core/dom.js';
import { SCENARIOS } from '../data/domain.js';
import { Store } from '../core/store.js';

/* ==================================================================
   §6 CHROME (demo scaffolding — deliberately not product-styled)
   ================================================================== */
export function renderChrome(){
  const s=Store.s;
  const c=$("#chrome");
  c.innerHTML="";

  // row 1 — persona + scenario
  const r1=el("div",{class:"chrome-row"});
  r1.append(
    el("span",{class:"chrome-brand",html:"<b>INS</b> FNOL"}),
    el("span",{class:"chrome-hint",text:"demo harness — not the product"}),
    el("div",{class:"chrome-sep"}),
    el("span",{class:"chrome-tag",text:"Persona"}),
    seg([["driver","Driver"],["fleet","Fleet manager"],["system","System"]], s.persona, "persona"),
    el("div",{class:"chrome-sep"}),
    el("span",{class:"chrome-tag",text:"Scenario"}),
    seg(Object.values(SCENARIOS).map(x=>[x.id,x.label]), s.scenario, "scenario"),
    el("div",{class:"chrome-spacer"}),
    el("button",{class:"tog note","data-act":"toggle-notes","aria-pressed":String(s.notes)},
      el("i",{class:"dot"}), "Design notes"),
    el("button",{class:"chrome-btn danger","data-act":"reset"},"Reset")
  );

  // row 2 — failure theatre
  const r2=el("div",{class:"chrome-row"});
  r2.append(
    el("span",{class:"chrome-tag",text:"Failure theatre"}),
    tog("fail-tpa", s.fail.tpa, "TPA down"),
    tog("fail-offline", s.fail.offline, "No signal"),
    el("button",{class:"tog fire","data-act":"triple-tap"}, el("i",{class:"dot"}), "Triple-tap submit"),
    tog("fail-coverage", s.fail.coverage, "Vehicle not on schedule"),
    el("div",{class:"chrome-sep"}),
    el("span",{class:"chrome-hint",text:
      s.fail.tpa||s.fail.offline||s.fail.coverage
        ? "flip these mid-flow — the driver's screens do not change"
        : "flip any of these mid-flow"}),
    el("div",{class:"chrome-spacer"}),
    s.persona!=="system" && el("button",{class:"chrome-btn","data-act":"go-system"},"Watch it in the System pane →")
  );

  c.append(r1,r2);
  document.documentElement.style.setProperty("--chrome-h", (c.offsetHeight||88)+"px");
  document.body.classList.toggle("notes-on", !!s.notes);

  function seg(items, cur, kind){
    const d=el("div",{class:"seg"});
    items.forEach(([v,l])=> d.append(el("button",{"data-act":"set-"+kind,"data-v":v,"aria-pressed":String(cur===v)},l)));
    return d;
  }
  function tog(act,on,label){
    return el("button",{class:"tog","data-act":act,"aria-pressed":String(!!on)}, el("i",{class:"dot"}), label);
  }
}


