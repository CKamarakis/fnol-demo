/**
 * The domain rules, enforced against the built app rather than the prose.
 *
 * CLAUDE.md states these as product decisions with reasons. Prose drifts and
 * nothing notices; a rule worth writing down is worth failing a build over.
 * Four of them are checkable from outside:
 *
 *   1. Six fields block submission, and only six.
 *   2. The driver never depends on a partner API — offline completes.
 *   3. Copy must not assert what the product cannot do.
 *   4. Never reject at intake.
 *
 *   node tests/rules.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
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

const IGNORE = /HTMLCanvasElement.prototype.getContext/;

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
        try { w.localStorage.setItem('fnol.demo.v1', JSON.stringify(state)); } catch { /* ignore */ }
      }
    },
  });

  await new Promise(r => setTimeout(r, 240));
  const { window } = dom;
  const doc = window.document;
  const click = async sel => {
    const n = typeof sel === 'string' ? doc.querySelector(sel) : sel;
    if (!n) return false;
    n.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 70));
    return true;
  };
  return {
    errors, doc, window, click,
    text: () => doc.querySelector('#root')?.textContent || '',
    submit: () => doc.querySelector('#root [data-act="submit-tier1"]'),
    close: () => window.close(),
  };
}

/* ================================================================== *
 * RULE 1 · Six fields block submission, and only six.
 *
 * The count is the rule. A seventh blocking field is a product change, not a
 * refactor, and it must not arrive by accident — this is the assertion that
 * makes adding one a deliberate act.
 * ================================================================== */
{
  const app = await boot({ persona: 'driver', screen: 's1', scenario: 'collision' });

  const submit = app.submit();
  check(!!submit, 'six-field rule: the submit control exists');
  check(submit?.hasAttribute('disabled'),
    'six-field rule: submission is blocked before anything is answered');

  // The counter names how many remain. It is the user-visible statement of
  // the rule, so it is the thing to assert against.
  check(/6\s+still to check/i.test(app.text()),
    'six-field rule: exactly six are outstanding at the start',
    app.text().match(/\d+\s+still to check/i)?.[0] || 'no counter found');

  // Answer all six, checking the counter falls by exactly one each time.
  const SIX = [
    ['confirm-vehicle', 'vehicle'],
    ['confirm-time', 'date and time'],
    ['confirm-location', 'location'],
    ['confirm-type', 'incident type'],
    ['set-injured', 'anyone injured'],
    ['set-drivable', 'vehicle drivable'],
  ];

  let expected = 6;
  for (const [act, label] of SIX) {
    const node = app.doc.querySelector(`#root [data-act="${act}"]`);
    if (!node) { check(false, `six-field rule: "${label}" is answerable`, 'control not found'); continue; }
    await app.click(node);
    expected -= 1;

    if (expected > 0) {
      check(new RegExp(`${expected}\\s+still to check`, 'i').test(app.text()),
        `six-field rule: answering "${label}" leaves ${expected}`,
        app.text().match(/\d+\s+still to check/i)?.[0] || 'counter gone');
      check(app.submit()?.hasAttribute('disabled'),
        `six-field rule: still blocked with ${expected} unanswered`);
    }
  }

  // And the sixth answer releases it — no seventh gate.
  check(!app.submit()?.hasAttribute('disabled'),
    'six-field rule: the sixth answer unblocks submission — there is no seventh gate');
  check(!/still to check/i.test(app.text()),
    'six-field rule: nothing else is outstanding once six are answered');

  // Question 7 (driver fitness) is welfare, not underwriting: present, and
  // deliberately not part of the gate.
  check(!!app.doc.querySelector('#root [data-act="set-driver-fit"]'),
    'six-field rule: the driver-fitness question is asked');
  check(!app.submit()?.hasAttribute('disabled'),
    'six-field rule: driver fitness does NOT block — it is a welfare answer');

  app.close();
}

