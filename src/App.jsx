import { useEffect, useRef } from 'react';
import { useStore } from './core/useStore.js';
import { toEl } from './core/dom.jsx';
import { Store } from './core/store.js';
import { mountCanvases } from './core/canvas.js';
import { renderChrome } from './components/Chrome.jsx';
import { renderDriver } from './screens/driver/index.jsx';
import { renderExport } from './screens/export/index.jsx';
import { renderFleet } from './screens/fleet/index.jsx';
import { renderSystem } from './screens/system/index.jsx';

/** Which pane is on screen. Export is a modal over whichever persona is active. */
function Pane() {
  const s = useStore();
  if (s.exportOpen) return toEl(renderExport());
  if (s.persona === 'driver') return toEl(renderDriver());
  if (s.persona === 'fleet') return toEl(renderFleet());
  return toEl(renderSystem());
}

/**
 * Scroll position survives re-render.
 *
 * React preserves scroll across reconciliation, but the pane's scroll
 * container is replaced when the persona or screen changes. Keyed by view so
 * returning to a screen returns to where the driver was — someone gap-filling
 * on a hard shoulder should never be thrown back to the top.
 */
function useScrollMemory(key) {
  const memo = useRef({});
  useEffect(() => {
    const node = document.querySelector('#root .scroll, #root .desk-body');
    if (!node) return;
    if (memo.current[key] != null) node.scrollTop = memo.current[key];
    const onScroll = () => { memo.current[key] = node.scrollTop; };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [key]);
}

/** The demo harness bar, rendered above the product in its own root. */
export function Chrome() {
  useStore();
  return renderChrome();
}

export function App() {
  const s = useStore();
  const key = `${s.persona}:${s.screen}:${s.fleetTab}:${s.sysTab}:${s.exportOpen}`;

  useScrollMemory(key);

  // The sketch and signature pads are imperative canvas work — React renders
  // the elements, this attaches the drawing behaviour after they exist.
  useEffect(() => { mountCanvases(); });

  // A panel that opens below the fold is a panel the driver does not know is
  // there. Anything that expands in place gets scrolled into view.
  useEffect(() => {
    const panel = document.querySelector('#root .type-picker, #root .frow-editor');
    if (!panel) return;
    const scroller = panel.closest('.scroll');
    if (!scroller) return;
    const gap = panel.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom;
    if (gap > 0) scroller.scrollBy({ top: gap + 16, behavior: 'smooth' });
  }, [s.subScreen, s.editing]);

  return <Pane />;
}
