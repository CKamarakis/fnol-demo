import { I } from '../../core/utils.js';
import { PHOTO_SLOTS, SCENARIOS } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { gapShell } from './GapsHub.jsx';
import { svgSilhouette } from '../../components/svg.js';

/* ---------- guided photo set ---------- */

function PhotoSlot({ slotKey, index }) {
  const st = Store.s.draft.photos[slotKey];
  const meta = PHOTO_SLOTS[slotKey] || { n: index + 1, label: slotKey, sil: 'wide' };
  const shot = !!(st && !st.skipped);
  const skipped = !!(st && st.skipped);

  return (
    <button
      className={`pslot${shot ? ' shot' : ''}${skipped ? ' skipped' : ''}`}
      data-act="shoot"
      data-v={slotKey}
    >
      <span dangerouslySetInnerHTML={{ __html: svgSilhouette(meta.sil, shot) }} />
      <span className="pflash" />
      <span className="pnum" dangerouslySetInnerHTML={{ __html: shot ? I.chkS : String(meta.n) }} />
      <span className="plabel">{meta.label}</span>
    </button>
  );
}

const SEQUENCE_NOTE =
  '&ldquo;Attach photos&rdquo; produces four pictures of the same dent. Named slots with ' +
  'silhouettes produce the <b>wide shot</b> that establishes position and the <b>signage shot</b> ' +
  'that establishes right of way &mdash; the two an adjuster actually needs and the two a driver ' +
  'never thinks to take. Each slot is independently skippable, and a skipped slot is recorded as ' +
  'a <i>known</i> gap rather than a silent one.';

export function scrPhotos() {
  const s = Store.s;
  const d = s.draft;
  const slots = SCENARIOS[s.scenario].photos || [];
  const done = slots.filter(k => d.photos[k] && !d.photos[k].skipped).length;

  const body = (
    <div>
      <div className="photo-grid">
        {slots.map((k, i) => <PhotoSlot key={k} slotKey={k} index={i} />)}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginTop: '12px',
      }}>
        <span className="tiny">{done} of {slots.length} captured</span>
        <button className="btn btn-sm btn-ghost" data-act="skip-remaining-photos">
          Skip the rest
        </button>
      </div>

      <div className="card-quiet" style={{ marginTop: '14px' }}>
        <p className="tiny" style={{ lineHeight: 1.5 }}>
          Tap a slot to take that shot. The silhouette shows what to frame.{' '}
          <b style={{ color: 'var(--ink-2)' }}>Skipping a slot is fine and is logged</b> — a
          skipped slot is a known gap, an unnamed pile of photos is not.
        </p>
      </div>

      {s.fail.offline && (
        <>
          <div className="sp12" />
          <div className="card-quiet" style={{ borderColor: '#e8d3a4' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span
                style={{ color: 'var(--warn)', flex: 'none', marginTop: '2px' }}
                dangerouslySetInnerHTML={{ __html: I.offline }}
              />
              <p className="tiny" style={{ lineHeight: 1.5 }}>
                Photos are held on the phone and queued{' '}
                <b style={{ color: 'var(--ink-2)' }}>separately from the report</b>. The report
                syncs first — it&rsquo;s a few kilobytes. Photos follow.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return gapShell({
    id: 'photos',
    title: 'Photographs',
    sub: 'Five named shots, not “upload photos”. The order matters.',
    body,
    note: dn('A named sequence beats an upload button', SEQUENCE_NOTE),
  });
}
