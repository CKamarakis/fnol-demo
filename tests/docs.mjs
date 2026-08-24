/**
 * The documentation still describes the software.
 *
 * Prose drifts from code silently and nobody notices for weeks. The field spec
 * went three days without knowing about four new incident types, a new field
 * and the correction audit trail — and CLAUDE.md described the pre-React build
 * for the entire React conversion.
 *
 * This does not check that the writing is *good*, only that nothing is
 * missing. The reasoning stays hand-written, because a generator cannot say
 * "without the plate you cannot subrogate".
 *
 *   node tests/docs.mjs
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');

const domain = await import(pathToFileURL(join(ROOT, 'src', 'data', 'domain.js')).href);
const store = await import(pathToFileURL(join(ROOT, 'src', 'core', 'store.js')).href);

const fieldSpec = read('docs/field-spec.md');
const s1 = read('src/screens/driver/S1Tier1.jsx');

let failed = 0;
const check = (ok, msg, detail) => {
  if (ok) console.log(`pass  ${msg}`);
  else { console.error(`FAIL  ${msg}${detail ? `\n      ${detail}` : ''}`); failed++; }
};

// --- every incident type the driver can pick is documented ---
const typeBlock = s1.match(/const TYPE_OPTIONS = \[([\s\S]*?)\];/)?.[1] || '';
const types = [...typeBlock.matchAll(/\['([a-z_]+)',/g)].map(m => m[1]);

check(types.length > 0, 'incident types can be read from the code');

const undocumentedTypes = types.filter(t => !new RegExp(`\`${t}\``).test(fieldSpec));
check(undocumentedTypes.length === 0,
  `field spec documents all ${types.length} incident types`,
  undocumentedTypes.length ? `missing: ${undocumentedTypes.join(', ')}` : '');

// The list is presented alphabetically with `other` last. If that ordering
// changes in the code, the doc's explanation of it becomes a lie.
const ordered = types.slice(0, -1);
check(JSON.stringify(ordered) === JSON.stringify([...ordered].sort()),
  'incident types are alphabetical, as the field spec claims');
check(types[types.length - 1] === 'other',
  'other is last, as the field spec claims');

// --- every perishable item is in the ordering table ---
const perishable = Object.keys(domain.PERISHABLE);
// Match on the id or any word of the label — the doc may reasonably call
// "Agreed circumstances" the EAS section, and either is documented.
const undocumentedPerishable = perishable.filter(id => {
  const spec = fieldSpec.toLowerCase();
  const words = domain.PERISHABLE[id].label.toLowerCase().split(/\s+/);
  return !spec.includes(id.toLowerCase()) && !words.some(w => w.length > 3 && spec.includes(w));
});
check(undocumentedPerishable.length === 0,
  `field spec covers all ${perishable.length} perishable items`,
  undocumentedPerishable.join(', '));

// --- the six blocking fields are still six, and named ---
const draft = store.freshDraft('collision');
const BLOCKING = ['vehicle', 'occurredAt', 'location', 'type', 'injured', 'drivable'];
for (const f of BLOCKING) {
  check(f in draft, `blocking field "${f}" exists in the draft`);
}

// --- the audit trail the field spec promises actually exists ---
check('reported' in draft,
  'draft keeps what the vehicle reported, as the Corrections section describes');
check('corrected' in draft,
  'draft records corrections separately, as the Corrections section describes');
check(/reported/.test(fieldSpec) && /corrected/.test(fieldSpec),
  'field spec documents both sides of a correction');

// --- CLAUDE.md describes the build that exists ---
const claude = read('CLAUDE.md');
const pkg = JSON.parse(read('package.json'));
for (const script of Object.keys(pkg.scripts)) {
  const documented = new RegExp(`npm run ${script}\\b|npm ${script}\\b`).test(claude)
    || new RegExp(`npm run ${script}\\b|npm ${script}\\b`).test(read('README.md'));
  check(documented, `npm script "${script}" is documented`);
}

// Files CLAUDE.md points at must exist — two patch attempts once failed
// silently and left it describing deleted modules for days.
const referenced = [...claude.matchAll(/`(src\/[\w./-]+)`/g)].map(m => m[1]);
const missing = referenced.filter(p => {
  try { read(p); return false; } catch { return true; }
});
check(missing.length === 0, 'every source file CLAUDE.md names exists',
  missing.join(', '));

console.log(failed ? `\n${failed} failure(s)` : '\nall documentation checks passed');
process.exit(failed ? 1 : 0);
