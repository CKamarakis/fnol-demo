/**
 * Screenshots of the built prototype, via headless Chrome.
 *
 * jsdom proves the app works; it has no layout engine, so it cannot show
 * whether anything is misaligned, overflowing or overlapping. Several real
 * defects here were invisible to every other check and obvious in a picture.
 *
 * Uses the installed Chrome directly — no Playwright, no Puppeteer, nothing
 * added to the dependency tree.
 *
 *   node tests/screenshots.mjs [outDir]
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || join(ROOT, 'screenshots');
const TARGET = join(ROOT, 'dist', 'prototype.html');

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const chrome = CHROME_CANDIDATES.find(p => existsSync(p));
if (!chrome) {
  console.error('No Chrome or Edge found. Install one, or open dist/prototype.html by hand.');
  process.exit(1);
}

const toUrl = p => `file:///${p.split('\\').join('/')}`;

/**
 * Each shot seeds localStorage and then redirects, because the app restores
 * its own state on boot — that is cheaper and less brittle than scripting
 * clicks through the CLI.
 */
const SHOTS = [
  ['driver-cold-open', { persona: 'driver', screen: 's0' }],
  ['driver-notes-on', { persona: 'driver', screen: 's0', notes: true }],
  ['driver-glass', { persona: 'driver', screen: 's0', scenario: 'glass' }],
  ['driver-theft', { persona: 'driver', screen: 's0', scenario: 'theft' }],
  // emgFrom is what the 112 screen's Back control points at. A deep link
  // that omits it renders the screen without a back bar, which is correct in
  // the app and wrong for a screenshot meant to show the finished screen.
  ['driver-emg', { persona:'driver', screen:'emg', scenario:'collision', emgFrom:'s0' }],
  ['driver-tier1', { persona: 'driver', screen: 's1', draft: null }],
  ['fleet', { persona: 'fleet' }],
  ['system', { persona: 'system' }],
  ['system-telematics', { persona: 'system', sysTab: 'telematics', scenario: 'collision' }],
];

mkdirSync(OUT, { recursive: true });

for (const [name, state] of SHOTS) {
  const seed = join(OUT, `.seed-${name}.html`);
  writeFileSync(seed, [
    '<!doctype html><meta charset="utf-8"><script>',
    `localStorage.setItem('fnol.demo.v1', ${JSON.stringify(JSON.stringify(state))});`,
    `location.replace(${JSON.stringify(toUrl(TARGET))});`,
    '</script>',
  ].join(''));

  const png = join(OUT, `${name}.png`);
  const r = spawnSync(chrome, [
    '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--window-size=1440,1100',
    `--screenshot=${png}`,
    '--virtual-time-budget=4000',
    toUrl(seed),
  ], { encoding: 'utf8' });

  const ok = (r.stderr || '').includes('written to file');
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}.png`);
}

console.log(`\nscreenshots in ${OUT}`);
