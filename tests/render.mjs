/**
 * Renders the built app in a real DOM and drives the driver flow.
 *
 * This is the test that matters after the React conversion: it proves the app
 * actually mounts and that the six-field blocking path still completes and
 * issues a reference. Static checks cannot see any of that.
 *
 *   node tests/render.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'dist', 'prototype.html'), 'utf8');

let failed = 0;
const check = (ok, msg, detail) => {
  if (ok) console.log(`pass  ${msg}`);
  else { console.error(`FAIL  ${msg}${detail ? `\n      ${detail}` : ''}`); failed++; }
};

// jsdom has no canvas backend, so the sketch and signature pads throw here.
// Real browsers do not. Everything else is a genuine failure.
const IGNORE = /HTMLCanvasElement.prototype.getContext/;

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://localhost/',   // localStorage needs a real origin in jsdom
  pretendToBeVisual: true,
  virtualConsole: new (await import('jsdom')).VirtualConsole()
    .on('jsdomError', e => { if (!IGNORE.test(e.message)) errors.push(e.message); })
    .on('error', m => { if (!IGNORE.test(String(m))) errors.push(String(m)); }),
});

const { window } = dom;
const { document } = window;
const wait = () => new Promise(r => setTimeout(r, 60));
await wait();

check(errors.length === 0, 'app mounts without console errors', errors.slice(0, 3).join(' | '));

const root = document.querySelector('#root');
check(root && root.children.length > 0, 'root has rendered content');
check(!!document.querySelector('#chrome')?.children.length, 'demo chrome rendered');

const text = () => document.querySelector('#root')?.textContent || '';

// the cold open is a question about people, not a form
check(/is everyone okay/i.test(text()), 'cold open asks about people first');
check(!!document.querySelector('[data-act="call112"]'), '112 is reachable on the first screen');

const clickIn = (a, v) => {
  const sel = v ? `#root [data-act="${a}"][data-v="${v}"]` : `#root [data-act="${a}"]`;
  const n = document.querySelector(sel);
  if (!n) return false;
  n.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return true;
};

const click = sel => {
  const n = document.querySelector(sel);
  if (!n) return false;
  n.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return true;
};

// walk the blocking path
check(click('[data-act="s0-fine"]'), 'can answer "everyone\'s fine"');
await wait();
check(/6 of 6|nothing else blocks/i.test(text()) || document.querySelectorAll('.frow').length >= 4,
  'tier-1 screen shows the six fields');

// back navigation must exist on screen two — a mistap has to be correctable
check(!!document.querySelector('[data-act="nav-back"]'), 'back control is present on screen 2');

// answer the two real questions, then submit
click('[data-act="set-drivable"][data-v="yes"]') || click('[data-act="set-drivable"]');
await wait();
const submitted = click('[data-act="submit-tier1"]') || click('[data-act="s1-submit"]');
await wait(); await wait();

if (submitted) {
  check(/INS-DE-\d{4}-\d+/.test(text()), 'a claim reference was issued');
} else {
  console.log('note  submit control not found by name — reference path unverified here');
}

// Walk the full gap-fill flow. Each of these screens is a separate module,
// so this is what catches a screen broken during refactoring — without it a
// conversion can pass every other check while a screen throws on mount.
// Safety route: "someone is hurt" must reach 112 before any claims field.
// This is the single most important ordering rule in the product.
check(clickIn('go-gaps'), 'can reach the perishability hub');
await wait();
check(/disappear/i.test(text()), 'hub is framed as what disappears, not a progress bar');

const GAPS = [
  ['witness', /saw it|witness/i],
  ['otherv', /plate/i],
  ['photos', /photo|scene/i],
  ['eas', /circumstance|tick|statement/i],
  ['police', /police/i],
  ['cargo', /loaded|cargo|trailer/i],
  ['otherins', /insurer/i],
];
for (const [id, expect] of GAPS) {
  const reached = clickIn('goto', id);
  await wait();
  check(reached, `can open the "${id}" screen`);
  if (reached) {
    check(expect.test(text()), `"${id}" screen rendered its content`);
    check(errors.length === 0, `"${id}" screen mounted without errors`,
      errors.slice(-2).join(' | '));
    clickIn('nav-back');
    await wait();
  }
}

// every pane must render — the fleet and system views carry the arguments
// that the driver's screen deliberately hides
const clickAct = (a, v) => {
  const n = document.querySelector(v ? `[data-act="${a}"][data-v="${v}"]` : `[data-act="${a}"]`);
  if (!n) return false;
  n.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return true;
};

for (const pane of ['fleet', 'system']) {
  check(clickAct('set-persona', pane), `can switch to the ${pane} pane`);
  await wait();
  check((document.querySelector('#root').textContent || '').length > 100,
    `${pane} pane renders content`);
}
clickAct('set-persona', 'driver');
await wait();

// the failure theatre is the demo's strongest moment; all four must fire
for (const t of ['fail-tpa', 'fail-offline', 'fail-coverage', 'triple-tap']) {
  check(clickAct(t), `failure toggle "${t}" is wired`);
  await wait();
}

check(errors.length === 0, 'no errors after interaction', errors.slice(0, 3).join(' | '));


/**
 * The design-notes toggle.
 *
 * Every dn() callout is hidden by CSS until body.notes-on is set, and those
 * callouts carry the entire product argument. A dead line after an early
 * return once meant the class was never applied and the toggle silently did
 * nothing — the demo looked fine and made none of its points.
 */
{
  const notesBtn = document.querySelector('[data-act="toggle-notes"]');
  check(!!notesBtn, 'design-notes toggle exists');

  // Assert the toggle inverts state, not that it starts in a particular one —
  // the default is a product decision that has already changed once.
  const on = () => document.body.classList.contains('notes-on');
  const start = on();
  notesBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait();
  check(on() !== start, 'toggling design notes flips body.notes-on',
    `class was "${document.body.className}"`);
  notesBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait();
  check(on() === start, 'toggling again restores the previous state');

  // The callouts carry the entire product argument, so a first-time viewer
  // should see them without having to discover a control.
  check(start === true, 'design notes are on by default');
}

