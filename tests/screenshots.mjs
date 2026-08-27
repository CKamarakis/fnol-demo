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
  ['driver-de', { persona: 'driver', screen: 's0', scenario: 'glass', lang: 'de' }],
  ['driver-pl', { persona: 'driver', screen: 's0', scenario: 'theft', lang: 'pl' }],
  ['driver-theft', { persona: 'driver', screen: 's0', scenario: 'theft' }],
  ['driver-theft-tier1', { persona: 'driver', screen: 's1', scenario: 'theft', notes: false }],
  ['driver-theft-photos', { persona: 'driver', screen: 'photos', scenario: 'theft', navStack: ['s0'], notes: false }],
  ['driver-theft-police', { persona: 'driver', screen: 'police', scenario: 'theft', navStack: ['s0'], notes: false }],
  // emgFrom is what the 112 screen's Back control points at. A deep link
  // that omits it renders the screen without a back bar, which is correct in
  // the app and wrong for a screenshot meant to show the finished screen.
  ['driver-emg', { persona:'driver', screen:'emg', scenario:'collision', emgFrom:'s0' }],
  ['driver-tier1', { persona: 'driver', screen: 's1', draft: null }],
  ['driver-photos', { persona: 'driver', screen: 'photos', scenario: 'collision', navStack: ['s0'], notes: false }],
  ['driver-otherins', { persona: 'driver', screen: 'otherins', scenario: 'collision', navStack: ['s0'], notes: false }],
  ['driver-photos-glass', { persona: 'driver', screen: 'photos', scenario: 'glass', navStack: ['s0'], notes: false }],
  ['driver-archive', { persona: 'driver', screen: 'archive', scenario: 'collision', navStack: ['done'], notes: false }],
  ['driver-done', { persona: 'driver', screen: 'done', scenario: 'glass', navStack: ['photos'], notes: false }],
  ['driver-archive-full', { persona: 'driver', screen: 'archive', scenario: 'collision', navStack: ['done'], notes: false, draft: { injured:true, injuredParties:['driver','pedestrian'], injurySeverity:['walking'], injuryEmergency:true, cargoLaden:true, cargoDesc:'24 pallets, packaged food', trailer:'B-RL 8829', hazardous:true, witnessPresent:true, witnessName:'Anna', witnessPhone:'+49 170 000', policeAttended:true, policeRef:'2026/074/0084217', otherPlate:'M-XY 1234', otherMake:'Silver Sprinter', otherDriver:'Jan', otherPhone:'+49 171 111', otherInsurer:'Some Insurer', otherPolicy:'POL-99', easA:[1,5], easB:[12], sigA:'x', sigB:'x', sketch:'x' } }],
  ['driver-cargo', { persona: 'driver', screen: 'cargo', scenario: 'collision', navStack: ['s0'], notes: false }],
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
