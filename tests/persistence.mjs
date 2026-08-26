/**
 * The app must survive whatever is already in localStorage.
 *
 * The artifact is emailed around and opened repeatedly on the same laptop, so
 * the state in storage is routinely OLDER than the build reading it. Store.load
 * does `Object.assign(this.s, parsed)` — every key in storage overwrites a
 * default, including keys this build has never heard of and values it cannot
 * use. A screen name that no longer exists, a null where an object is expected,
 * or a language that has been removed all land straight in the live state.
 *
 * Two failures this session were never reproduced from a clean boot and were
 * most likely exactly this. A blank or half-rendered app is the worst possible
 * outcome for a file whose whole purpose is to open on someone else's machine.
 *
 * Every case below asserts the same floor: the app still mounts, still renders,
 * and still responds to a click.
 *
 *   node tests/persistence.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'dist', 'prototype.html'), 'utf8');
const LS_KEY = 'fnol.demo.v1';

let failed = 0;
const check = (ok, msg, detail) => {
  if (ok) console.log(`pass  ${msg}`);
  else { console.error(`FAIL  ${msg}${detail ? `\n      ${detail}` : ''}`); failed++; }
};

const IGNORE = /HTMLCanvasElement.prototype.getContext/;

/** Boot with a literal string already in storage — not an object, because the
    corruption cases are not valid JSON and must be written raw. */
async function bootRaw(rawValue) {
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
      if (rawValue !== undefined) {
        try { w.localStorage.setItem(LS_KEY, rawValue); } catch { /* ignore */ }
      }
    },
  });

  await new Promise(r => setTimeout(r, 260));
  const { window } = dom;
  const doc = window.document;
  return {
    errors, doc, window,
    text: () => doc.querySelector('#root')?.textContent || '',
    close: () => window.close(),
  };
}

const boot = state => bootRaw(state === undefined ? undefined : JSON.stringify(state));

/** The floor every case has to clear: mounted, visible, and still interactive. */
async function assertUsable(app, label) {
  check(app.errors.length === 0, `${label}: boots without console errors`,
    app.errors.slice(0, 2).join(' | '));

  const root = app.doc.querySelector('#root');
  check(!!root && root.children.length > 0, `${label}: renders content`);
  check(app.text().trim().length > 20, `${label}: screen is not blank`,
    `rendered ${app.text().trim().length} chars`);

  // Interactive, not merely painted: a frozen screen looks fine in a DOM dump.
  const control = app.doc.querySelector('#root [data-act]');
  check(!!control, `${label}: offers at least one control`);
  if (control) {
    const before = app.errors.length;
    control.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    check(app.errors.length === before, `${label}: clicking does not throw`,
      app.errors.slice(before, before + 2).join(' | '));
  }
}

/* ------------------------------------------------------------------ *
 * 1 · Nothing stored. The genuinely cold open.
 * ------------------------------------------------------------------ */
{
  const app = await boot(undefined);
  await assertUsable(app, 'no stored state');
  check(/is everyone okay/i.test(app.text()),
    'no stored state: lands on the cold open');
  app.close();
}

/* ------------------------------------------------------------------ *
 * 2 · Corrupt storage. Truncated writes and hand-edited values.
 * ------------------------------------------------------------------ */
const CORRUPT = [
  ['not JSON at all', 'this is not json'],
  ['empty string', ''],
  ['a bare number', '42'],
  ['a JSON null', 'null'],
  ['a JSON array', '[1,2,3]'],
  ['truncated object', '{"persona":"driver","screen":'],
  ['a quoted string', '"driver"'],
];

for (const [label, raw] of CORRUPT) {
  const app = await bootRaw(raw);
  await assertUsable(app, label);
  app.close();
}

/* ------------------------------------------------------------------ *
 * 3 · Structurally valid, semantically wrong.
 *
 * This is the dangerous class: JSON.parse succeeds, Object.assign copies it
 * in, and the value only detonates when something reads it. A screen key
 * removed in a later build is the exact shape of "my app stopped working
 * and yours is fine".
 * ------------------------------------------------------------------ */
