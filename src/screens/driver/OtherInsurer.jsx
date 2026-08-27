import { I } from '../../core/utils.js';
import { dn } from '../../components/DriverShell.jsx';
import { Store } from '../../core/store.js';
import { Choice } from '../../components/Choice.jsx';
import { gapShell, textField } from './GapShell.jsx';

/* ---------- other insurer — deliberately last ---------- */
export function scrOtherInsurer() {
  const d = Store.s.draft;

  const body = (
    <div>
      {/* ACORD 2 · OTHER VEH/PROP INS? — a yes/no of its own, above the
          details. "Uninsured" is a different claim: it routes to the national
          guarantee fund rather than to the other insurer, and a blank policy
          field cannot say whether nobody is insured or nobody looked. */}
      <p className="lbl">Are they insured, as far as you can tell?</p>
      <div className="grid2" style={{ marginBottom: '14px' }}>
        <Choice act="set-other-insured" value="yes" label="Yes"
          selected={d.otherInsured === true} />
        <Choice act="set-other-insured" value="no" label="Not sure"
          selected={d.otherInsured === false} />
      </div>

      {textField('Their insurer, if you can see the card', 'otherInsurer', 'HUK-Coburg, Allianz…')}
      {textField('Policy number', 'otherPolicy', '')}
    </div>
  );

  return gapShell({
    id: 'otherIns',
    title: 'Their insurance',
    sub: 'Only if the card is in front of you. Skipping is expected here.',
    body,
    note: dn(
      'The field every FNOL form puts near the top',
      'Insurer and policy number <i>feel</i> essential, which is why they usually appear on page one. They are the <b>least</b> perishable thing in the entire report: derivable from the plate, chaseable for weeks. Putting them early costs you the witness. This is the clearest example of what perishability ordering actually changes.',
    ),
  });
}
