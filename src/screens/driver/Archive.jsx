import { I } from '../../core/utils.js';
import { PHOTO_SLOTS, SCENARIOS } from '../../data/domain.js';
import { Store } from '../../core/store.js';
import { dn } from '../../components/DriverShell.jsx';
import { svgSilhouette } from '../../components/svg.js';
// The same option tuples and the same summary the questions used, so the
// driver's copy cannot drift out of step with what they were shown.
import { SEVERITY_OPTIONS, WHO_HURT_OPTIONS, typeSummary } from './S1Tier1.jsx';

/* ---------- the driver's own copy ----------------------------------------
   Everything else in this flow moves information away from the driver: to the
   handler, the fleet, the queue. Nothing gave any of it back. A driver who
   photographs a scene at 06:40 and hands it to an insurer has no record of
   what they sent, which is the position that makes people photograph the
   scene twice — once for the app, once for themselves.
   -------------------------------------------------------------------------- */

const ARCHIVE_NOTE =
  'The FNOL is a notification, and ACORD 2 has no photo field &mdash; so the images on this ' +
  'screen were never owed to us. Treating them as the <b>driver&rsquo;s record</b> rather than ' +
  'the insurer&rsquo;s evidence is what makes asking for them honest: the driver keeps a copy of ' +
  'what they sent and what they skipped, and the skips are named rather than hidden. It also ' +
  'removes the reason drivers photograph a scene twice &mdash; once for the app, once for ' +
  'themselves, on the phone that actually stays with them.';

const RETENTION_NOTE =
  'This screen deliberately says <b>nothing about how long anything is kept</b>, or who may open ' +
  'it. A retention period is a policy decision with an Art. 13 disclosure attached, and inventing ' +
  'a plausible one in a prototype is how a number nobody agreed to ends up quoted back in a ' +
  'procurement meeting. It states what was captured and what was not. The retention line goes ' +
  'here once someone with authority to set it has set it.';

function Row({ label, value, muted }) {
  return (
    <div className="arch-row">
      <span className="arch-k">{label}</span>
      <span className="arch-v" style={muted ? { color: 'var(--ink-3)' } : null}>{value}</span>
    </div>
  );
}

/* A titled group of rows. The six are one section; each optional screen the
   driver visited is another, so the copy reads in the order it was captured
   rather than as one undifferentiated list. */
function Section({ title, children }) {
  return (
    <>
      <div className="sp16" />
      <div className="tiny" style={{ fontWeight: 700, color: 'var(--ink-2)', marginBottom: '7px' }}>
        {title}
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>{children}</div>
    </>
  );
}

/* Skipped is a real answer and is shown as one. A driver who skipped the
   witness screen and sees nothing about witnesses cannot tell whether the app
   lost it or they never answered — and it is the skipped items they will be
   messaged about tomorrow. */
const SKIPPED = <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>Skipped</span>;

