/**
 * Build: React + JSX source in src/ -> a single self-contained
 * dist/prototype.html.
 *
 * esbuild bundles and minifies the app (React included) into one IIFE, and
 * the CSS is concatenated in filename order. Both are inlined into the HTML
 * shell, so the output still opens by double-click with no server and no
 * network — that property is the whole point of the artifact and is enforced
 * by tests/integrity.mjs.
 *
 *   node build/build.mjs            build once
 *   node build/build.mjs --watch    rebuild on change
 */
import { readFile, writeFile, rename, mkdir, readdir } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import * as esbuild from 'esbuild';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

/** Numeric filename prefixes are the cascade order. */
async function buildCss() {
  const dir = join(SRC, 'styles');
  const files = (await readdir(dir)).filter(f => f.endsWith('.css')).sort();
  const parts = [];
  for (const f of files) {
    parts.push(`/* ===== ${f} ===== */\n${await readFile(join(dir, f), 'utf8')}`);
  }
  return parts.join('\n\n');
}

async function buildJs() {
  const result = await esbuild.build({
    entryPoints: [join(SRC, 'main.jsx')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    jsx: 'automatic',
    minify: true,
    write: false,
    legalComments: 'none',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  return result.outputFiles[0].text;
}

async function build() {
  const [css, js, shell] = await Promise.all([
    buildCss(),
    buildJs(),
    readFile(join(SRC, 'index.html'), 'utf8'),
  ]);

  const html = shell
    .replace('/*__CSS__*/', () => css)
    .replace('/*__JS__*/', () => js);

  // Non-negotiable: the file is emailed and opened offline on other machines.
  const external = html.match(/(?:src|href)="https?:\/\/|@import\s+url\(|cdn\.\w|unpkg\.|jsdelivr/g);
  if (external) throw new Error(`External reference found: ${external.join(', ')}`);

  await mkdir(DIST, { recursive: true });

  /* Write to a temporary file, then rename over the target.
     writeFile truncates first and then streams ~360 KB in. Anyone reading the
     file during that window — tests/serve.mjs does a fresh readFile on every
     request, and `npm run watch` rebuilds while a browser tab is open — gets a
     TRUNCATED bundle. It parses, React mounts and the screen paints, but the
     tail of the IIFE never runs, so the delegated click listener is never
     registered: every button on screen is dead, with nothing in the console.
     Three separate "the CTAs stopped working" reports had exactly that shape
     and none reproduced afterwards, because the next read got a whole file.
     rename() is atomic on the same filesystem, so a reader sees either the
     previous complete build or the new one, never a half of either. */
  const target = join(DIST, 'prototype.html');
  const tmp = join(DIST, `.prototype.html.${process.pid}.tmp`);
  await writeFile(tmp, html);
  await rename(tmp, target);

  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`built dist/prototype.html — ${kb} KB`);
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
