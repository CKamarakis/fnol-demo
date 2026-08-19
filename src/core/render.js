import { $ } from './dom.js';
import { Store } from './store.js';
import { mountCanvases } from './canvas.js';
import { renderChrome } from '../components/Chrome.js';
import { renderDriver } from '../screens/driver/index.js';
import { renderExport } from '../screens/export/index.js';
import { renderFleet } from '../screens/fleet/index.js';
import { renderSystem } from '../screens/system/index.js';

/* ==================================================================
   §11 ROOT RENDER
   ================================================================== */
export let scrollMemo={};
export function render(){
  const s=Store.s;
  renderChrome();
  const root=$("#root");

  // remember scroll position so re-renders don't jump the driver's screen
  const sc=root.querySelector(".scroll")||root.querySelector(".desk-body");
  const memoKey=s.persona+":"+s.screen+":"+s.fleetTab+":"+s.sysTab;
  if(sc) scrollMemo[memoKey]=sc.scrollTop;

  root.innerHTML="";
  let view;
  if(s.exportOpen) view=renderExport();
  else if(s.persona==="driver") view=renderDriver();
  else if(s.persona==="fleet")  view=renderFleet();
  else                          view=renderSystem();
  root.append(view);

  const nsc=root.querySelector(".scroll")||root.querySelector(".desk-body");
  if(nsc && scrollMemo[memoKey]!=null) nsc.scrollTop=scrollMemo[memoKey];

  mountCanvases();
}
