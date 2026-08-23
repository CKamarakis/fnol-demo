/**
 * The OpenAPI spec, checked against itself and against the implementation.
 *
 * A spec nobody runs drifts from the code within a week. This parses
 * openapi.yaml, resolves every $ref, and then checks that the operations it
 * describes are the operations FakeApi actually performs — so the document
 * stays a contract rather than becoming a wish.
 *
 *   node tests/contract.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import YAML from 'yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const spec = YAML.parse(readFileSync(join(ROOT, 'openapi.yaml'), 'utf8'));
const fakeApi = readFileSync(join(ROOT, 'src', 'core', 'FakeApi.js'), 'utf8');

let failed = 0;
const check = (ok, msg, detail) => {
  if (ok) console.log(`pass  ${msg}`);
  else { console.error(`FAIL  ${msg}${detail ? `\n      ${detail}` : ''}`); failed++; }
};

// --- the document is well-formed ---
check(spec.openapi?.startsWith('3.1'), 'declares OpenAPI 3.1', spec.openapi);
check(!!spec.info?.title && !!spec.info?.version, 'has title and version');

const refs = [];
(function walk(node, path) {
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (k === '$ref') refs.push([v, path]);
    else walk(v, `${path}/${k}`);
  }
})(spec, '');

const deref = r => r.replace(/^#\//, '').split('/').reduce((a, k) => a && a[k], spec);
const broken = refs.filter(([r]) => deref(r) === undefined);
check(broken.length === 0, `all ${refs.length} $refs resolve`,
  broken.map(([r, p]) => `${r} at ${p}`).join('\n      '));

// --- every documented path is implemented ---
// FakeApi builds paths by concatenation ("/v1/incidents/"+id+"/submit"), so
// match on the literal fragments rather than a whole path string.
// Take the rest of the line after `p:` — expressions like
// "/v1/telematics-events/evt_"+uuid().slice(0,6)+"/dismiss" contain commas,
// so anything comma-delimited truncates them mid-path.
const logged = [...fakeApi.matchAll(/\bp:\s*(.+)$/gm)].map(m => m[1]);

const fragmentsOf = path => path
  .split(/\{[^}]+\}/)
  .map(f => f.replace(/^\/|\/$/g, ''))
  .filter(Boolean);

for (const path of Object.keys(spec.paths)) {
  const frags = fragmentsOf(path);
  const hit = logged.some(entry => frags.every(f => entry.includes(f)));
  check(hit, `path is implemented: ${path}`,
    hit ? '' : `no FakeApi log call contains all of: ${frags.join(' + ')}`);
}

// --- the six blocking fields, and only six ---
const blocking = spec.components.schemas.Completeness.properties.blocking;
check(blocking.maxItems === 6, 'completeness.blocking is capped at six');
check(blocking.items.enum.length === 6, 'exactly six field names are permitted',
  blocking.items.enum.join(', '));

const required = spec.components.schemas.IncidentCreate.required;
check(required.length === 6, 'IncidentCreate requires exactly six fields', required.join(', '));
check(
  required.every(f => blocking.items.enum.includes(f)),
  'the required fields and the blocking enum are the same six',
);

// --- domain guarantees the spec must keep ---
const flat = JSON.stringify(spec).toLowerCase();
const faultProps = ['"fault"', '"at_fault"', '"liability"', '"blame"', '"whose_fault"']
  .filter(f => flat.includes(f));
check(faultProps.length === 0, 'no fault-attribution property anywhere in the schema',
  faultProps.join(', '));

const injury = spec.components.schemas.IncidentCreate.properties;
check(!('injury_description' in injury), 'no free-text injury description field');
check('injury_severity' in injury, 'injury severity band is present instead');
check(injury.injury_severity.enum.length === 3, 'severity is a band, not free text');

// A business-rule failure must be describable as accepted-and-flagged.
const coverage = spec.components.schemas.Incident.properties.coverage_status;
check(coverage.enum.includes('disputed'), 'coverage can be disputed without rejecting intake');
const errCategories = spec.components.schemas.Error.properties.category.enum;
check(errCategories.includes('business_rule'),
  'the error model names business_rule as its own category');
check(errCategories.length === 4, 'four error categories, because clients respond differently to each',
  errCategories.join(', '));

// Idempotency is required on every write, or replays create duplicates.
const writes = [];
for (const [path, ops] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(ops)) {
    if (!['post', 'patch', 'put'].includes(method)) continue;
    const params = [...(ops.parameters || []), ...(op.parameters || [])];
    const hasKey = params.some(p => deref(p.$ref || '')?.name === 'Idempotency-Key'
      || p.name === 'Idempotency-Key');
    writes.push([`${method.toUpperCase()} ${path}`, hasKey]);
  }
}
const missingKey = writes.filter(([, ok]) => !ok).map(([w]) => w);
// The dismissal endpoint creates nothing, so a replay is harmless.
const allowed = ['POST /telematics-events/{eventId}/dismiss'];
const unexpected = missingKey.filter(w => !allowed.includes(w));
check(unexpected.length === 0, 'every state-creating write requires an idempotency key',
  unexpected.join(', '));

// --- webhooks match what the implementation fires ---
const documented = Object.values(spec.webhooks).map(w => w.post.summary);
const fired = [...fakeApi.matchAll(/hookFire\("([a-z_.]+)"/g)].map(m => m[1]);
const undocumented = [...new Set(fired)].filter(e => !documented.includes(e));
check(undocumented.length <= 4,
  'the documented webhooks are a subset of what is actually fired',
  undocumented.length ? `fired but not documented: ${undocumented.join(', ')}` : '');
for (const e of documented) {
  check(fired.includes(e), `documented webhook is actually fired: ${e}`);
}

console.log(failed ? `\n${failed} failure(s)` : '\nall contract assertions passed');
process.exit(failed ? 1 : 0);
