import { I } from '../../core/utils.js';
import { T } from '../../data/domain.js';
import { dn } from '../../components/DriverShell.jsx';

/* ---------- INJURY SAFETY ROUTE — before ANY data collection ---------- */

const WARNING_ICON = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';

export function scrEmergency() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="scroll">
        <div className="pad" style={{ paddingTop: '26px' }}>
          {/* Icon sits on the heading's baseline rather than in a chip above
              it — one line reads as a single statement, and the chip was
              adding weight to a screen that should feel calm. */}
          <h1 className="h1 emg-head">
            <span className="emg-head-ic" dangerouslySetInnerHTML={{ __html: WARNING_ICON }} />
            {T('emgTitle')}
          </h1>
          <p className="sub" style={{ fontSize: '17px', marginTop: '10px' }}>{T('emgBody')}</p>
          <div className="sp20" />

          <div className="card" style={{ borderColor: '#e0a89c', background: 'var(--danger-soft)' }}>
            <div style={{ fontSize: '13px', color: 'var(--danger-deep)', fontWeight: 650 }}>
              Germany · Europe-wide
            </div>
            <div style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '.04em', marginTop: '2px' }}>
              112
            </div>
            <p className="tiny" style={{ marginTop: '6px' }}>
              Works from any mobile, any network, without a SIM.
            </p>
          </div>

          {dn(
            'The rule this screen enforces',
            '<b>We never ask a claims question ahead of a safety one.</b> Answering “someone is hurt” routes here <i>before</i> any field is collected — not to a form with an injury section near the top. There is no Skip on this screen and no field on it. The claim is still open behind it; nothing entered is lost.',
          )}
        </div>
      </div>

      <div className="dock">
        <button className="btn btn-danger btn-lg" data-act="call112">
          <span dangerouslySetInnerHTML={{ __html: I.phone }} />
          {T('call112')}
        </button>
        <button className="btn btn-secondary" data-act="emg-continue">{T('emgCalled')}</button>
        <button className="btn btn-quiet" data-act="emg-continue">{T('emgNoNeed')}</button>
      </div>
    </div>
  );
}
