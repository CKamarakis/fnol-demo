import { I } from '../../core/utils.js';
import { PHOTO_SLOTS, SCENARIOS, T } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { gapShell, textField } from './GapShell.jsx';
import { svgSilhouette } from '../../components/svg.js';

/* ---------- guided photo set ---------- */

function PhotoSlot({ slotKey, index }) {
  const st = Store.s.draft.photos[slotKey];
  const meta = PHOTO_SLOTS[slotKey] || { n: index + 1, label: slotKey, sil: 'wide' };
  const shot = !!(st && !st.skipped);
  const skipped = !!(st && st.skipped);
  // A thumbnail survives only the session that took it — Store.save strips the
  // pixels. Reopened later the slot still reads as captured, via the silhouette.
  const thumb = shot && st.thumb ? st.thumb.url : null;
  const extra = (shot && st.extra) || [];
  const total = shot ? 1 + extra.length : 0;

  return (
    <div className="pslot-group">
      <button
        className={`pslot${shot ? ' shot' : ''}${skipped ? ' skipped' : ''}`}
        data-act="shoot"
        data-v={slotKey}
        aria-label={shot ? `Retake: ${meta.label}` : meta.label}
      >
        {thumb
          ? <img className="pthumb" src={thumb} alt="" />
          : <span dangerouslySetInnerHTML={{ __html: svgSilhouette(meta.sil, shot) }} />}
        <span className="pflash" />
        <span className="pnum" dangerouslySetInnerHTML={{ __html: shot ? I.chkS : String(meta.n) }} />
        {/* The count is on the frame it belongs to, not in a separate legend:
            a driver checking they got the whole wing needs it where they look. */}
        {total > 1 && <span className="pcount">{total}</span>}
        <span className="plabel">{shot ? 'Tap to retake' : meta.label}</span>
      </button>

      {/* Extras are thumbnails under their own slot, so it stays obvious which
          named thing they belong to. Tapping one retakes nothing — they are a
          record, and a mis-tap that destroys a picture is worse than a tap
          that does nothing. */}
      {extra.length > 0 && (
        <div className="pextra">
          {extra.map((e, i) => (
            <span key={i} className="pextra-item">
              {e.thumb
                ? <img src={e.thumb.url} alt="" />
                : <span className="pextra-none" dangerouslySetInnerHTML={{ __html: I.cam }} />}
            </span>
          ))}
        </div>
      )}

      {/* Only once there is something to add to. An "add another" on an empty
          slot competes with the slot itself for the same first tap. */}
      {shot && (
        <button className="padd" data-act="add-photo" data-v={slotKey}>
          + Add another
        </button>
      )}
    </div>
  );
}

const SEQUENCE_NOTE =
  '&ldquo;Attach photos&rdquo; produces four pictures of the same dent. Named slots with ' +
  'silhouettes produce the <b>wide shot</b> that establishes position and the <b>signage shot</b> ' +
  'that establishes right of way &mdash; the two an adjuster actually needs and the two a driver ' +
  'never thinks to take. Each slot is independently skippable, and a skipped slot is recorded as ' +
  'a <i>known</i> gap rather than a silent one.';

const NOT_REQUIRED_NOTE =
  '<b>No photograph is required, and none is owed.</b> ACORD 2 has no photo field: the FNOL is a ' +
  '<i>notification</i>, and images are claims-handling evidence that arrives later. No European ' +
  'jurisdiction obliges a driver to photograph a scene, and the record that settles a disputed ' +
  'damage figure is the assessor&rsquo;s &mdash; in Germany the <i>Sachverst&auml;ndiger</i> ' +
  '&mdash; not a phone on a hard shoulder. So this screen asks by the only honest warrant it has: ' +
  '<b>position and debris are gone the moment the truck moves</b>, and no assessor arriving on ' +
  'Tuesday can recover them. That warrant covers the wide shot. It does not cover a damage ' +
  'close-up, which is why skipping is one tap and the counter never scolds. The photographs are ' +
  'kept as the driver&rsquo;s own record of the incident, not as a debt to the insurer.';

