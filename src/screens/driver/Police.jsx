import { I } from '../../core/utils.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { Note, YesNo } from '../../components/Choice.jsx';
import { gapShell, textField } from './GapShell.jsx';

/* ---------- police ---------- */
export function scrPolice() {
  const d = Store.s.draft;
  const theft = Store.s.scenario === 'theft';

  const body = (
    <div>
      <YesNo act="set-police" value={d.policeAttended} style={{ marginBottom: '14px' }} />

      {/* For a theft the reference field is always visible. A driver who
          phoned it in an hour ago has the Aktenzeichen in their hand, and
          gating the field behind the yes/no makes them answer a question they
          have already answered by having the number. Everywhere else the
          officer either gave a reference or did not, so it stays behind the
          yes — there is nothing to type until someone attended. */}
      {(theft || d.policeAttended === true) && textField(
        theft ? 'Crime reference (Aktenzeichen)' : 'Reference number, if they gave you one',
        'policeRef',
        'e.g. 2026/074/0084217',
      )}

      {theft && d.policeAttended !== true && (
        <Note icon={I.warn} tone="warn" style={{ borderColor: '#e8d3a4' }}>
          <b style={{ color: 'var(--ink-2)' }}>A theft claim needs this.</b> No German insurer
          will progress one without a police report. You can still continue without it, and add
          the number whenever you have it.
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
