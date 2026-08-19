/**
 * Build integrity: the guarantees the artifact makes about itself.
 *
 * The prototype is emailed and reopened on other people's machines, so
 * "works with no network" is a hard constraint, not a preference. This test
 * is what catches an accidental CDN reference before it ships.
 *
 *   node tests/integrity.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'dist', 'prototype.html'), 'utf8');
const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

let failed = 0;
const check = (ok, msg, detail) => {
  if (ok) console.log(`pass  ${msg}`);
  else { console.error(`FAIL  ${msg}${detail ? `\n      ${detail}` : ''}`); failed++; }
};

const externals = html.match(/(?:src|href)="https?:\/\/[^"]*|@import\s+url\(|cdn\.\w|unpkg\.|jsdelivr/g);
check(!externals, 'no external requests', externals && externals.join(', '));

const modules = js.match(/^\s*(?:import|export)\s/gm);
check(!modules, 'no leftover module syntax in the bundle', modules && `${modules.length} found`);

check(!/\bfetch\s*\(\s*['"`]https?:/.test(js), 'no remote fetch calls');
check(!/XMLHttpRequest/.test(js), 'no XMLHttpRequest');
check(!/\bnew\s+WebSocket\b/.test(js), 'no WebSocket');

// domain guarantees that must survive any refactor
check(!/whose fault was it\?["']\s*[,)]/i.test(js) || /No such field exists/.test(js),
  'no fault-attribution field (only the annotation explaining its absence)');
check(/fault:\s*null/.test(js), 'export marks fault as explicitly null');
check((js.match(/call112/g) || []).length > 1, '112 action is wired');
check(/Art\. 9/.test(js), 'Art. 9 injury-description note present');
check(/Art\. 22/.test(js), 'Art. 22 coverage note present');
check(/idempot/i.test(js), 'idempotency is implemented');

const brands = html.match(/Reli|RELI|DEKRA|reli[.:/]/g);
check(!brands, 'no third-party brand names', brands && brands.join(', '));

console.log(failed ? `\n${failed} failure(s)` : '\nall integrity checks passed');
process.exit(failed ? 1 : 0);