/* ================================================================== *
 * RULE 2 · The driver never depends on a partner API.
 *
 * Accept, persist, acknowledge, then forward asynchronously. With the radio
 * down the driver must still reach a reference, because the reference is
 * issued locally.
 * ================================================================== */
{
  const app = await boot({
    persona: 'driver', screen: 's1', scenario: 'collision',
    fail: { tpa: false, offline: true, coverage: false },
  });

  check(app.errors.length === 0, 'offline: the app runs with no signal',
    app.errors.slice(0, 2).join(' | '));
  check(/no signal|offline/i.test(app.text()),
    'offline: the driver is told, rather than left guessing');

  for (const act of ['confirm-vehicle', 'confirm-time', 'confirm-location',
    'confirm-type', 'set-injured', 'set-drivable']) {
    await app.click(`#root [data-act="${act}"]`);
  }
  check(!app.submit()?.hasAttribute('disabled'),
    'offline: the six questions can still be completed');

  await app.click('#root [data-act="submit-tier1"]');
  await new Promise(r => setTimeout(r, 700));

  check(/INS-DE-\d{4}-\d+/.test(app.text()),
    'offline: a reference is still issued — it is generated locally',
    app.text().slice(0, 120).replace(/\s+/g, ' '));
  check(app.errors.length === 0, 'offline: completing the flow throws nothing',
    app.errors.slice(0, 2).join(' | '));
  app.close();
}

/* The TPA being down is likewise the partner's problem, not the driver's. */
{
  const app = await boot({
    persona: 'driver', screen: 's1', scenario: 'collision',
    fail: { tpa: true, offline: false, coverage: false },
  });
  for (const act of ['confirm-vehicle', 'confirm-time', 'confirm-location',
    'confirm-type', 'set-injured', 'set-drivable']) {
    await app.click(`#root [data-act="${act}"]`);
  }
  await app.click('#root [data-act="submit-tier1"]');
  await new Promise(r => setTimeout(r, 700));

  check(/INS-DE-\d{4}-\d+/.test(app.text()),
    'TPA down: the driver still gets a reference');
  check(!/error|failed|unavailable|try again/i.test(app.text()),
    'TPA down: the driver is shown no partner failure at all',
    app.text().slice(0, 140).replace(/\s+/g, ' '));
  app.close();
}

/* ================================================================== *
 * RULE 3 · Never reject at intake.
 *
 * A failed coverage check flags for human review; the driver's screen is
 * unchanged. Art. 22 forbids the automated adverse decision, and schedule
 * data is stale more often than drivers are dishonest.
 * ================================================================== */
{
  const app = await boot({
    persona: 'driver', screen: 's1', scenario: 'collision',
    fail: { tpa: false, offline: false, coverage: true },
  });
  for (const act of ['confirm-vehicle', 'confirm-time', 'confirm-location',
    'confirm-type', 'set-injured', 'set-drivable']) {
    await app.click(`#root [data-act="${act}"]`);
  }
  await app.click('#root [data-act="submit-tier1"]');
  await new Promise(r => setTimeout(r, 700));

  check(/INS-DE-\d{4}-\d+/.test(app.text()),
    'coverage disputed: the driver is still given a reference');
  check(!/not covered|rejected|declined|denied|invalid policy/i.test(app.text()),
    'coverage disputed: nothing on the driver screen rejects them',
    app.text().slice(0, 140).replace(/\s+/g, ' '));
  app.close();
}

