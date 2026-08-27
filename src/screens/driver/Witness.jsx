import { I } from '../../core/utils.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { gapShell, textField } from './GapShell.jsx';

/* ---------- witness ---------- */

function Choice({ value, label, current }) {
  const on = current === value;
  return (
    <button className="choice" data-act="set-witness" data-v={value} aria-pressed={String(on)}>
      <span className="cbox round" dangerouslySetInnerHTML={{ __html: on ? I.chkS : '' }} />
      <span>{label}</span>
    </button>
  );
}

export function scrWitness() {
  const d = Store.s.draft;

  const body = (
    <div>
      <div className="grid2" style={{ marginBottom: '16px' }}>
        <Choice value="yes" label="Yes, someone saw it" current={d.witnessPresent === true ? 'yes' : null} />
        <Choice value="no" label="No one" current={d.witnessPresent === false ? 'no' : null} />
      </div>

      {d.witnessPresent === true && (
        <>
          {textField('Their name, a first name is enough', 'witnessName', 'Anything you can get')}
          {textField('A phone number', 'witnessPhone', '+49 …', 'tel')}
          <div className="card-quiet">
            <p className="tiny" style={{ lineHeight: 1.5 }}>
              <b style={{ color: 'var(--ink-2)' }}>A number with no name still works.</b>{' '}
              Get the number first.
            </p>
          </div>
        </>
      )}
    </div>
  );

  return gapShell({
    id: 'witness',
    title: 'Did anyone see it?',
    sub: 'If someone stopped, this is the most valuable thirty seconds of the whole report.',
    body,
    note: dn(
      'Highest value per character in the form',
      "An independent witness is often the difference between a liability split and a clean outcome, and they are under <b>zero obligation</b> to stay. Ten minutes from now they are an unreachable stranger. That is why this is screen one of the optional flow, ahead of photographs and ahead of the other driver's paperwork.",
    ),
  });
}
