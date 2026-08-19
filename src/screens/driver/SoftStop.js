import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.js';
import { el } from '../../core/dom.js';
import { gapItems } from './GapsHub.js';
import { svgRing } from '../../components/svg.js';

/* ---------- soft stop ---------- */
export function scrSoftStop(){
  const s=Store.s;
  const inc = s.incident;
  const score = inc ? inc.completeness.score : 0;
  const items=gapItems();
  const skipped=items.filter(x=>x.skipped || !x.done);
  const wrap=el("div",{class:"scroll"});
  const inner=el("div",{class:"pad",style:"padding-top:30px;text-align:center"});
  inner.append(el("div",{class:"softstop"},
    el("div",{html:svgRing(score)}),
    el("h1",{class:"h1",text:"That's everything perishable."}),
    el("p",{class:"sub",style:"font-size:16.5px",text:"The rest can wait — we'll message you."})
  ));
  inner.append(el("div",{class:"sp20"}));
  inner.append(el("div",{class:"card",style:"text-align:left"},
    el("div",{class:"tiny",style:"text-transform:uppercase;letter-spacing:.07em;font-size:10.5px",text:"Reference"}),
    el("div",{class:"mono",style:"font-size:18px;font-weight:700;margin-top:3px",text:s.reference||"—"}),
    el("div",{class:"sp12"}),
    el("div",{class:"chipset"},
      el("span",{class:"chip ok",text:score+"% complete"}),
      s.draft.drivable===false && el("span",{class:"chip info",text:"Recovery en route"}),
      s.fail.offline && el("span",{class:"chip warn",text:"Will sync when you're back in signal"}))
  ));
  if(skipped.length){
    inner.append(el("div",{class:"sp16"}));
    inner.append(el("div",{class:"card-quiet",style:"text-align:left"},
      el("div",{class:"tiny",style:"font-weight:700;color:var(--ink-2);margin-bottom:8px",text:"We'll ask you about these later"}),
      el("div",{class:"chipset"},...skipped.map(x=>el("span",{class:"chip",style:"font-size:10.5px",text:x.p.label}))),
      el("p",{class:"tiny",style:"margin-top:10px",text:"No nagging now. A message tomorrow when you're not standing on a hard shoulder."})));
  }
  inner.append(dn("A soft stop, not a submit button",
    "There is no final “Submit” here because the report was <b>already filed</b> at second 42. This screen exists to give a driver permission to stop. The alternative — a form that never says you're finished — is how you get abandonment on the last screen and a claim with photographs but no witness."));
  inner.append(el("div",{class:"sp28"}));
  wrap.append(inner);
  const dock=el("div",{class:"dock"},
    el("button",{class:"btn btn-primary btn-lg","data-act":"go-fleet"},"See what dispatch sees →"),
    el("button",{class:"btn btn-ghost","data-act":"goto","data-v":"gaps"},"Add something after all"));
  return el("div",{style:"flex:1;display:flex;flex-direction:column;overflow:hidden"},wrap,dock);
}


