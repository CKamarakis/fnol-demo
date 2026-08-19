import { el } from '../../core/dom.jsx';
import { I } from '../../core/utils.js';
import { T } from '../../data/domain.js';
import { dn } from '../../components/DriverShell.jsx';

/* ---------- INJURY SAFETY ROUTE — before ANY data collection ---------- */
export function scrEmergency(){
  const wrap=el("div",{class:"scroll"});
  const inner=el("div",{class:"pad",style:"padding-top:26px"});
  inner.append(el("div",{style:"width:72px;height:72px;border-radius:22px;background:var(--danger-soft);border:1px solid #e0a89c;display:grid;place-items:center;color:var(--danger-deep)",
    html:'<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>'}));
  inner.append(el("div",{class:"sp20"}));
  inner.append(el("h1",{class:"h1",text:T("emgTitle")}));
  inner.append(el("p",{class:"sub",style:"font-size:17px;margin-top:10px",text:T("emgBody")}));
  inner.append(el("div",{class:"sp20"}));
  inner.append(el("div",{class:"card",style:"border-color:#e0a89c;background:linear-gradient(160deg,#fde5e0,#12181f)"},
    el("div",{style:"font-size:13px;color:#b8341c;font-weight:650",text:"Germany · Europe-wide"}),
    el("div",{style:"font-size:34px;font-weight:800;letter-spacing:.04em;margin-top:2px",text:"112"}),
    el("p",{class:"tiny",style:"margin-top:6px",text:"Works from any mobile, any network, without a SIM."})
  ));
  inner.append(dn("The rule this screen enforces",
    "<b>We never ask a claims question ahead of a safety one.</b> Answering “someone is hurt” routes here <i>before</i> any field is collected — not to a form with an injury section near the top. There is no Skip on this screen and no field on it. The claim is still open behind it; nothing entered is lost."));
  wrap.append(inner);
  const dock=el("div",{class:"dock"},
    el("button",{class:"btn btn-danger btn-lg","data-act":"call112"},el("span",{html:I.phone}), T("call112")),
    el("button",{class:"btn btn-secondary","data-act":"emg-continue"}, T("emgCalled")),
    el("button",{class:"btn btn-quiet","data-act":"emg-continue"}, T("emgNoNeed"))
  );
  return el("div",{style:"flex:1;display:flex;flex-direction:column;overflow:hidden"},wrap,dock);
}


