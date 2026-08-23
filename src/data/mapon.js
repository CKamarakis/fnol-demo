/**
 * Fake Mapon telematics payloads.
 *
 * Mapon is the fleet telematics partner, so the incident record should be
 * built from what Mapon actually sends rather than from a shape we invented.
 * These fixtures use Mapon's real field names and units so the mapping in
 * `fromMapon()` below is a genuine mapping, not a rename of our own schema.
 *
 * Sourced from the Mapon API docs (mapon.com/api) and their driving-score
 * documentation. Field names, nesting and units are theirs. The VALUES are
 * invented — no Mapon account was contacted, no vehicle exists.
 *
 * ── The honest part ─────────────────────────────────────────────────────
 * Mapon documents no crash-detection endpoint. It exposes harsh-event
 * thresholds (braking > 3.4 m/s, cornering > 0.37 g), CAN bus data, ignition
 * state and an alert stream — but nothing that says "this was a collision".
 *
 * So the trigger below is DERIVED, not received: a harsh-braking alert whose
 * speed drops to zero and stays there, with the ignition off and no movement
 * afterwards, is treated as a probable impact. That inference is ours and it
 * is the reason the dismissal path exists — see `confidence` on each fixture,
 * and docs note in the System pane.
 *
 * If Mapon (or the device firmware) does expose an accelerometer event, this
 * is the one place that would change.
 */

/** Mapon's documented driving-score thresholds. Used to classify alerts. */
export const MAPON_THRESHOLDS = {
  harshBraking: { value: 3.4, unit: 'm/s', note: 'speed decrease over 3.4 m/s (12 km/h)' },
  harshAcceleration: { value: 2.2, unit: 'm/s', note: 'speed increase over 2.2 m/s (8 km/h)' },
  harshCornering: { value: 0.37, unit: 'g', note: 'lateral acceleration over 0.37 g' },
  excessiveIdling: { value: 120, unit: 's', note: 'engine on, stationary, over 2 minutes' },
};

/** The vehicle, as Mapon's unit/list returns it. */
const UNIT = {
  unit_id: 481207,
  box_id: 90412,
  company_id: 3318,
  country_code: 'DE',
  label: 'DAF XF 480',
  make: 'DAF',
  model: 'XF 480 FT',
  number: 'B-RL 4471',
  vehicle_title: 'B-RL 4471 · DAF XF 480',
  fuel_type: 'D',
  avg_fuel_consumption: { norm: 28.4, measurement: 'l/100km' },
  fuel_tank: { total_vol: 900 },
  device: {
    id: 'TLT-2312',
    serial_number: 'MPN-90412-DE',
    imei: '356938035643809',
    sim: '+371 2000 0000',
    fw_version: '4.18.2',
  },
};

const DRIVER = {
  driver_id: 20551,
  name: 'Marek',
  surname: 'Kowalczyk',
  tacho_card_id: 'PL-9142-8837-2201',
  card_inserted: '2026-08-19T06:10:04Z',
};

/**
 * One scenario's worth of Mapon data.
 *
 * `unit` mirrors GET /unit/list.json with include=can,ignition,tachograph,
 * device,drivers. `alerts` mirrors GET /alert/list.json. `route` mirrors the
 * tail of GET /route/list.json — the last few points before the event, which
 * is what makes a speed profile rather than a single reading.
 */
