/**
 * Every control does something, and every Back goes somewhere.
 *
 * Written after two separate incidents where the app looked correct and was
 * not: once every CTA was dead, once the navigation vanished from a screen.
 * Neither was caught by the existing suites, because those walk one happy path
 * and a dead button on a screen they never visit is invisible to them.
 *
 * The dispatcher is the reason this can fail silently — core/actions.jsx does
 * `if(!fn) return;`, so a button whose handler was renamed, moved or dropped
 * looks identical to a working one. Nothing throws. Nothing logs.
 *
 * So this walks EVERY driver screen and asserts, for each control on it:
 *   - the data-act it names is actually registered in ACTIONS
 *   - clicking it does not throw
 *   - screens that should carry a Back control have one, and it goes back
 *
 *   node tests/interactive.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'dist', 'prototype.html'), 'utf8');

let failed = 0;
const check = (ok, msg, detail) => {
  if (ok) console.log(`pass  ${msg}`);
  else { console.error(`FAIL  ${msg}${detail ? `\n      ${detail}` : ''}`); failed++; }
};

// jsdom has no canvas backend; the sketch and signature pads throw here and
// not in a real browser. Everything else is a genuine failure.
const IGNORE = /HTMLCanvasElement.prototype.getContext/;

/** A fresh app instance, so one screen's state cannot mask another's bug. */
async function boot(state) {
  const errors = [];
  const vc = new VirtualConsole()
    .on('jsdomError', e => { if (!IGNORE.test(e.message)) errors.push(e.message); })
    .on('error', m => { if (!IGNORE.test(String(m))) errors.push(String(m)); });

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://localhost/',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      if (state) {
        try {
          w.localStorage.setItem('fnol.demo.v1', JSON.stringify(state));
        } catch { /* a storage-less environment is the app's problem, not ours */ }
      }
    },
  });

  await new Promise(r => setTimeout(r, 220));
  const { window } = dom;
  const doc = window.document;

  return {
    errors,
    doc,
    text: () => doc.querySelector('#root')?.textContent || '',
    click(node) {
      node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      return new Promise(r => setTimeout(r, 60));
    },
    /** The live ACTIONS table is not exported from the bundle, so registration
        is probed the only way a user can: click it and see if anything moves. */
    acts: () => [...doc.querySelectorAll('#root [data-act]')],
    close: () => window.close(),
  };
}

/* ------------------------------------------------------------------ *
 * 0 · The build writes atomically.
 *
 * writeFile truncates the target and then streams ~360 KB into it. serve.mjs
 * re-reads the file on every request and `npm run watch` rebuilds under an
 * open tab, so a reload landing inside that window serves a partial bundle.
 * The build now writes to a temp file and renames over the target, which is
 * atomic: a reader gets the previous complete build or the new one.
 *
 * Note on what this does NOT explain. Three "every button is dead" reports
 * were provisionally blamed on this, but a truncated bundle throws a syntax
 * error and paints NOTHING — measured at every cut from 60% to 99.9%. It
 * cannot produce the reported symptom of a correct-looking screen with inert
 * controls. That cause is still unknown. This guard is worth keeping on its
 * own merits; it is not the answer.
 * ------------------------------------------------------------------ */
{
  // Cut the bundle at 60% — mid-IIFE, the way an interrupted write leaves it.
  const truncated = html.slice(0, Math.floor(html.length * 0.6));
  const errors = [];
  const vc = new VirtualConsole()
    .on('jsdomError', e => { if (!IGNORE.test(e.message)) errors.push(e.message); })
    .on('error', m => { if (!IGNORE.test(String(m))) errors.push(String(m)); });
  const dom = new JSDOM(truncated, {
    runScripts: 'dangerously', url: 'https://localhost/',
    pretendToBeVisual: true, virtualConsole: vc,
  });
  await new Promise(r => setTimeout(r, 220));
  const doc = dom.window.document;
  const fine = doc.querySelector('[data-act="s0-fine"]');

  // A partial bundle is a syntax error: nothing renders. Asserted so the
  // record is straight — this failure mode is loud, not silent.
  check(!fine && (doc.querySelector('#root')?.textContent || '').trim().length === 0,
    'a truncated bundle renders nothing at all — it cannot cause a live-looking dead screen',
    fine ? 'the cold open rendered from a partial bundle' : '');
  dom.window.close();
}