const STALE = [
  ['unknown screen', { persona: 'driver', screen: 'screen-that-no-longer-exists' }],
  ['unknown persona', { persona: 'auditor', screen: 's0' }],
  ['unknown scenario', { persona: 'driver', screen: 's0', scenario: 'meteorite' }],
  ['removed language', { persona: 'driver', screen: 's0', lang: 'xx' }],
  ['null draft', { persona: 'driver', screen: 's1', draft: null }],
  ['null fail block', { persona: 'driver', screen: 's0', fail: null }],
  ['fail missing keys', { persona: 'driver', screen: 's0', fail: {} }],
  ['navStack not an array', { persona: 'driver', screen: 's1', navStack: 'nope' }],
  ['navStack of dead screens', { persona: 'driver', screen: 's1', navStack: ['ghost', 'gone'] }],
  ['incidents not an array', { persona: 'fleet', incidents: 'many' }],
  ['log not an array', { persona: 'system', log: null }],
  ['draft missing every field', { persona: 'driver', screen: 's1', draft: {} }],
  ['emg with no origin', { persona: 'driver', screen: 'emg', emgFrom: null }],
  ['emg from a dead screen', { persona: 'driver', screen: 'emg', emgFrom: 'ghost' }],
  ['numbers where strings go', { persona: 'driver', screen: 's0', lang: 7, scenario: 9 }],
  ['a key from no build', { persona: 'driver', screen: 's0', somethingInvented: { deep: true } }],
];

for (const [label, state] of STALE) {
  const app = await boot(state);
  await assertUsable(app, label);
  app.close();
}

/* ------------------------------------------------------------------ *
 * 4 · A real session survives a reload.
 *
 * The ordinary case, and the one a driver actually depends on: answers given
 * before the phone was locked are still there afterwards.
 * ------------------------------------------------------------------ */
{
  const app = await boot({ persona: 'driver', screen: 's0', scenario: 'glass' });

  const fine = app.doc.querySelector('#root [data-act="s0-fine"]');
  check(!!fine, 'round-trip: cold open offers its CTA');
  if (fine) {
    fine.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 120));
    // Answer something ON the six questions. The cold open deliberately
    // records nothing — it routes to 112 or it does not — so a real answer
    // has to come from the screen that asks it.
    const injured = app.doc.querySelector('#root [data-act="set-injured"][data-v="no"]');
    if (injured) {
      injured.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
    }
  }

  const saved = app.window.localStorage.getItem(LS_KEY);
  check(!!saved, 'round-trip: answering wrote state to storage');
  app.close();

  if (saved) {
    const parsed = JSON.parse(saved);
    check(parsed.screen === 's1',
      'round-trip: the screen the driver reached was persisted',
      `stored screen was "${parsed.screen}"`);
    check(parsed.draft && parsed.draft.injured === false,
      'round-trip: the answer itself was persisted, not just the position');

    // Reopening is the whole point: nothing entered is lost.
    const again = await bootRaw(saved);
    await assertUsable(again, 'round-trip reload');
    check(/verify the tracker/i.test(again.text()),
      'round-trip: reopening returns to the same screen');
    again.close();
  }
}

/* ------------------------------------------------------------------ *
 * 5 · Storage that throws.
 *
 * Private windows and locked-down browsers make localStorage itself raise on
 * read. The file is emailed to strangers; it cannot require working storage.
 * ------------------------------------------------------------------ */
{
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
      // Every access throws, the way a hardened browser behaves.
      Object.defineProperty(w, 'localStorage', {
        configurable: true,
        get() { throw new Error('SecurityError: localStorage is not available'); },
      });
    },
  });

  await new Promise(r => setTimeout(r, 260));
  const doc = dom.window.document;
  const txt = doc.querySelector('#root')?.textContent || '';

  check(errors.length === 0, 'storage that throws: boots without console errors',
    errors.slice(0, 2).join(' | '));
  check(txt.trim().length > 20, 'storage that throws: still renders the app',
    `rendered ${txt.trim().length} chars`);
  dom.window.close();
}

console.log(failed ? `\n${failed} persistence assertion(s) failed` : '\nall persistence assertions passed');
process.exit(failed ? 1 : 0);
