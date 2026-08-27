/**
 * Photo capture, driven in real Chrome.
 *
 * The capture path is FileReader -> Image -> canvas -> data URL. jsdom has no
 * raster and no real Blob plumbing, so `render.mjs` and `interactive.mjs` can
 * click the slot and prove nothing about what a camera actually produces. This
 * suite feeds a real 1200x900 JPEG File to the input the handler creates and
 * asserts three things that have each broken in this codebase's lifetime:
 * the thumbnail reaches the slot, the byte count is real rather than random,
 * and the pixels never reach localStorage — which is 5 MB for the whole app
 * against a 3-6 MB phone photo.
 *
 * Skips (exit 0) when Chrome is absent, like screenshots.mjs.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(ROOT, 'dist', 'prototype.html');

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chrome = CANDIDATES.find(p => { try { return existsSync(p); } catch { return false; } });

if (!chrome) {
  console.log('skip  capture: no Chrome found (set CHROME_PATH)');
  process.exit(0);
}
if (!existsSync(TARGET)) {
  console.error('FAIL  capture: dist/prototype.html missing — run npm run build');
  process.exit(1);
}

const TMP = join(ROOT, 'screenshots');
mkdirSync(TMP, { recursive: true });

// The assertions must run inside the prototype's own document — same origin,
// same store, same React tree. Headless Chrome has no way to inject into a
// page it loads, so the probe is appended to a throwaway COPY of the artifact.
// dist/prototype.html itself is never touched.
const built = readFileSync(TARGET, 'utf8');
const probeSrc = readFileSync(join(ROOT, 'tests', 'probe-capture.js'), 'utf8');
const probedFile = join(TMP, '.capture-probed.html');
writeFileSync(probedFile, built.replace('</body>', `<script>${probeSrc}</script></body>`));

// A file:// page cannot seed another file:// page's localStorage on a modern
// Chrome, so the seed writes state and then replaces itself with the probed
// copy — same document, same origin, state already in place.
const seed = join(TMP, '.capture-seed.html');
writeFileSync(seed, `<!doctype html><meta charset="utf-8"><script>
localStorage.setItem('fnol.demo.v1', ${JSON.stringify(JSON.stringify({
  persona: 'driver', screen: 'photos', scenario: 'glass', navStack: ['s0'], notes: false,
}))});
location.replace(${JSON.stringify(pathToFileURL(probedFile).href)});
</script>`);

const r = spawnSync(chrome, [
  '--headless', '--disable-gpu', '--no-sandbox',
  '--allow-file-access-from-files',
  '--virtual-time-budget=15000',
  '--dump-dom',
  pathToFileURL(seed).href,
], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// Read the result element, not the raw text: the probe's own source is in the
// dump too, and scanning for the marker finds the script before the answer.
const dom = r.stdout || '';
const m = dom.match(/<pre id="probe-result">PROBE_RESULT:([^<]*)<\/pre>/);

for (const f of [seed, probedFile]) { try { rmSync(f); } catch {} }

if (!m) {
  console.error('FAIL  capture: probe never reported');
  console.error((r.stderr || '').split('\n').slice(0, 6).join('\n'));
  process.exit(1);
}

const result = m[1].trim();
console.log((result.startsWith('PASS') ? 'pass  ' : 'FAIL  ') + 'capture: ' + result);
process.exit(result.startsWith('PASS') ? 0 : 1);