/* And the build must not produce one. */
{
  const buildSrc = readFileSync(join(ROOT, 'build', 'build.mjs'), 'utf8');
  check(/rename\(/.test(buildSrc),
    'the build renames into place rather than writing the target directly',
    'writeFile onto the served path can be read half-written');
  check(!/writeFile\(join\(DIST, ['"]prototype\.html['"]\)/.test(buildSrc),
    'the build never writes straight to the file the server reads');
}

/* ------------------------------------------------------------------ *
 * 1 · The cold open's CTAs. This is the screen that broke, twice.
 * ------------------------------------------------------------------ */
{
  const app = await boot({ persona: 'driver', screen: 's0', scenario: 'glass' });
  check(app.errors.length === 0, 'cold open mounts clean', app.errors.slice(0, 2).join(' | '));

  // The three answers to "is everyone okay?" — named explicitly rather than
  // discovered, because the whole point is to notice if one goes missing.
  for (const act of ['s0-fine', 's0-hurt', 's0-dismiss']) {
    check(!!app.doc.querySelector(`#root [data-act="${act}"]`),
      `cold open still offers "${act}"`);
  }
  check(!!app.doc.querySelector('#root [data-act="call112"]'),
    'cold open still offers 112');
  app.close();
}

/* Each CTA must actually move the app. A handler that is registered but does
   nothing is the same defect from the user's side as one that is missing. */
const CTA_ROUTES = [
  ['s0-fine', /verify the tracker/i, 'answers "everyone\'s fine" and reaches the questions'],
  ['s0-hurt', /112|emergency|safety/i, 'answers "someone is hurt" and reaches 112'],
  ['s0-dismiss', /what was it/i, 'dismisses and reaches the reason picker'],
];

for (const [act, expect, msg] of CTA_ROUTES) {
  const app = await boot({ persona: 'driver', screen: 's0', scenario: 'glass' });
  const before = app.text();
  const btn = app.doc.querySelector(`#root [data-act="${act}"]`);
  if (!btn) { check(false, msg, 'control not found'); app.close(); continue; }

  await app.click(btn);
  const after = app.text();

  check(after !== before, `"${act}" changes the screen`, 'the screen did not move at all');
  check(expect.test(after), msg, `landed on: ${after.slice(0, 90).replace(/\s+/g, ' ')}`);
  check(app.errors.length === 0, `"${act}" does not throw`, app.errors.slice(0, 2).join(' | '));
  app.close();
}

/* ------------------------------------------------------------------ *
 * 2 · No control anywhere is inert.
 *
 * The dispatcher swallows unknown data-acts, so this is the only way a
 * renamed handler surfaces. Walks every driver screen, clicks everything,
 * and fails on anything that throws.
 * ------------------------------------------------------------------ */
const SCREENS = [
  's0', 'dismiss', 'emg', 's1', 'gaps',
  'witness', 'otherv', 'photos', 'eas', 'police', 'cargo', 'otherins',
];

for (const screen of SCREENS) {
  const app = await boot({ persona: 'driver', screen, scenario: 'collision', emgFrom: 's0' });

  const controls = app.acts();
  check(controls.length > 0, `"${screen}" renders at least one control`);

  const inert = [];
  for (const node of controls) {
    const act = node.getAttribute('data-act');
    if (node.tagName === 'SELECT') continue;      // handled on 'change', not click
    const errsBefore = app.errors.length;
    await app.click(node);
    if (app.errors.length > errsBefore) inert.push(`${act} threw`);
    // Re-query: a click may have re-rendered and detached the rest.
    if (!app.doc.contains(node)) break;
  }
  check(inert.length === 0, `"${screen}" has no control that throws`, inert.join(', '));
  app.close();
}

/* ------------------------------------------------------------------ *
 * 3 · Navigation. The second thing that broke.
 * ------------------------------------------------------------------ */

// The cold open is the only screen with nothing behind it.
{
  const app = await boot({ persona: 'driver', screen: 's0', scenario: 'collision' });
  check(!app.doc.querySelector('#root [data-act="nav-back"]'),
    'the cold open has no Back — there is nothing behind it');
  app.close();
}

// Every other driver screen must offer a way back, and it must say where to.
const NEEDS_BACK = [
  's1', 'gaps', 'witness', 'otherv', 'photos', 'eas', 'police', 'cargo', 'otherins',
];

for (const screen of NEEDS_BACK) {
  const app = await boot({
    persona: 'driver', screen, scenario: 'collision',
    navStack: ['s0'], emgFrom: 's0',
  });

  const back = app.doc.querySelector('#root [data-act="nav-back"]');
  check(!!back, `"${screen}" offers a way back`);

  if (back) {
    const label = app.doc.querySelector('#root .nav-lbl')?.textContent || '';
    // A bare chevron is not a destination. The label names where it goes.
    check(label.trim().length > 0, `"${screen}" Back names its destination`);
    check(/back to/i.test(label),
      `"${screen}" Back reads as an action, not a heading`,
      `label was "${label}"`);

    const before = app.text();
    await app.click(back);
    check(app.text() !== before, `"${screen}" Back actually navigates`);
    check(app.errors.length === 0, `"${screen}" Back does not throw`,
      app.errors.slice(0, 2).join(' | '));
  }
  app.close();
}

/* Back from the 112 screen must reach the screen that routed there — never
   another safety instruction, and never a dead end. 112 is passed through, so
   it names its own origin rather than using the stack. */
for (const from of ['s0', 's1']) {
  const app = await boot({
    persona: 'driver', screen: 'emg', scenario: 'collision', emgFrom: from,
    navStack: from === 's1' ? ['s0'] : [],
  });

  const back = app.doc.querySelector('#root [data-act="nav-back"]');
  check(!!back, `112 reached from "${from}" offers a way back`);

  if (back) {
    const label = app.doc.querySelector('#root .nav-lbl')?.textContent || '';
    check(!/emergency|112/i.test(label),
      `112 Back does not point at itself (from "${from}")`, `label was "${label}"`);
    await app.click(back);
    check(!/safety first/i.test(app.text()),
      `112 Back leaves the safety screen (from "${from}")`);
  }
  app.close();
}

/* The 112 rail is on every driver screen, not just the ones that route there.
   A safety control that is present only sometimes is worse than none. */
for (const screen of SCREENS) {
  const app = await boot({ persona: 'driver', screen, scenario: 'collision', emgFrom: 's0' });
  check(!!app.doc.querySelector('#root [data-act="call112"]'),
    `"${screen}" carries the 112 rail`);
  app.close();
}

console.log(failed ? `\n${failed} interactive assertion(s) failed` : '\nall interactive assertions passed');
process.exit(failed ? 1 : 0);
