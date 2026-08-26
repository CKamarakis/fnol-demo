import { I, nowHM } from '../core/utils.js';
import { STR, T } from '../data/domain.js';
import { Store, TRANSIENT } from '../core/store.js';

/* ==================================================================
   §7 DRIVER FLOW — the shell around every driver screen
   ================================================================== */

/** A design-note callout. Carries the product reasoning, not decoration. */
export function dn(tag, html) {
  return (
    <div className="dn">
      <span className="dn-tag">{tag}</span>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/**
 * The 90-second timer, running from the cold open and stopped when the
 * reference is issued. A demo instrument — a real driver never sees it. It
 * exists to make one argument visible: the entire blocking path costs a
 * minute and a half, so there is no case for a validation wall.
 */
export function timerRail() {
  const s = Store.s;
  if (!s.startedAt) return null;

  const end = s.stoppedAt || Date.now();
  const secs = (end - s.startedAt) / 1000;
  const pct = Math.min(100, (secs / 90) * 100);
  const stopped = !!s.stoppedAt;

  // Wall-clock, so an idle demo window drifts into the thousands and the
  // number stops meaning anything. Past 3 min we say so instead.
  const idle = !stopped && secs > 180;
  const barColor = secs > 90 ? '#EE6B54' : secs > 65 ? '#9a6410' : '#1f7a5a';

  return (
    <div
      className={`timer-rail${stopped ? ' stopped' : ''}${idle ? ' idle' : ''}`}
      title="Demo instrument. Times the blocking path — cold open to reference issued — against a 90-second target. Not shown to a real driver."
    >
      <span className="timer-tag">DEMO</span>
      <span className="timer-lbl">{stopped ? 'blocking path took' : T('blockPath')}</span>

      {idle
        ? <span className="timer-val idle-val">paused — window left open</span>
        : <span className={`timer-val ${secs > 90 ? 'over' : secs > 65 ? 'warn' : ''}`}>
            {secs.toFixed(1)}s
          </span>}

      {idle
        ? <span className="timer-bar" />
        : <div className="timer-bar"><i style={{ width: `${pct}%`, background: barColor }} /></div>}

      <span className="timer-lbl">{stopped ? 'stopped' : idle ? '' : '/ 90s target'}</span>
    </div>
  );
}

/** Language chooser — a dropdown, so it stays one control as languages grow. */
export function langSelect(cur) {
  return (
    <div className="lang-wrap">
      <select className="lang-sel" aria-label="Language" data-act="set-lang-sel" defaultValue={cur}>
        {/* Two letters only — "En", "De". The full language name doubled the
            control's width to say what the code already says. */}
        {Object.keys(STR).map(k => (
          <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>
        ))}
      </select>
      <span className="lang-chev" dangerouslySetInnerHTML={{ __html: I.chevD }} />
    </div>
  );
}

/**
 * Back bar — a mistap must always be correctable.
 *
 * Hidden on the cold open, which has nothing behind it. TRANSIENT screens
 * push nothing onto the stack, so 112 names its own origin (`emgFrom`)
 * instead: the driver who tapped "someone is hurt" by accident goes back the
 * same way they go back anywhere else, rather than learning a second gesture
 * on the one screen where they are least able to.
 *
 * The safety instruction still owns the screen. Back is a chevron in a bar
 * above it, the same size and weight as on every other screen — it does not
 * compete with 112, which is the full-width primary in the dock.
 */
/* Each label names the screen the driver lands back on, so it has to match
   that screen's own title. "The six questions" described the rule rather than
   the page, and the page is called "Verify the tracker's data". */
export const SCREEN_TITLES = {
  s0: 'the incident', s0det: 'the details', dismiss: 'dismiss', emg: 'emergency',
  s1: "the tracker's data", s2: 'your reference', gaps: 'what disappears',
  witness: 'the witness', otherv: 'the other vehicle', photos: 'photos', eas: 'circumstances',
  police: 'police', cargo: 'cargo', otherins: 'their insurer', done: 'finished',
};

/** Only the cold open has nothing behind it. */
export const NO_BACK = ['s0'];

export function navBar() {
  const s = Store.s;
  if (NO_BACK.includes(s.screen)) return null;

  // 112 is passed through, not visited, so it pushes nothing and pops nothing.
  // Its own back target is the screen that routed to it.
  const prev = TRANSIENT.includes(s.screen)
    ? s.emgFrom
    : s.navStack[s.navStack.length - 1];
  if (!prev) return null;

  const label = SCREEN_TITLES[prev] || 'the previous screen';

  return (
    <div className="nav-bar">
      <button className="nav-back" data-act="nav-back" aria-label={`Go back to ${label}`}>
        <span className="nav-chev" dangerouslySetInnerHTML={{ __html: I.chevL }} />
        {/* Named as the action, not just the destination: a bare "Incident"
            beside a chevron reads as a heading for the screen you are on. */}
        <span className="nav-lbl">Back to {label}</span>
      </button>
      {/* No "Saved" here. It appeared on every screen from the first keystroke
          and never changed again, so it stopped being information. The
          reassurance still fires where it is actually earned — the gaps hub,
          where the driver is deciding whether to walk away mid-report. */}
    </div>
  );
}

/** The persistent 112 rail — above the fold on EVERY driver screen. */
export function emergencyRail() {
  return (
    <div className="emg-rail dn-anchor">
      <button className="emg-btn" data-act="call112">
        <span dangerouslySetInnerHTML={{ __html: I.phoneSolid }} />
        {T('emgCta')}
      </button>
    </div>
  );
}

const NO_SIGNAL_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a6410" stroke-width="2.4" stroke-linecap="round"><path d="m2 2 20 20"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M12 20h.01"/></svg>';

export function statusBar() {
  const off = Store.s.fail.offline;
  return (
    <div className="status-bar">
      <span>{nowHM()}</span>
      <span className="sb-right">
        <span dangerouslySetInnerHTML={{ __html: off ? NO_SIGNAL_ICON : I.wifi }} />
        <span dangerouslySetInnerHTML={{ __html: I.batt }} />
      </span>
    </div>
  );
}

/**
 * Saved affordance — "nothing is ever lost", so a shaken driver is not
 * afraid to close the app mid-report.
 */
export function savedChip() {
  if (!Store.s.lastSaved) return null;
  return (
    <div className="chip ok" style={{ fontSize: '10.5px' }}>
      <span dangerouslySetInnerHTML={{ __html: I.save }} />
      {T('saved')}
    </div>
  );
}

export function offlineBanner() {
  if (!Store.s.fail.offline) return null;
  return (
    <div className="banner banner-offline">
      <span dangerouslySetInnerHTML={{ __html: I.offline }} />
      <div>
        <div>No signal — you can keep going.</div>
        <div style={{ fontWeight: 500, opacity: 0.85, marginTop: '2px' }}>
          Everything is saved on the phone and sent when you&rsquo;re back in coverage.
        </div>
      </div>
    </div>
  );
}
