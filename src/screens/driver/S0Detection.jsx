import { el } from '../../core/dom.jsx';
import { I } from '../../core/utils.js';
import { SCENARIOS, T } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn, langSelect } from '../../components/DriverShell.jsx';
import { svgMap } from '../../components/svg.js';

/* ---------- S0 · telematics cold open ---------- */
export function scrS0(){
  const s=Store.s, sc=SCENARIOS[s.scenario], t=sc.telematics;
  const wrap=el("div",{class:"scroll"});
  const inner=el("div",{class:"pad",style:"padding-top:22px"});

  // language switch — on screen one, not in settings
  inner.append(el("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:10px"},
    el("div",{class:"chip plain",style:"border-color:var(--line);gap:7px"},
      el("span",{html:I.bolt,style:"color:var(--warn)"}),"Detected by the vehicle"),
    langSelect(s.lang)
  ));

  inner.append(el("div",{class:"sp20"}));
  inner.append(el("h1",{class:"h1",text: s.lang==="en" ? sc.headline : T("detected")}));
  inner.append(el("p",{class:"sub",style:"font-size:16.5px",
    text:t.location.split(",")[0]+" · "+t.time+" · "+T("today")}));

  inner.append(el("div",{class:"sp20"}));
  inner.append(el("div",{class:"map-bleed",html:svgMap(sc,false)}));

  inner.append(dn("Screen 1 of the whole product",
    "This is not a form. It is a <b>question about people</b>. The claim can wait ninety seconds; a person on the ground cannot. Everything the vehicle already knows is collapsed below — <b>three taps to see it, zero to ignore it</b>. The driver's first action is never data entry."));

  inner.append(el("div",{class:"sp20"}));
  inner.append(el("h2",{class:"h2",text:T("ok")}));

  inner.append(el("div",{class:"sp16"}));

  // collapsed telematics detail
  inner.append(el("button",{class:"frow","data-act":"toggle-detail",style:"width:100%"},
    el("span",{class:"frow-ic",html:I.bolt}),
    el("span",{class:"frow-body"},
      el("span",{class:"frow-label",text:T("already")}),
      el("span",{class:"frow-value",style:"font-size:14.5px;font-weight:550",
        text:"Location · time · speed · impact · vehicle · driver · dashcam"})),
    el("span",{class:"frow-right",html:I.chevD})
  ));

  if(s.detailOpen){
    const rows=[
      ["Location", t.location],
      ["Time", t.time+" · "+new Date().toLocaleDateString("de-DE")],
      ["Speed", t.speed],
      ["Impact", t.impact],
      ["Vehicle", t.vehicle+" · DAF XF 480 · fleet"],
      ["Driver", t.driver+" · tacho card active since 06:10"],
      ["Dashcam", t.clip],
    ];
    const d=el("div",{class:"card-quiet",style:"margin-top:9px"});
    rows.forEach(([k,v])=>d.append(el("div",{style:"display:flex;gap:12px;padding:6px 0;border-bottom:1px solid var(--line-soft)"},
      el("span",{class:"mono",style:"font-size:11px;color:var(--ink-3);width:76px;flex:none;text-transform:uppercase;letter-spacing:.05em",text:k}),
      el("span",{style:"font-size:13px;color:var(--ink-2);flex:1",text:v}))));
    d.append(el("p",{class:"tiny",style:"margin-top:10px;line-height:1.5",
      html:"Auto-notification from the vehicle is a <b style='color:var(--ink-2)'>works agreement</b> (Betriebsvereinbarung) question in Germany before it is a product question. The works council signs off on this, not the PM."}));
    inner.append(d);
  }

  inner.append(el("div",{class:"sp16"}));
  wrap.append(inner);

  // primary actions — bottom third, thumb zone
  const dock=el("div",{class:"dock"});
  dock.append(
    el("button",{class:"btn btn-primary btn-lg","data-act":"s0-fine"}, T("fine")),
    el("button",{class:"btn btn-danger btn-lg","data-act":"s0-hurt"}, T("hurt")),
    el("button",{class:"btn btn-ghost","data-act":"s0-dismiss"}, T("dismiss"))
  );
  dock.append(dn("False positives were designed for, not discovered",
    "Dismiss is a <b>first-class button</b>, same visual weight class as the others, ≤2 taps to complete. Telematics false positives will be the loudest early problem and the fastest way to lose driver trust. If dismissal is buried, drivers stop opening the app — and then you lose the true positives too."));
  return el("div",{style:"flex:1;display:flex;flex-direction:column;overflow:hidden"}, wrap, dock);
}

export function scrS0Detail(){ return scrS0(); }


