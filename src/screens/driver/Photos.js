import { I, el } from '../../core/dom.js';
import { PHOTO_SLOTS, SCENARIOS } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.js';
import { gapShell } from './GapsHub.js';
import { svgSilhouette } from '../../components/svg.js';

/* ---------- guided photo set ---------- */
export function scrPhotos(){
  const s=Store.s, d=s.draft, sc=SCENARIOS[s.scenario];
  const slots=sc.photos||[];
  const body=el("div",{});
  const grid=el("div",{class:"photo-grid"});
  slots.forEach((k,i)=>{
    const meta=PHOTO_SLOTS[k]||{n:i+1,label:k,sil:"wide"};
    const st=d.photos[k];
    grid.append(el("button",{
      class:"pslot"+(st&&!st.skipped?" shot":"")+(st&&st.skipped?" skipped":""),
      "data-act":"shoot","data-v":k},
      el("span",{html:svgSilhouette(meta.sil, !!(st&&!st.skipped))}),
      el("span",{class:"pflash"}),
      el("span",{class:"pnum",html: st&&!st.skipped ? I.chkS : String(meta.n)}),
      el("span",{class:"plabel",text:meta.label})
    ));
  });
  body.append(grid);

  const done=slots.filter(k=>d.photos[k]&&!d.photos[k].skipped).length;
  body.append(el("div",{style:"display:flex;justify-content:space-between;align-items:center;margin-top:12px"},
    el("span",{class:"tiny",text:done+" of "+slots.length+" captured"}),
    el("button",{class:"btn btn-sm btn-ghost","data-act":"skip-remaining-photos"},"Skip the rest")));

  body.append(el("div",{class:"card-quiet",style:"margin-top:14px"},
    el("p",{class:"tiny",style:"line-height:1.5",
      html:"Tap a slot to take that shot. The silhouette shows what to frame. <b style='color:var(--ink-2)'>Skipping a slot is fine and is logged</b> — a skipped slot is a known gap, an unnamed pile of photos is not."})));

  if(s.fail.offline){
    body.append(el("div",{class:"sp12"}));
    body.append(el("div",{class:"card-quiet",style:"border-color:#e8d3a4"},
      el("div",{style:"display:flex;gap:10px"},el("span",{html:I.offline,style:"color:var(--warn);flex:none;margin-top:2px"}),
        el("p",{class:"tiny",style:"line-height:1.5",html:"Photos are held on the phone and queued <b style='color:var(--ink-2)'>separately from the report</b>. The report syncs first — it's a few kilobytes. Photos follow."}))));
  }

  return gapShell({
    id:"photos", title:"Photographs", sub:"Five named shots, not “upload photos”. The order matters.",
    body,
    note: dn("A named sequence beats an upload button",
      "“Attach photos” produces four pictures of the same dent. Named slots with silhouettes produce the <b>wide shot</b> that establishes position and the <b>signage shot</b> that establishes right of way — the two an adjuster actually needs and the two a driver never thinks to take. Each slot is independently skippable, and a skipped slot is recorded as a <i>known</i> gap rather than a silent one.")
  });
}