export const MAPON_FIXTURES = {
  collision: {
    trigger: {
      derived: true,
      basis: 'harsh_braking alert + speed 0 + ignition off + no movement 90 s',
      confidence: 0.86,
      classified_as: 'probable_impact',
    },
    unit: {
      ...UNIT,
      lat: 52.1621,
      lng: 11.5872,
      direction: 94,
      speed: 0,
      mileage: 486213000,
      last_update: '2026-08-19T14:32:11Z',
      state: { name: 'standing', start: '2026-08-19T14:32:09Z', duration: 118 },
      movement_state: { name: 'standing' },
      ignition: { value: false, last_update: '2026-08-19T14:32:14Z' },
      can: {
        total_distance: { value: 486213000, timestamp: '2026-08-19T14:32:09Z' },
        engine_hours: { value: 18422.6, timestamp: '2026-08-19T14:32:09Z' },
        engine_rpm: { value: 0, timestamp: '2026-08-19T14:32:11Z' },
        fuel_level: { value: 62, measurement: '%', timestamp: '2026-08-19T14:32:09Z' },
        service_brake: { value: true, timestamp: '2026-08-19T14:32:08Z' },
      },
      weights: { axle_1: 7420, axle_2: 11800, total: 19220, measurement: 'kg' },
      trailer_connections: [{ trailer_number: 'B-RL 8829', connected_since: '2026-08-19T06:22:00Z' }],
      tachograph: { driver_card_present: true, driver_id: DRIVER.tacho_card_id },
      supply_voltage: 27.8,
      battery_level_percentage: 96,
      altitude: 61,
      drivers: [DRIVER],
    },
    alerts: [
      {
        id: 8841207,
        unit_id: UNIT.unit_id,
        time: '2026-08-19T14:32:09Z',
        alert_type: 'harsh_braking',
        alert_val: '17.2|m/s',
        msg: 'Harsh braking 17.2 m/s (threshold 3.4 m/s).',
        location: '52.16210,11.58720',
        address: 'A2 near Magdeburg, km 74.3, eastbound, Saxony-Anhalt, Germany',
      },
      {
        id: 8841208,
        unit_id: UNIT.unit_id,
        time: '2026-08-19T14:32:14Z',
        alert_type: 'moving',
        alert_val: '0|km/h',
        msg: 'Vehicle stopped.',
        location: '52.16210,11.58720',
        address: 'A2 near Magdeburg, km 74.3, eastbound, Saxony-Anhalt, Germany',
      },
    ],
    // last five points before the stop — a profile, not a single reading
    route: [
      { time: '2026-08-19T14:31:55Z', speed: 62, lat: 52.1638, lng: 11.5901, direction: 94 },
      { time: '2026-08-19T14:32:05Z', speed: 62, lat: 52.1629, lng: 11.5886, direction: 94 },
      { time: '2026-08-19T14:32:08Z', speed: 58, lat: 52.1624, lng: 11.5877, direction: 94 },
      { time: '2026-08-19T14:32:09Z', speed: 21, lat: 52.1622, lng: 11.5873, direction: 95 },
      { time: '2026-08-19T14:32:10Z', speed: 0, lat: 52.1621, lng: 11.5872, direction: 95 },
    ],
    video: { clip_id: 'MPN-CLIP-40218', duration_s: 14, available: true },
  },

  glass: {
    trigger: {
      derived: true,
      basis: 'driver-reported; no Mapon alert matched this event',
      confidence: 0.0,
      classified_as: 'driver_reported',
    },
    unit: {
      ...UNIT,
      lat: 52.4125,
      lng: 12.5316,
      direction: 271,
      speed: 84,
      mileage: 486090000,
      last_update: '2026-08-19T09:12:40Z',
      state: { name: 'driving', start: '2026-08-19T07:58:12Z', duration: 4468 },
      movement_state: { name: 'driving' },
      ignition: { value: true, last_update: '2026-08-19T07:58:12Z' },
      can: {
        total_distance: { value: 486090000, timestamp: '2026-08-19T09:12:40Z' },
        engine_hours: { value: 18420.9, timestamp: '2026-08-19T09:12:40Z' },
        engine_rpm: { value: 1290, timestamp: '2026-08-19T09:12:40Z' },
        fuel_level: { value: 71, measurement: '%', timestamp: '2026-08-19T09:12:40Z' },
        service_brake: { value: false, timestamp: '2026-08-19T09:12:40Z' },
      },
      weights: { axle_1: 7380, axle_2: 11640, total: 19020, measurement: 'kg' },
      trailer_connections: [{ trailer_number: 'B-RL 8829', connected_since: '2026-08-19T06:22:00Z' }],
      tachograph: { driver_card_present: true, driver_id: DRIVER.tacho_card_id },
      supply_voltage: 28.1,
      battery_level_percentage: 98,
      altitude: 34,
      drivers: [DRIVER],
    },
    // Nothing fired. A stone chip is below every threshold Mapon has — which
    // is exactly why the driver-initiated path has to exist alongside the
    // detected one.
    alerts: [],
    route: [
      { time: '2026-08-19T09:12:20Z', speed: 84, lat: 52.4131, lng: 12.5338, direction: 271 },
      { time: '2026-08-19T09:12:30Z', speed: 84, lat: 52.4128, lng: 12.5327, direction: 271 },
      { time: '2026-08-19T09:12:40Z', speed: 84, lat: 52.4125, lng: 12.5316, direction: 271 },
    ],
    video: { clip_id: 'MPN-CLIP-40155', duration_s: 6, available: true },
  },

  theft: {
    trigger: {
      derived: true,
      basis: 'ignition off at rest stop, then unit offline 15 min with no scheduled stop',
      confidence: 0.41,
      classified_as: 'possible_unauthorised_movement',
    },
    unit: {
      ...UNIT,
      lat: 52.2914,
      lng: 13.0338,
      direction: 0,
      speed: 0,
      mileage: 486180000,
      last_update: '2026-08-19T04:02:18Z',
      state: { name: 'nodata', start: '2026-08-19T04:02:18Z', duration: 900 },
      movement_state: { name: 'standing' },
      ignition: { value: false, last_update: '2026-08-19T03:47:02Z' },
      can: {
        total_distance: { value: 486180000, timestamp: '2026-08-19T03:47:02Z' },
        engine_hours: { value: 18419.1, timestamp: '2026-08-19T03:47:02Z' },
        engine_rpm: { value: 0, timestamp: '2026-08-19T03:47:02Z' },
        fuel_level: { value: 44, measurement: '%', timestamp: '2026-08-19T03:47:02Z' },
        service_brake: { value: false, timestamp: '2026-08-19T03:47:02Z' },
      },
      weights: { axle_1: 7400, axle_2: 11720, total: 19120, measurement: 'kg' },
      trailer_connections: [],
      tachograph: { driver_card_present: false, driver_id: null },
      supply_voltage: 0,
      battery_level_percentage: null,
      altitude: 48,
      drivers: [],
    },
    alerts: [
      {
        id: 8839911,
        unit_id: UNIT.unit_id,
        time: '2026-08-19T04:02:18Z',
        alert_type: 'no_power',
        alert_val: '0|supply_voltage',
        msg: 'Supply voltage lost.',
        location: '52.29140,13.03380',
        address: 'Raststätte Michendorf Süd, A10, Brandenburg, Germany',
      },
    ],
    route: [
      { time: '2026-08-19T03:46:50Z', speed: 12, lat: 52.2916, lng: 13.0341, direction: 188 },
      { time: '2026-08-19T03:47:02Z', speed: 0, lat: 52.2914, lng: 13.0338, direction: 188 },
    ],
    video: { clip_id: null, duration_s: 0, available: false },
  },
};

