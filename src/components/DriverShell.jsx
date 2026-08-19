import { I, nowHM } from '../core/utils.js';
import { STR, T } from '../data/domain.js';
import { Store } from '../core/store.js';

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
        {Object.keys(STR).map(k => (
          <option key={k} value={k}>{`${k.toUpperCase()} · ${STR[k].lang}`}</option>
        ))}
      </select>
      <span className="lang-chev" dangerouslySetInnerHTML={{ __html: I.chevD }} />
    </div>
  );
}

/**
 * Back bar — a mistap must always be correctable.
 *
 * Hidden in exactly two places: the cold open, where there is nothing behind
 * it, and the 112 screen, where a Back button above a safety instruction is
 * the wrong affordance — it invites the driver to leave.
 */
export const SCREEN_TITLES = {
  s0: 'Incident', s0det: 'Details', dismiss: 'Dismiss', emg: 'Emergency',
  s1: 'The six questions', s2: 'Your reference', gaps: 'What disappears',
  witness: 'Witness', otherv: 'Other vehicle', photos: 'Photos', eas: 'Circumstances',
  police: 'Police', cargo: 'Cargo', otherins: 'Their insurer', done: 'Finished',
};

export const NO_BACK = ['s0', 'emg'];

export function navBar() {
  const s = Store.s;
  if (NO_BACK.includes(s.screen)) return null;
  if (!s.navStack.length) return null;

  const label = SCREEN_TITLES[s.navStack[s.navStack.length - 1]] || 'Back';

  return (
    <div className="nav-bar">
      <button className="nav-back" data-act="nav-back" aria-label={`Go back to ${label}`}>
        <span className="nav-chev" dangerouslySetInnerHTML={{ __html: I.chevL }} />
        <span className="nav-lbl">{label}</span>
      </button>
      <span className="nav-saved">{s.lastSaved ? T('saved') : ''}</span>
    </div>
  );
}

/** The persistent 112 rail — above the fold on EVERY driver screen. */
export function emergencyRail() {
  return (
    <div className="emg-rail dn-anchor">
      <button className="emg-btn" data-act="call112">
        <span dangerouslySetInnerHTML={{ __html: I.phone }} />
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
