/* utils, icons and the toast helper. Element construction lives in dom.jsx. */
export const esc = s => String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
export const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{
      const r=Math.random()*16|0; return (c==="x"?r:(r&0x3|0x8)).toString(16);
    }));
export const pad2 = n => String(n).padStart(2,"0");
export const nowHM = () => { const d=new Date(); return pad2(d.getHours())+":"+pad2(d.getMinutes()); };
export const clockT = () => { const d=new Date(); return pad2(d.getHours())+":"+pad2(d.getMinutes())+":"+pad2(d.getSeconds()); };
export const sleep = ms => new Promise(r=>setTimeout(r,ms));
export const rnd = (a,b)=> Math.floor(a+Math.random()*(b-a+1));

/* icons — every graphic in this file is hand-authored inline SVG. No image requests. */
export const I = {
  phone:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  chk:    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  chkS:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  chev:   '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  chevD:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  chevL:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  back:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  truck:  '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 17V5a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1"/><path d="M14 9h4l3 3v4a1 1 0 0 1-1 1h-1"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/></svg>',
  clock:  '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 1.9"/></svg>',
  pin:    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="2.8"/></svg>',
  crash:  '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-3 8h5l-3 8"/><path d="M4.5 8 2 6.5M6 4 4.5 2M20 8l2.2-1.4M18.5 4 20 2"/></svg>',
  heart:  '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5.5a5 5 0 0 0-7 .3l-.1.1-.1-.1a5 5 0 1 0-7 7.1l7.1 7.1 7.1-7.1a5 5 0 0 0 0-7.4z"/></svg>',
  wheel:  '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M4.6 16.5 9.4 13.6M19.4 16.5 14.6 13.6"/></svg>',
  cam:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.7-2.5h6.6L17 7h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.6"/></svg>',
  user:   '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
  plate:  '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M7 11v2M11 11v2M15 11v2M18.5 11v2"/></svg>',
  shield: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-3.4 8-9.5V5.5L12 2.5 4 5.5V12.5C4 18.6 12 22 12 22z"/></svg>',
  police: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5.5v6C4 17.5 12 21.5 12 21.5S20 17.5 20 11.5v-6z"/><path d="M9 11.5h6M12 8.5v6"/></svg>',
  box:    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
  pen:    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3.5a2.1 2.1 0 0 1 3 3L7.5 19 3 20.5 4.5 16z"/></svg>',
  copy:   '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  mic:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  warn:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  info:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>',
  offline:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M8.5 16.4a5 5 0 0 1 7 0M5 13a10 10 0 0 1 3.2-2.1M19 13a10 10 0 0 0-4.6-2.6M2 8.8A16 16 0 0 1 7 6M22 8.8a16 16 0 0 0-9.6-3.7"/><path d="M12 20h.01"/></svg>',
  wifi:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.8a16 16 0 0 1 20 0M5 13a11 11 0 0 1 14 0M8.5 16.9a6 6 0 0 1 7 0M12 20h.01"/></svg>',
  batt:   '<svg width="21" height="12" viewBox="0 0 26 13" fill="none" stroke="currentColor" stroke-width="1.4"><rect x=".8" y=".8" width="20" height="11.4" rx="3"/><rect x="2.6" y="2.6" width="15" height="7.8" rx="1.6" fill="currentColor" stroke="none"/><path d="M23 4.6v3.8" stroke-width="2.4" stroke-linecap="round"/></svg>',
  save:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  merge:  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v6a6 6 0 0 0 6 6h6"/><path d="m15 12 3 3-3 3"/><path d="M18 3v3"/></svg>',
  bolt:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  globe:  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/></svg>',
  eye:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  x:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
};

/* Toast lives outside the React tree — it is transient, fire-and-forget,
   and triggered from action handlers rather than from render. Plain DOM. */
export function toast(msg,kind,ms){
  const host=document.querySelector("#toast");
  if(!host) return;
  const t=document.createElement("div");
  t.className="toast "+(kind||"");
  t.innerHTML=(kind==="ok"?I.chkS:kind==="err"||kind==="warn"?I.warn:I.info)
    +"<span>"+esc(msg)+"</span>";
  host.append(t);
  setTimeout(()=>{
    t.style.transition="opacity .3s"; t.style.opacity="0";
    setTimeout(()=>t.remove(),320);
  }, ms||2600);
}
