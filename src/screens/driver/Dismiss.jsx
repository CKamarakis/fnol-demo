import { dn } from '../../components/DriverShell.jsx';
import { el } from '../../core/dom.jsx';

/* ---------- dismissal ---------- */
export function scrDismiss(){
  const reasons=[["pothole","Pothole or bad road surface"],["kerb","Kerb or ramp"],["hard_brake","Hard braking"],["load","Load shift in the trailer"],["other","Something else"]];
  const wrap=el("div",{class:"scroll"});
  const inner=el("div",{class:"pad",style:"padding-top:22px"});
  inner.append(el("h1",{class:"h1",text:"What was it, actually?"}));
  inner.append(el("p",{class:"sub",text:"One tap. No claim is created. This tunes the detection threshold so it stops bothering you."}));
  inner.append(el("div",{class:"sp20"}));
  reasons.forEach(([v,l])=> inner.append(el("button",{class:"choice","data-act":"dismiss-reason","data-v":v},
    el("span",{class:"cbox round"}), el("span",{},l))));
  inner.append(dn("Tap 2 of 2",
    "Dismissal completes here. No confirmation dialog, no “are you sure”, no claim record, no reserve, no notification to the fleet manager. A <code>false_positive</code> event is written with the reason chip — watch it appear in the System pane. That event is the training data for the detection threshold; without it, false positives never get better."));
  wrap.append(inner);
  const dock=el("div",{class:"dock"},el("button",{class:"btn btn-ghost","data-act":"back-s0"},"Back"));
  return el("div",{style:"flex:1;display:flex;flex-direction:column;overflow:hidden"},wrap,dock);
}


