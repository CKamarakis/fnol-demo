import { dn } from '../../components/DriverShell.jsx';

/* ---------- dismissal ---------- */

const REASONS = [
  ['pothole', 'Pothole or bad road surface'],
  ['kerb', 'Kerb or ramp'],
  ['hard_brake', 'Hard braking'],
  ['load', 'Load shift in the trailer'],
  ['other', 'Something else'],
];

export function scrDismiss() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="scroll">
        <div className="pad" style={{ paddingTop: '22px' }}>
          <h1 className="h1">What was it, actually?</h1>
          <p className="sub">
            One tap. No claim is created. This tunes the detection threshold so it stops
            bothering you.
          </p>
          <div className="sp20" />

          {REASONS.map(([value, label]) => (
            <button key={value} className="choice" data-act="dismiss-reason" data-v={value}>
              <span className="cbox round" />
              <span>{label}</span>
            </button>
          ))}

          {dn(
            'Tap 2 of 2',
            'Dismissal completes here. No confirmation dialog, no “are you sure”, no claim record, no reserve, no notification to the fleet manager. A <code>false_positive</code> event is written with the reason chip — watch it appear in the System pane. That event is the training data for the detection threshold; without it, false positives never get better.',
          )}
        </div>
      </div>

      <div className="dock">
        <button className="btn btn-ghost" data-act="back-s0">Back</button>
      </div>
    </div>
  );
}