/* ================================================================== *
 * RULE 4 · Copy must not assert what the product cannot do.
 *
 * "Recovery dispatched · ETA 45 min" shipped once, and three more instances
 * survived until they were found by hand. An FNOL system does not run a
 * recovery network, cannot know an arrival time, and does not decide claims.
 * This reads the SOURCE, so a new promise fails the build the day it lands.
 * ================================================================== */
{
  const SRC = join(ROOT, 'src');
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(jsx?|css)$/.test(e.name)) files.push(p);
    }
  })(SRC);

  // Each pattern is a promise about the physical world that this system has no
  // way to keep. Design-note prose is exempt: it argues ABOUT these claims.
  const FORBIDDEN = [
    [/\bETA\b/i, 'an arrival time this system cannot know'],
    [/recovery\s+(dispatched|arranged|en route|on its way)/i, 'dispatching a recovery it does not run'],
    [/(tow|truck|ambulance|police)\s+(dispatched|on its way|en route)/i, 'dispatching a service it does not run'],
    [/arriv(es|ing)\s+in\s+\d/i, 'a promised arrival'],
    [/\bclaim\s+(approved|settled|paid)\b/i, 'a claims decision made at intake'],
  ];

  const hits = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    src.split('\n').forEach((line, i) => {
      // Design notes, comments and the "What's faked" disclosures all discuss
      // these claims by name in order to disown them. The rule is about what
      // the product TELLS THE DRIVER, not about naming the mistake.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      if (/_NOTE\b|dn\(/.test(line)) return;
      if (/Not claimed anywhere|No provider is contacted|earlier build/i.test(line)) return;
      for (const [re, why] of FORBIDDEN) {
        if (re.test(line)) {
          hits.push(`${f.replace(ROOT, '').replace(/\\/g, '/')}:${i + 1} — ${why}\n      ${line.trim().slice(0, 100)}`);
        }
      }
    });
  }

  check(hits.length === 0,
    'copy honesty: nothing promises an action this system cannot perform',
    hits.slice(0, 5).join('\n      '));
}

/* ================================================================== *
 * RULE 5 · No field asks whose fault it was. Anywhere.
 * ================================================================== */
{
  const SCREENS = ['s0', 's1', 'gaps', 'witness', 'otherv', 'eas', 'police', 'cargo', 'otherins'];
  for (const screen of SCREENS) {
    const app = await boot({
      persona: 'driver', screen, scenario: 'collision',
      navStack: ['s0'], emgFrom: 's0',
    });
    const t = app.text();
    // "Whose fault was it?" appears in the sidecar as an annotated ABSENCE,
    // which is the point — so only the driver phone is inspected here.
    const phone = app.doc.querySelector('#root .phone')?.textContent || '';
    check(!/whose fault|who was at fault|at fault\?|blame/i.test(phone),
      `no-fault rule: "${screen}" asks nothing about fault`);
    app.close();
  }
}

/* ================================================================== *
 * RULE 6 · The display panes render and respond.
 *
 * interactive.mjs walks the driver screens; these three are built with the
 * pre-React el() builder and had no click coverage at all.
 * ================================================================== */
for (const [persona, tabs] of [
  ['fleet', ['list', 'merge', 'chase']],
  ['system', ['log', 'telematics', 'contract', 'machine', 'faked']],
]) {
  for (const tab of tabs) {
    const state = persona === 'fleet'
      ? { persona, fleetTab: tab }
      : { persona, sysTab: tab };
    const app = await boot(state);

    check(app.errors.length === 0, `${persona}/${tab}: renders without errors`,
      app.errors.slice(0, 2).join(' | '));
    check(app.text().trim().length > 40, `${persona}/${tab}: rendered content`,
      `only ${app.text().trim().length} chars`);

    const controls = [...app.doc.querySelectorAll('#root [data-act]')];
    check(controls.length > 0, `${persona}/${tab}: offers controls`);

    const before = app.errors.length;
    for (const node of controls.slice(0, 12)) {
      if (node.tagName === 'SELECT') continue;
      await app.click(node);
      if (!app.doc.contains(node)) break;
    }
    check(app.errors.length === before, `${persona}/${tab}: no control throws`,
      app.errors.slice(before, before + 2).join(' | '));
    app.close();
  }
}

console.log(failed ? `\n${failed} rule assertion(s) failed` : '\nall rule assertions passed');
process.exit(failed ? 1 : 0);
