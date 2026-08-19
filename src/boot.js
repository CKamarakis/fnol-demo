import { $, toast } from './core/dom.js';
import { LS_KEY, Store } from './core/store.js';
import { render } from './core/render.js';

/* ==================================================================
   §14 BOOT
   ================================================================== */
/* Subscribe the renderer before loading state, so the first emit paints. */
Store.sub(render);
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

render();

// A one-time orientation for whoever opens this cold.
if(!localStorage.getItem(LS_KEY+".seen")){
  try{ localStorage.setItem(LS_KEY+".seen","1"); }catch(e){}
  setTimeout(()=>toast("Start on the Driver persona. Turn on Design notes to read the reasoning inline.","",6000),600);
}

