import { Store } from './store.js';

/* ==================================================================
   §12 CANVAS — sketch + two signature pads
   ================================================================== */
export function mountCanvases(){
  const d=Store.s.draft;
  setupPad("sketchCanvas","sketch","#0f5d84",3.2);
  setupPad("sigA","sigA","#dbe7e1",2.4);
  setupPad("sigB","sigB","#e8d3a4",2.4);
}
export function setupPad(id, key, colour, width){
  const c=document.getElementById(id); if(!c) return;
  const ctx=c.getContext && c.getContext("2d");
  if(!ctx) return;               // no 2D context (very old browser) — degrade quietly
  ctx.clearRect(0,0,c.width,c.height);
  const saved=Store.s.draft[key];
  if(saved){ const im=new Image(); im.onload=()=>ctx.drawImage(im,0,0,c.width,c.height); im.src=saved; }
  else if(id==="sketchCanvas"){
    // faint guide: a road, so the driver knows what kind of drawing this is
    ctx.strokeStyle="#c8d4de"; ctx.lineWidth=2; ctx.setLineDash([14,12]);
    ctx.beginPath(); ctx.moveTo(0,210); ctx.lineTo(640,210); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle="#2a3644"; ctx.font="15px system-ui";
    ctx.fillText("draw the road and both vehicles", 20, 34);
  }
  if(c.dataset.wired) return;
  c.dataset.wired="1";
  let drawing=false, last=null;
  const pos=e=>{
    const r=c.getBoundingClientRect();
    const p=e.touches?e.touches[0]:e;
    return {x:(p.clientX-r.left)*(c.width/r.width), y:(p.clientY-r.top)*(c.height/r.height)};
  };
  const start=e=>{ e.preventDefault(); drawing=true; last=pos(e);
    ctx.strokeStyle=colour; ctx.lineWidth=width; ctx.lineCap="round"; ctx.lineJoin="round"; };
  const move=e=>{
    if(!drawing) return; e.preventDefault();
    const p=pos(e);
    ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke();
    last=p;
  };
  const end=()=>{
    if(!drawing) return; drawing=false;
    try{ Store.s.draft[key]=c.toDataURL("image/png"); Store.s.lastSaved=Date.now(); Store.save(); }catch(e){}
    if(key!=="sketch"){ const pad=c.closest(".sig-pad"); if(pad) pad.classList.add("signed"); }
  };
  c.addEventListener("mousedown",start); c.addEventListener("touchstart",start,{passive:false});
  window.addEventListener("mousemove",move); c.addEventListener("touchmove",move,{passive:false});
  window.addEventListener("mouseup",end);   c.addEventListener("touchend",end);
}