/* ── derived helpers ──────────────────────────────────────────────────── */

const fmtTime = iso => iso.slice(11, 16);
const fmtDate = iso => new Date(iso).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric',
});

/** Peak deceleration across the route tail, in m/s and in g. */
export function decelerationProfile(route) {
  let peak = 0, from = 0, to = 0, seconds = 0;
  for (let i = 1; i < route.length; i++) {
    const dv = (route[i - 1].speed - route[i].speed) / 3.6;          // km/h → m/s
    const dt = (Date.parse(route[i].time) - Date.parse(route[i - 1].time)) / 1000;
    if (dt <= 0) continue;
    const rate = dv / dt;
    if (rate > peak) {
      peak = rate;
      from = route[i - 1].speed;
      to = route[i].speed;
      seconds = dt;
    }
  }
  // The peak is one segment; what a driver should see is the whole stop.
  const first = route[0], last = route[route.length - 1];
  const spanS = (Date.parse(last.time) - Date.parse(first.time)) / 1000;

  return {
    peakMs2: +peak.toFixed(1),
    peakG: +(peak / 9.81).toFixed(2),
    from, to, seconds,
    spanFrom: first.speed,
    spanTo: last.speed,
    spanSeconds: spanS,
    exceedsHarshBraking: peak > MAPON_THRESHOLDS.harshBraking.value,
  };
}

/**
 * Map a Mapon payload onto the fields the incident record needs.
 *
 * This is the seam that would face a real integration: everything above is
 * Mapon's vocabulary, everything it returns is ours. Keeping the translation
 * in one named function is the point — when the partner changes, one file does.
 */
export function fromMapon(fixture, { locationNote } = {}) {
  const { unit, alerts, route, video, trigger } = fixture;
  const primary = alerts[0] || null;
  const at = primary ? primary.time : unit.last_update;
  const decel = decelerationProfile(route);

  return {
    // what the driver sees
    location: (primary && primary.address) || `${unit.lat}, ${unit.lng}`,
    locationNote,
    lat: unit.lat,
    lon: unit.lng,
    time: fmtTime(at),
    date: fmtDate(at),
    vehicle: unit.number,
    driver: unit.drivers.length ? `${unit.drivers[0].name} ${unit.drivers[0].surname[0]}.` : '—',
    clip: video.available ? `${String(video.duration_s).padStart(2, '0')}s` : 'unavailable',

    // Both strings are computed from the route, so they cannot drift away from
    // the data behind them. The span is what a driver recognises; the peak is
    // what breaches the threshold, so both are stated rather than conflated.
    speed: decel.spanFrom > 0 && decel.spanTo === 0
      ? `${decel.spanFrom} → 0 km/h in ${decel.spanSeconds} s`
      : `${unit.speed} km/h · no deceleration event`,
    impact: decel.exceedsHarshBraking
      ? `${decel.peakG} g peak · ${decel.peakMs2} m/s² (threshold ${MAPON_THRESHOLDS.harshBraking.value})`
      : 'no alert fired · below every Mapon threshold',

    // provenance, so the System pane can show where each value came from
    source: {
      partner: 'Mapon',
      unit_id: unit.unit_id,
      device: unit.device.id,
      trigger,
      alert_types: alerts.map(a => a.alert_type),
      deceleration: decel,
      ignition: unit.ignition.value,
      odometer_km: Math.round(unit.can.total_distance.value / 1000),
      engine_hours: unit.can.engine_hours.value,
      fuel_pct: unit.can.fuel_level.value,
      gross_weight_kg: unit.weights.total,
      trailer: unit.trailer_connections[0]?.trailer_number || null,
      tacho_card: unit.tachograph.driver_card_present,
      raw: fixture,
    },
  };
}
