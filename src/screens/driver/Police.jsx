import { I } from '../../core/utils.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { Note, YesNo } from '../../components/Choice.jsx';
import { gapShell, textField } from './GapsHub.jsx';

/* ---------- police ---------- */
export function scrPolice() {
  const d = Store.s.draft;
  const theft = Store.s.scenario === 'theft';

  const body = (
    <div>
      <YesNo act="set-police" value={d.policeAttended} style={{ marginBottom: '14px' }} />

      {d.policeAttended === true && textField(
        theft ? 'Crime reference (Aktenzeichen)' : 'Reference number, if they gave you one',
        'policeRef',
        'e.g. 2026/074/0084217',
      )}

      {theft && d.policeAttended !== true && (
        <Note icon={I.warn} tone="warn" style={{ borderColor: '#e8d3a4' }}>
          <b style={{ color: 'var(--ink-2)' }}>For a theft this is nearly blocking.</b> No German
          insurer will progress a theft claim without a police report. We still don&rsquo;t block on
          it — you may be on a motorway at 4 a.m. — but we will chase this one hard.
        </Note>
      )}
    </div>
  );

  return gapShell({
    id: 'police',
    title: theft ? 'Have you reported it stolen?' : 'Did the police attend?',
    sub: theft
      ? 'This is the one thing a theft claim cannot proceed without.'
      : 'One question while the officer is still here.',
    body,
    note: dn(
      'Hours, not minutes',
      'A police reference is retrievable next week with a phone call, so it sits <b>below</b> the witness and the plate. It is above cargo and the other insurer because the officer is standing here <i>now</i> and it costs one question. Theft inverts this: no report, no claim, so it moves to the top for that scenario.',
    ),
  });
}
