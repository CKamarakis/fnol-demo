/**
 * Zero-dependency build. No npm install, no bundler, no lockfile.
 *
 * Takes the ES modules in src/ and inlines them into a single
 * dist/prototype.html that opens by double-click and works offline.
 *
 * Why a build step at all: browsers refuse ES module imports over file://
 * (CORS), so a modular source tree cannot be opened directly. Rather than
 * give up either the structure or the double-click artifact, we keep both:
 * develop in src/, ship dist/.
 *
 *   node build/build.mjs            build once
 *   node build/build.mjs --watch    rebuild on change
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC  = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const toPosix = p => p.split(String.fromCharCode(92)).join('/');

/** CSS is concatenated in filename order — the numeric prefixes ARE the cascade. */
async function buildCss() {
  const dir = join(SRC, 'styles');
  const files = (await readdir(dir)).filter(f => f.endsWith('.css')).sort();
  const parts = [];
  for (const f of files) {
    parts.push('/* ===== ' + f + ' ===== */\n' + await readFile(join(dir, f), 'utf8'));
  }
  return parts.join('\n\n');
}

/**
 * Resolve the module graph depth-first from an entry file and concatenate in
 * dependency order. Import/export keywords are stripped: everything lands in
 * one scope, which is what the single-file output needs.
 */
const IMPORT_RE = /^[ \t]*import[^\n]*?['\"](\.\.?\/[^'\"]+)['\"][ ;]*$/gm;
const BARE_IMPORT_RE = /^[ \t]*import[ \t]+['\"](\.\?\/[^'\"]+)['\"][ ;]*$/gm;

async function buildJs(entry) {
  const seen = new Set();
  const out = [];

  async function visit(absPath) {
    if (seen.has(absPath)) return;
    seen.add(absPath);

    const code = await readFile(absPath, 'utf8');
    const here = dirname(absPath);

    // depth-first: dependencies are emitted before whatever imports them
    for (const m of code.matchAll(IMPORT_RE)) {
      let spec = m[1];
      if (!spec.endsWith('.js')) spec += '.js';
      await visit(resolve(here, spec));
    }

    const stripped = code
      .replace(IMPORT_RE, '')
      .replace(/^[ \t]*export[ \t]+default[ \t]+/gm, '')
      .replace(/^[ \t]*export[ \t]+(?=(const|let|var|function|class|async)\b)/gm, '')
      .replace(/^[ \t]*export[ \t]*{[^}]*}[ ;]*$/gm, '');

    out.push('/* ===== src/' + toPosix(relative(SRC, absPath)) + ' ===== */\n' + stripped.trim());
  }

  await visit(join(SRC, entry));
  return out.join('\n\n');
}

async function build() {
  const [css, js, shell] = await Promise.all([
    buildCss(),
    buildJs('main.js'),
    readFile(join(SRC, 'index.html'), 'utf8'),
  ]);

  const html = shell
    .replace('/*__CSS__*/', () => css)
    .replace('/*__JS__*/', () => js);

  // The whole point of the artifact: it must work with no network at all.
  const external = html.match(/(?:src|href)="https?:\/\/|@import\s+url\(|cdn\.|unpkg\.|jsdelivr/g);
  if (external) throw new Error('External reference found: ' + external.join(', '));

  await mkdir(DIST, { recursive: true });
  await writeFile(join(DIST, 'prototype.html'), html);

  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log('built dist/prototype.html — ' + kb + ' KB, ' + html.split('\n').length + ' lines');
}

await build();

if (process.argv.includes('--watch')) {
  console.log('watching src/ …');
  let t;
  watch(SRC, { recursive: true }, () => {
    clearTimeout(t);
    t = setTimeout(() => build().catch(e => console.error(e.message)), 80);
  });
}
