import { I } from '../../core/utils.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { gapShell, textField } from './GapsHub.jsx';

/* ---------- other vehicle · plate first ---------- */
export function scrOtherVehicle() {
  const d = Store.s.draft;
  const expanded = Store.s.subScreen === 'otherdetail';

  const body = (
    <div>
      <label className="lbl" style={{ fontSize: '15px', color: 'var(--ink)' }}>
        The other vehicle&rsquo;s plate
      </label>

      <div className="inp-wrap has-mic">
        <input
          className="inp plate-inp"
          data-field="otherPlate"
          defaultValue={d.otherPlate || ''}
          placeholder="M-XY 1234"
          autoComplete="off"
          autoCapitalize="characters"
        />
        <button className="mic" data-act="voice" data-v="otherPlate"
          dangerouslySetInnerHTML={{ __html: I.mic }} />
      </div>

      <div className="card-quiet" style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{ color: 'var(--accent)', flex: 'none', marginTop: '2px' }}
            dangerouslySetInnerHTML={{ __html: I.info }} />
          <p className="tiny" style={{ lineHeight: 1.5, fontSize: '13.5px' }}>
            <b style={{ color: 'var(--ink)' }}>Just the plate is enough. We&rsquo;ll chase the rest.</b>
          </p>
        </div>
      </div>

      <div className="sp20" />
      <button className="btn btn-ghost" data-act="toggle-otherdetail">
        {expanded ? 'Hide the rest' : "They're standing here — add more (optional)"}
      </button>

      {expanded && (
        <>
          <div className="sp16" />
          {textField('Make and colour', 'otherMake', 'Silver Sprinter')}
          {textField('Their name', 'otherDriver', '')}
          {textField('Their phone', 'otherPhone', '', 'tel')}
        </>
      )}
    </div>
  );

  return gapShell({
    id: 'otherPlate',
    title: 'The other vehicle',
    sub: 'One field. Everything else about them can be found from it.',
    body,
    note: dn(
      'Plate-first, and everything else demoted',
      'A German plate resolves to the keeper and, through the central register (Zentralruf der Autoversicherer), to the insurer. So the plate is <b>load-bearing</b> and the insurer name is <b>derivable</b> — which is exactly why the insurer field sits at the bottom of the perishable list and not next to this one. Asking a shaken driver for a policy number while the other party is walking to their car costs you the plate.',
    ),
  });
}