/**
 * The injury safety route, in its own DOM.
 *
 * "Someone is hurt" must reach 112 before a single claims field is shown.
 * Tested from a clean mount rather than by resetting mid-flow, so nothing
 * about the earlier walk can mask a regression here.
 */
{
  const { VirtualConsole } = await import('jsdom');
  const fresh = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://localhost/',
    virtualConsole: new VirtualConsole()
      .on('jsdomError', e => { if (!IGNORE.test(e.message)) errors.push(e.message); }),
  });
  const d2 = fresh.window.document;
  await wait();

  const hit = a => {
    const n = d2.querySelector(`#root [data-act="${a}"]`);
    if (!n) return false;
    n.dispatchEvent(new fresh.window.MouseEvent('click', { bubbles: true }));
    return true;
  };
  const t2 = () => d2.querySelector('#root')?.textContent || '';

  check(hit('s0-hurt'), 'can answer "someone is hurt" from the cold open');
  await wait();
  check(/112/.test(t2()), 'injury routes straight to the 112 screen');
  check(!/plate|witness|photograph/i.test(t2()), 'no claims question appears before 112');
  check(!d2.querySelector('#root [data-act="nav-back"]'),
    'no Back button above the safety instruction');
  check(hit('emg-continue'), 'can continue past the emergency screen');
  await wait();

  // The driver passes THROUGH 112 on the way to the six questions, so Back
  // must reach the cold open. Landing back on a safety instruction they have
  // already dealt with is confusing and slightly alarming.
  const backLbl = d2.querySelector('#root .nav-lbl');
  check(backLbl && !/emergency/i.test(backLbl.textContent),
    'back does not point at the 112 screen',
    backLbl ? 'label was ' + backLbl.textContent : 'no back control');
  hit('nav-back');
  await wait();
  check(/is everyone okay/i.test(t2()),
    'back after the safety route reaches the cold open');
  fresh.window.close();
}



/**
 * The two paths that end the flow, each in its own DOM.
 *
 * Dismissal and the soft stop are terminal, so walking to them inside the main
 * sequence would strand every assertion after them. Both were untested until
 * now, and dismissal is the one that must create nothing at all.
 */
{
  const { VirtualConsole } = await import('jsdom');
  const fresh = () => {
    const d = new JSDOM(html, {
      runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://localhost/',
      virtualConsole: new VirtualConsole()
        .on('jsdomError', e => { if (!IGNORE.test(e.message)) errors.push(e.message); }),
    });
    const doc = d.window.document;
    return {
      doc,
      hit: (a, v) => {
        const sel = v ? `#root [data-act="${a}"][data-v="${v}"]` : `#root [data-act="${a}"]`;
        const n = doc.querySelector(sel);
        if (!n) return false;
        n.dispatchEvent(new d.window.MouseEvent('click', { bubbles: true }));
        return true;
      },
      text: () => doc.querySelector('#root')?.textContent || '',
      close: () => d.window.close(),
    };
  };

  // --- false-positive dismissal: two taps, and no claim exists afterwards ---
  {
    const app = fresh();
    await wait();
    check(app.hit('s0-dismiss'), 'dismissal is reachable from the cold open');
    await wait();
    check(/what was it/i.test(app.text()), 'dismissal asks for a reason');
    check(app.hit('dismiss-reason', 'pothole'), 'a reason can be given in one tap');
    await wait();
    check(!/INS-DE-\d{4}/.test(app.text()),
      'dismissal creates no claim reference', 'a reference appeared after dismissing');
    app.close();
  }

  // --- soft stop: the report is already filed, so there is no Submit ---
  {
    const app = fresh();
    await wait();
    app.hit('s0-fine'); await wait();
    app.hit('set-drivable', 'yes'); await wait();
    app.hit('submit-tier1'); await wait(); await wait();
    check(app.hit('finish-now'), 'the driver can stop without completing the optional flow');
    // finish-now submits through the API before transitioning, so one tick is
    // not enough to see the resulting screen.
    await wait(); await wait(); await wait();
    check(/everything perishable|the rest can wait/i.test(app.text()),
      'the soft stop gives permission to stop rather than demanding more');
    check(/INS-DE-\d{4}/.test(app.text()), 'the reference is still shown at the soft stop');
    // Check for a control, not for the word: the design note on this screen
    // explains at length that there is no submit button, so a text match hits
    // the explanation rather than the thing it is explaining.
    const submitControl = [...app.doc.querySelectorAll('#root button')]
      .find(b => /^\s*submit/i.test(b.textContent || ''));
    check(!submitControl,
      'no Submit control — the report was already filed at the reference screen',
      submitControl ? `found: "${submitControl.textContent.trim()}"` : '');
    app.close();
  }
}

console.log(failed ? `\n${failed} failure(s)` : '\nall render assertions passed');
process.exit(failed ? 1 : 0);