export function scrArchive() {
  const s = Store.s;
  const d = s.draft;
  const sc = SCENARIOS[s.scenario];
  const slots = sc.photos || [];

  const captured = slots.filter(k => d.photos[k] && !d.photos[k].skipped);
  const missing = slots.filter(k => !d.photos[k] || d.photos[k].skipped);
  const frames = captured.reduce((n, k) => n + 1 + ((d.photos[k].extra || []).length), 0);

  // The same summary the confirm row showed, so the copy matches what the
  // driver saw — including anything else they reported as damaged.
  const typeLabel = typeSummary(d);
  const injuredLabel = d.injured === null ? 'Not answered' : d.injured ? 'Yes' : 'No one';
  // The driver's own copy must not tell them they answered something they were
  // never asked. For theft this row is the system's inference, and says so.
  const drivableLabel = d.drivableSource === 'derived'
    ? 'No, the vehicle is gone'
    : d.drivable === null ? 'Not answered' : d.drivable ? 'Yes' : 'No';

  /* Everything captured after the reference. Each group renders only when the
     driver reached that screen, so the copy shows what happened rather than a
     grid of dashes — but a screen they SKIPPED still appears, saying skipped,
     because that is the answer they gave and the thing they will be messaged
     about. `wasSkipped` reads the same list the fleet chase list reads. */
  const wasSkipped = id => (d.skipped || []).includes(id);
  const labelsFor = (opts, vals) => (vals || [])
    .map(v => (opts.find(o => o[0] === v) || [, v])[1]).join(', ');

  const injuryRows = [];
  if (d.injured === true) {
    const parties = labelsFor(WHO_HURT_OPTIONS, d.injuredParties);
    const bands = labelsFor(SEVERITY_OPTIONS, d.injurySeverity);
    if (parties) injuryRows.push(<Row key="who" label="Who is hurt" value={parties} />);
    if (bands) injuryRows.push(<Row key="band" label="How bad" value={bands} />);
    if (d.injuryEmergency !== null) {
      injuryRows.push(
        <Row key="emg" label="Emergency services"
          value={d.injuryEmergency ? 'There' : 'Not yet'} />,
      );
    }
  }

  const cargoRows = [];
  if (wasSkipped('cargo')) {
    cargoRows.push(<Row key="s" label="Cargo" value={SKIPPED} />);
  } else if (d.cargoLaden !== null) {
    cargoRows.push(<Row key="laden" label="Loaded" value={d.cargoLaden ? 'Loaded' : 'Empty'} />);
    if (d.cargoDesc) cargoRows.push(<Row key="desc" label="What is on board" value={d.cargoDesc} />);
    if (d.trailer) cargoRows.push(<Row key="tr" label="Trailer" value={d.trailer} />);
    // ADR is a safety fact, so it is stated either way rather than only when
    // the answer is yes. A blank here reads as "nobody asked".
    if (d.hazardous !== null) {
      cargoRows.push(<Row key="adr" label="Hazardous (ADR)" value={d.hazardous ? 'Yes' : 'No'} />);
    }
  }

  const witnessRows = [];
  if (wasSkipped('witness')) {
    witnessRows.push(<Row key="s" label="Witness" value={SKIPPED} />);
  } else if (d.witnessPresent !== null) {
    witnessRows.push(
      <Row key="p" label="Anyone saw it" value={d.witnessPresent ? 'Yes' : 'No one'} />,
    );
    if (d.witnessName) witnessRows.push(<Row key="n" label="Name" value={d.witnessName} />);
    if (d.witnessPhone) witnessRows.push(<Row key="ph" label="Phone" value={d.witnessPhone} />);
  }

  const policeRows = [];
  if (wasSkipped('police')) {
    policeRows.push(<Row key="s" label="Police" value={SKIPPED} />);
  } else if (d.policeAttended !== null || d.policeRef) {
    if (d.policeAttended !== null) {
      policeRows.push(
        <Row key="a" label={sc.type === 'theft' ? 'Reported stolen' : 'Police attended'}
          value={d.policeAttended ? 'Yes' : 'No'} />,
      );
    }
    if (d.policeRef) {
      policeRows.push(
        <Row key="r" label={sc.type === 'theft' ? 'Crime reference' : 'Reference'}
          value={d.policeRef} />,
      );
    }
  }

  /* The accident statement. Counts and signature status rather than the
     statement text: seventeen numbered clauses would bury every other section,
     and what a driver needs from their own copy is whether it was agreed and
     signed. The clauses themselves are on the export. */
  const easRows = [];
  if (sc.eas) {
    if (wasSkipped('eas')) {
      easRows.push(<Row key="s" label="Accident statement" value={SKIPPED} />);
    } else if (d.easA.length || d.easB.length || d.sketch || d.sigA || d.sigB) {
      easRows.push(
        <Row key="a" label="Boxes you ticked" value={d.easA.length || 'None'} />,
        <Row key="b" label="Boxes they ticked" value={d.easB.length || 'None'} />,
      );
      if (d.sketch) easRows.push(<Row key="sk" label="Sketch" value="Drawn" />);
      // Signed by one party is a real and common state, and it is exactly the
      // thing a driver would want to know they are holding.
      const signed = [d.sigA && 'you', d.sigB && 'the other driver'].filter(Boolean);
      easRows.push(
        <Row key="sg" label="Signed by"
          value={signed.length ? signed.join(' and ') : SKIPPED} />,
      );
    }
  }

  const otherRows = [];
  if (wasSkipped('otherPlate')) {
    otherRows.push(<Row key="s" label="The other vehicle" value={SKIPPED} />);
  } else {
    if (d.otherPlate) otherRows.push(<Row key="p" label="Plate" value={d.otherPlate} />);
    if (d.otherMake) otherRows.push(<Row key="m" label="Make and colour" value={d.otherMake} />);
    if (d.otherDriver) otherRows.push(<Row key="d" label="Driver" value={d.otherDriver} />);
    if (d.otherPhone) otherRows.push(<Row key="ph" label="Phone" value={d.otherPhone} />);
  }
  if (wasSkipped('otherIns')) {
    otherRows.push(<Row key="si" label="Their insurer" value={SKIPPED} />);
  } else {
    if (d.otherInsurer) otherRows.push(<Row key="i" label="Their insurer" value={d.otherInsurer} />);
    if (d.otherPolicy) otherRows.push(<Row key="pol" label="Policy number" value={d.otherPolicy} />);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="scroll">
        <div className="pad">
          <h1 className="h1">Your copy</h1>
          <p className="sub">
            What you sent, and what you didn&rsquo;t. This stays on your phone.
          </p>

          <div className="sp16" />

          <div className="card">
            <div
              className="tiny"
              style={{ textTransform: 'uppercase', letterSpacing: '.07em', fontSize: '10.5px' }}
            >
              Reference
            </div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '3px' }}>
              {s.reference || '—'}
            </div>
          </div>

          <div className="sp16" />

          {/* The six that blocked submission, in the order they were asked. */}
          <Section title="The report">
            <Row label="Vehicle" value={d.vehicle || '—'} />
            <Row label="When" value={d.occurredAt || '—'} />
            <Row label="Where it happened" value={d.location || '—'} />
            <Row label="What happened" value={typeLabel} />
            <Row label="Anyone hurt" value={injuredLabel} />
            <Row label="Still drivable" value={drivableLabel} />
            {d.damageDesc && <Row label="Damage" value={d.damageDesc} />}
            {d.whereSeen && <Row label="Where to inspect it" value={d.whereSeen} />}
          </Section>

          {/* Everything after the reference. A copy that stops at the six is
              not a copy of what was sent — the driver answered these too, and
              the ones they skipped are the ones they will be asked about. */}
          {injuryRows.length > 0 && (
            <Section title="Injuries">{injuryRows}</Section>
          )}

          {cargoRows.length > 0 && (
            <Section title="Cargo">{cargoRows}</Section>
          )}

          {witnessRows.length > 0 && (
            <Section title="Witness">{witnessRows}</Section>
          )}

          {policeRows.length > 0 && (
            <Section title="Police">{policeRows}</Section>
          )}

          {otherRows.length > 0 && (
            <Section title="The other vehicle">{otherRows}</Section>
          )}

          {easRows.length > 0 && (
            <Section title="Accident statement">{easRows}</Section>
          )}

          {slots.length > 0 && (
            <>
              <div className="sp16" />
              <div className="tiny" style={{ fontWeight: 700, color: 'var(--ink-2)', marginBottom: '7px' }}>
                Photographs · {captured.length} of {slots.length} covered
                {frames > captured.length ? `, ${frames} pictures` : ''}
              </div>

              {captured.length > 0 ? (
                <div className="photo-grid">
                  {captured.map(k => {
                    const meta = PHOTO_SLOTS[k] || { label: k, sil: 'wide' };
                    const st = d.photos[k];
                    const n = 1 + ((st.extra || []).length);
                    return (
                      <div key={k} className="pslot shot" style={{ cursor: 'default' }}>
                        {st.thumb
                          ? <img className="pthumb" src={st.thumb.url} alt="" />
                          : <span dangerouslySetInnerHTML={{ __html: svgSilhouette(meta.sil, true) }} />}
                        {n > 1 && <span className="pcount">{n}</span>}
                        <span className="plabel">{meta.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="tiny">No photographs were taken. That is recorded as a known gap.</p>
              )}

              {/* Named, not hidden. A skipped slot the driver can see is a
                  decision they made; one they cannot see is a surprise later. */}
              {missing.length > 0 && (
                <>
                  <div className="sp12" />
                  <div className="card-quiet">
                    <div className="tiny" style={{ fontWeight: 700, color: 'var(--ink-2)' }}>
                      Not taken
                    </div>
                    <div className="chipset" style={{ marginTop: '8px' }}>
                      {missing.map(k => (
                        <span key={k} className="chip" style={{ fontSize: '10.5px' }}>
                          {(PHOTO_SLOTS[k] || { label: k }).label}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* The images live in the session that took them — Store.save keeps
              the record and drops the pixels, because localStorage is ~5 MB and
              a phone camera returns 3–6 MB per shot. Saying so is better than a
              driver reopening this in a week and finding empty frames. */}
          <div className="sp16" />
          <div className="card-quiet">
            <div style={{ display: 'flex', gap: '10px' }}>
              <span
                style={{ color: 'var(--ink-3)', flex: 'none', marginTop: '2px' }}
                dangerouslySetInnerHTML={{ __html: I.info }}
              />
              <p className="tiny" style={{ lineHeight: 1.5 }}>
                The pictures themselves stay on your phone for now. This list is what we hold
                against <span className="mono">{s.reference || 'the reference'}</span>.
              </p>
            </div>
          </div>

          {dn('Give the driver their own copy', ARCHIVE_NOTE)}
          {dn('What this screen refuses to promise', RETENTION_NOTE)}
          <div className="sp28" />
        </div>
      </div>

      <div className="dock">
        <button className="btn btn-quiet" data-act="nav-back">Back</button>
      </div>
    </div>
  );
}
