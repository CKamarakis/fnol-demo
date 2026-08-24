import { $ } from './core/dom.jsx';
import { toast } from './core/utils.js';
import { LS_KEY, Store } from './core/store.js';

/* ==================================================================
   §14 BOOT
   ================================================================== */
/* React subscribes via useStore; boot only restores persisted state. */
Store.load();
// the timer needs a heartbeat while it's running
setInterval(()=>{
  if(Store.s.persona==="driver" && Store.s.startedAt && !Store.s.stoppedAt
     && ["s1","s0det"].includes(Store.s.screen)){
    const rail=document.querySelector(".timer-rail");
    if(rail){
      const secs=(Date.now()-Store.s.startedAt)/1000;
      const val=rail.querySelector(".timer-val");
      const bar=rail.querySelector(".timer-bar i");
      if(val){ val.textContent=secs.toFixed(1)+"s"; val.className="timer-val "+(secs>90?"over":secs>65?"warn":""); }
      if(bar){ bar.style.width=Math.min(100,secs/90*100)+"%";
        bar.style.background = secs>90?"#EE6B54":secs>65?"#9a6410":"#1f7a5a"; }
    }
  }
},100);

window.addEventListener("resize", ()=>{
  const c=$("#chrome");
  if(c) document.documentElement.style.setProperty("--chrome-h",(c.offsetHeight||88)+"px");
});


// A one-time orientation for whoever opens this cold.
if(!localStorage.getItem(LS_KEY+".seen")){
  try{ localStorage.setItem(LS_KEY+".seen","1"); }catch(e){}
  setTimeout(()=>toast("Design notes are on — the callouts explain each decision. Toggle them off for a clean read.","",6000),600);
}

