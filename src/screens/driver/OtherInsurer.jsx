import { I } from '../../core/utils.js';
import { dn } from '../../components/DriverShell.jsx';
import { Note } from '../../components/Choice.jsx';
import { gapShell, textField } from './GapsHub.jsx';

/* ---------- other insurer — deliberately last ---------- */
export function scrOtherInsurer() {
  const body = (
    <div>
      {textField('Their insurer, if you can see the card', 'otherInsurer', 'HUK-Coburg, Allianz…')}
      {textField('Policy number', 'otherPolicy', '')}
      <Note>
        Genuinely optional. We can get this from the plate through the central register.{' '}
        <b style={{ color: 'var(--ink-2)' }}>Skip it without a second thought.</b>
      </Note>
    </div>
  );

  return gapShell({
    id: 'otherIns',
    title: 'Their insurance',
    sub: 'Last on the list on purpose.',
    body,
    note: dn(
      'The field every FNOL form puts near the top',
      'Insurer and policy number <i>feel</i> essential, which is why they usually appear on page one. They are the <b>least</b> perishable thing in the entire report: derivable from the plate, chaseable for weeks. Putting them early costs you the witness. This is the clearest example of what perishability ordering actually changes.',
    ),
  });
}