export function scrPhotos() {
  const s = Store.s;
  const d = s.draft;
  const sc = SCENARIOS[s.scenario];
  const slots = sc.photos || [];
  const done = slots.filter(k => d.photos[k] && !d.photos[k].skipped).length;
  const extras = slots.reduce((n, k) => {
    const p = d.photos[k];
    return n + (p && !p.skipped && p.extra ? p.extra.length : 0);
  }, 0);

  const body = (
    <div>
      <div className="photo-grid">
        {slots.map((k, i) => <PhotoSlot key={k} slotKey={k} index={i} />)}
      </div>

      {/* Counts the named things covered, not the pictures taken: four frames
          of one wing is still one slot, and a driver reading "4 captured" over
          two slots would think they were finished. Extras are counted on their
          own frame instead. "Skip the rest" used to sit here — it marked the
          rest skipped without leaving the screen, so it read as inert, and the
          dock already leaves with the same gaps recorded. */}
      <div style={{ marginTop: '12px' }}>
        <span className="tiny">{done} of {slots.length} covered{extras > 0 ? ` · ${extras + done} photos` : ''}</span>
      </div>

      <div className="card-quiet" style={{ marginTop: '14px' }}>
        <p className="tiny" style={{ lineHeight: 1.5 }}>
          {T('gPhotoFrame')}
          <b style={{ color: 'var(--ink-2)' }}> Skipping one is fine.</b>
        </p>
      </div>

      {/* ACORD 2 · DESCRIBE DAMAGE and WHERE CAN VEH BE SEEN. Both belong on
          this screen rather than in the blocking six: the driver is already
          looking at the damage, and an appraiser needs somewhere to go before
          they need a paragraph about it. Typed, not tapped — no list of damage
          types survives contact with a real truck.

          "Where will the truck be?" is NOT a second ask for the incident
          location — question 3 captured where it happened. This is where the
          vehicle can be inspected once it has moved, which is the fact that
          decides whether an inspection is booked or wasted. The label says so;
          without it, it reads as a duplicate and the driver retypes the
          roadside. */}
      {/* "What is damaged?" was here, and it is gone.

          ACORD 3 · 37 DESCRIBE DAMAGE is a real field, which is normally the
          whole argument for keeping something. It lost anyway: the driver is
          standing in front of the damage photographing it, and asking them to
          type what the camera is recording is the weakest field in the flow.
          The facts it held are already carried — the incident type and
          `alsoDamaged` from question 4, the point of impact from the accident
          statement, and the frames themselves. A damage DESCRIPTION is the
          assessor's to write; in Germany that is the Sachverständiger, and
          this flow already refuses to pretend a phone on a hard shoulder
          replaces them. Recorded in ACORD_OMITTED.

          "Where can it be inspected" stays. It is the one fact here that
          nothing else captures: question 3 recorded where it HAPPENED, and
          this is where the vehicle will BE once it moves, which is what
          decides whether an inspection is booked or wasted. Not asked for a
          theft — there is no vehicle to inspect. */}
      {sc.type !== 'theft' && (
        <>
          <div className="sp16" />
          {textField(T('gPhotoInspect'), 'whereSeen',
            'Depot Berlin-Süd, or the hard shoulder until recovery')}
        </>
      )}

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
                syncs first, it&rsquo;s a few kilobytes. Photos follow.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Named slots vary by scenario — glass has two, a collision five. The old
  // copy said "Five" on every one of them.
  return gapShell({
    id: 'photos',
    title: T('gPhotoTitle'),
    sub: `Tap a slot to open the camera. ${slots.length} named shots, none of them required.`,
    body,
    note: (
      <>
        {dn('A named sequence beats an upload button', SEQUENCE_NOTE)}
        {dn('Not on the form, and not the driver’s job', NOT_REQUIRED_NOTE)}
      </>
    ),
  });
}
