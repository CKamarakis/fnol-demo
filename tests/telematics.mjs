/**
 * The Mapon fixtures, and the mapping from their vocabulary to ours.
 *
 * The point of these fixtures is that the incident record is BUILT from
 * partner data rather than hand-written to look like it was. This suite
 * checks that the derived values actually derive — a hardcoded string that
 * happens to read "62 → 0 km/h" would pass a screenshot review and fail here.
 *
 *   node tests/telematics.mjs
 */
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mapon = await import(pathToFileURL(join(ROOT, 'src', 'data', 'mapon.js')).href);
const { MAPON_FIXTURES, MAPON_THRESHOLDS, fromMapon, decelerationProfile } = mapon;

let failed = 0;
const check = (ok, msg, detail) => {
  if (ok) console.log(`pass  ${msg}`);
  else { console.error(`FAIL  ${msg}${detail ? `\n      ${detail}` : ''}`); failed++; }
};

// --- the fixtures carry real Mapon field names ---
const collision = MAPON_FIXTURES.collision;
check(collision.unit.unit_id > 0, 'unit has a Mapon unit_id');
check('total_distance' in collision.unit.can, 'CAN block uses total_distance');
check('engine_hours' in collision.unit.can, 'CAN block uses engine_hours');
check(collision.unit.state.name === 'standing', 'unit state uses Mapon vocabulary');
check(Array.isArray(collision.unit.trailer_connections), 'trailer_connections present');
check(collision.unit.tachograph.driver_card_present === true, 'tachograph card presence present');
check(collision.alerts[0].alert_type === 'harsh_braking', 'alert_type is a documented Mapon type');
check(/\|/.test(collision.alerts[0].alert_val), 'alert_val uses Mapon value|unit format');

// --- deceleration is computed from the route, not asserted ---
const decel = decelerationProfile(collision.route);
check(decel.spanFrom === 62 && decel.spanTo === 0, 'the stop spans 62 → 0 km/h',
  `got ${decel.spanFrom} → ${decel.spanTo}`);
// The peak is one segment inside that span, and it is the segment that
// breaches the threshold — reporting the span as if it were the peak would
// overstate the force by roughly a third.
check(decel.from === 58 && decel.to === 21,
  'peak segment is the sharpest part of the stop, not the whole span',
  `got ${decel.from} → ${decel.to}`);
check(decel.exceedsHarshBraking, 'collision exceeds the documented harsh-braking threshold',
  `${decel.peakMs2} m/s vs ${MAPON_THRESHOLDS.harshBraking.value}`);
check(decel.peakG > 0.5 && decel.peakG < 2.5, 'peak g is physically plausible for a truck stop',
  `${decel.peakG} g`);

// A stone chip fires nothing. This is why the driver-initiated path exists.
const glassDecel = decelerationProfile(MAPON_FIXTURES.glass.route);
check(MAPON_FIXTURES.glass.alerts.length === 0, 'glass scenario has no Mapon alert');
check(!glassDecel.exceedsHarshBraking, 'glass is below every Mapon threshold');
check(MAPON_FIXTURES.glass.trigger.classified_as === 'driver_reported',
  'glass is classified as driver-reported, not detected');

// --- the mapping produces what the screens read ---
for (const key of ['collision', 'glass', 'theft']) {
  const m = fromMapon(MAPON_FIXTURES[key]);
  check(!!m.location && m.location.length > 10, `${key}: location resolves to a full address`);
  check(/^\d{2}:\d{2}$/.test(m.time), `${key}: time is HH:MM`, m.time);
  check(/\d{4}$/.test(m.date), `${key}: date carries a year`, m.date);
  check(m.vehicle === 'B-RL 4471', `${key}: vehicle registration mapped`);
  check(m.source.partner === 'Mapon', `${key}: provenance names the partner`);
  check(typeof m.source.odometer_km === 'number', `${key}: odometer derived from CAN`);
}

// --- the honest bit: detection is inferred, and says so ---
for (const key of ['collision', 'glass', 'theft']) {
  const t = MAPON_FIXTURES[key].trigger;
  check(t.derived === true, `${key}: trigger is marked derived, not received`);
  check(typeof t.basis === 'string' && t.basis.length > 10,
    `${key}: trigger states what it inferred from`);
  check(typeof t.confidence === 'number' && t.confidence >= 0 && t.confidence <= 1,
    `${key}: confidence is a 0..1 number`, String(t.confidence));
}

// Theft is genuinely ambiguous, and the confidence should admit it.
check(MAPON_FIXTURES.theft.trigger.confidence < MAPON_FIXTURES.collision.trigger.confidence,
  'theft is less confident than collision — the signal is weaker');

// A driver-side value must never be silently absent.
const theft = fromMapon(MAPON_FIXTURES.theft, { locationNote: 'last known position' });
check(theft.locationNote === 'last known position',
  'theft carries its "last known position" qualifier');
check(theft.clip === 'unavailable', 'theft reports no footage rather than faking one');

console.log(failed ? `\n${failed} failure(s)` : '\nall telematics assertions passed');
process.exit(failed ? 1 : 0);
