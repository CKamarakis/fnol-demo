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

/**
 * Brand names must not reappear in the documentation either.
 *
 * The prototype has been checked for this since the de-branding pass, but the
 * docs were written later and reintroduced the name in five places. Checking
 * only the built artifact missed all of them.
 */
{
  const { readdirSync } = await import('node:fs');
  const docsDir = join(ROOT, 'docs');
  const docFiles = [
    join(ROOT, 'README.md'),
    join(ROOT, 'CLAUDE.md'),
    join(ROOT, 'openapi.yaml'),
    ...readdirSync(docsDir).filter(f => f.endsWith('.md')).map(f => join(docsDir, f)),
  ];

  const BRANDS = /\bReli\b|\bRELI\b|\bDEKRA\b|reli[.:/]/;

  /**
   * Nothing personal, and no identifier that could belong to something real.
   *
   * An HTML comment in the shipped file carried a name and described the
   * project as an interview artefact, and a fixture IMEI passed a Luhn check —
   * a structurally valid identifier that could match a real device.
   */
  const PRIVATE = [
    [/\bkamarakis\b/i, 'personal name'],
    [/[\w.+-]+@[\w-]+\.[a-z]{2,}/i, 'email address'],
    [/\bC:\\Users\\|\/Users\/[A-Z]/i, 'absolute path from a developer machine'],
    [/gh[pousr]_[A-Za-z0-9]{20,}/, 'GitHub token'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY/, 'private key'],
    [/interview artefact|private study/i, 'framing that names a hiring context'],
  ];

  const sourceFiles = [
    join(ROOT, 'src', 'index.html'),
    join(ROOT, 'src', 'data', 'mapon.js'),
    join(ROOT, 'dist', 'prototype.html'),
    ...docFiles,
  ];

  for (const [pattern, label] of PRIVATE) {
    const hits = sourceFiles.filter(f => pattern.test(readFileSync(f, 'utf8')));
    check(hits.length === 0, `no ${label} in shipped files`,
      hits.map(f => f.slice(ROOT.length + 1)).join(', '));
  }

  // A demo IMEI that validates is one that could collide with a real device.
  const mapon = readFileSync(join(ROOT, 'src', 'data', 'mapon.js'), 'utf8');
  const imei = mapon.match(/imei:\s*'(\d{15})'/)?.[1];
  if (imei) {
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let v = Number(imei[i]);
      if (i % 2 === 1) { v *= 2; if (v > 9) v -= 9; }
      sum += v;
    }
    const expected = (10 - (sum % 10)) % 10;
    check(expected !== Number(imei[14]),
      'the fixture IMEI is deliberately invalid, so it cannot match a real device',
      `${imei} passes a Luhn check`);
  }
  const offenders = [];
  for (const f of docFiles) {
    const text = readFileSync(f, 'utf8');
    if (BRANDS.test(text)) offenders.push(f.slice(ROOT.length + 1));
  }
  check(offenders.length === 0, 'no third-party brand names in the documentation',
    offenders.join(', '));

  // Every doc should say plainly that nothing downstream is real.
  const readme = readFileSync(join(ROOT, 'docs', 'README.md'), 'utf8');
  check(/simulated|faked/i.test(readme), 'docs index states that downstream is simulated');
}

console.log(failed ? `\n${failed} failure(s)` : '\nall integrity checks passed');
process.exit(failed ? 1 : 0);
