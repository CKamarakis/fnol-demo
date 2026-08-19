/**
 * Runs every test in this directory. No framework, no dependencies.
 *
 *   node tests/run.mjs
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const suites = readdirSync(HERE)
  .filter(f => f.endsWith('.mjs') && f !== 'run.mjs')
  .sort();

let failed = 0;
for (const s of suites) {
  console.log(`\n── ${s} ${'─'.repeat(Math.max(0, 46 - s.length))}`);
  const r = spawnSync(process.execPath, [join(HERE, s)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}

console.log(failed
  ? `\n${failed} of ${suites.length} suites failed`
  : `\nall ${suites.length} suites passed`);
process.exit(failed ? 1 : 0);
