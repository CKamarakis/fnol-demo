import { el } from '../../core/dom.jsx';
import { I } from '../../core/utils.js';
import { dn } from '../../components/DriverShell.jsx';
import { gapShell, textField } from './GapsHub.jsx';

/* ---------- other insurer — deliberately last ---------- */
export function scrOtherInsurer(){
  const body=el("div",{});
  body.append(textField("Their insurer, if you can see the card","otherInsurer","HUK-Coburg, Allianz…"));
  body.append(textField("Policy number","otherPolicy",""));
  body.append(el("div",{class:"card-quiet"},
    el("div",{style:"display:flex;gap:10px"},el("span",{html:I.info,style:"color:var(--ink-3);flex:none;margin-top:2px"}),
      el("p",{class:"tiny",style:"line-height:1.5",
        html:"Genuinely optional. We can get this from the plate through the central register. <b style='color:var(--ink-2)'>Skip it without a second thought.</b>"}))));
  return gapShell({
    id:"otherIns", title:"Their insurance",
    sub:"Last on the list on purpose.",
    body,
    note: dn("The field every FNOL form puts near the top",
      "Insurer and policy number <i>feel</i> essential, which is why they usually appear on page one. They are the <b>least</b> perishable thing in the entire report: derivable from the plate, chaseable for weeks. Putting them early costs you the witness. This is the clearest example of what perishability ordering actually changes.")
  });
}


