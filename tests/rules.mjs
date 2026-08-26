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

  // Blocking is expressed by the control's ABSENCE: unanswered, the dock
  // carries the counter instead, which is a live seek control.
  check(!app.submit(),
    'six-field rule: there is no submit control before anything is answered');
  check(!!app.doc.querySelector('#root [data-act="goto-unanswered"]'),
    'six-field rule: the dock carries the counter instead');

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
      check(!app.submit(),
        `six-field rule: still blocked with ${expected} unanswered`);
    }
  }

  // And the sixth answer releases it — no seventh gate.
  check(!!app.submit(),
    'six-field rule: the sixth answer unblocks submission — there is no seventh gate');
  check(!/still to check/i.test(app.text()),
    'six-field rule: nothing else is outstanding once six are answered');

  // Driver fitness is NOT an FNOL field. ACORD 2 asks for driver identity and
  // for injuries; no field on the form asks whether the driver is able to keep
  // driving. The question that asked it has been removed rather than made
  // optional — an unused field is still a field the driver has to read.
  check(!app.doc.querySelector('#root [data-act="set-driver-fit"]'),
    'the form asks nothing the standard does not: driver fitness is gone');

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
  check(!!app.submit(),
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
 * RULE 12 · The ACORD fields we said we collect, we actually collect.
 *
 * The mapping table is a claim made to an integration lead. Every row has to
 * correspond to something the flow can really produce, or the table is
 * marketing. These are the fields added after auditing the form itself.
 * ================================================================== */
{
  const app = await boot({ persona: 'driver', screen: 's1', scenario: 'collision' });

  check(!app.doc.querySelector('#root [data-field="vin"]'),
    'ACORD VIN: never asked of the driver');

  // The CTA says what it does.
  for (const a of ['confirm-vehicle', 'confirm-time', 'confirm-location',
    'confirm-type', 'set-injured', 'set-drivable']) {
    await app.click(`#root [data-act="${a}"]`);
  }

  // VIN is read from the telematics unit, never typed: 17 characters on a hard
  // shoulder is how you get a wrong VIN rather than no VIN. Read after an
  // answer, because the draft is only persisted once something changes it.
  const stored = JSON.parse(app.window.localStorage.getItem('fnol.demo.v1') || '{}');
  check(/^[A-HJ-NPR-Z0-9]{17}$/.test(stored.draft?.vin || ''),
    'ACORD VIN: present and 17 characters, from the unit',
    `vin was ${JSON.stringify(stored.draft?.vin)}`);
  check(/^\s*Confirm\s*$/.test(app.doc.querySelector('#root .dock .btn')?.textContent || ''),
    'the CTA reads "Confirm"',
    JSON.stringify(app.doc.querySelector('#root .dock .btn')?.textContent));
  app.close();
}

/* DESCRIBE DAMAGE and WHERE CAN VEH BE SEEN sit with the photographs — the
   driver is already looking at the damage, and an appraiser needs somewhere
   to go before they need a paragraph. Neither blocks. */
{
  const app = await boot({
    persona: 'driver', screen: 'photos', scenario: 'collision', navStack: ['s0'],
  });
  check(!!app.doc.querySelector('#root [data-field="damageDesc"]'),
    'ACORD DESCRIBE DAMAGE is collected');
  check(!!app.doc.querySelector('#root [data-field="whereSeen"]'),
    'ACORD WHERE CAN VEH BE SEEN is collected');
  check(!!app.doc.querySelector('#root [data-act="gap-skip"]'),
    'both stay skippable — they are not blocking fields');
  app.close();
}

/* OTHER VEH/PROP INS? is a question of its own. A blank policy number cannot
   distinguish "nobody is insured" from "nobody looked", and an uninsured
   party routes to the guarantee fund rather than to another insurer. */
{
  const app = await boot({
    persona: 'driver', screen: 'otherins', scenario: 'collision', navStack: ['s0'],
  });
  check(!!app.doc.querySelector('#root [data-act="set-other-insured"]'),
    'ACORD OTHER VEH/PROP INS? is asked');
  await app.click('#root [data-act="set-other-insured"][data-v="yes"]');
  const stored = JSON.parse(app.window.localStorage.getItem('fnol.demo.v1') || '{}');
  check(stored.draft?.otherInsured === true,
    'ACORD OTHER VEH/PROP INS? is recorded separately from the policy number');
  app.close();
}

/* The omissions are stated rather than left as holes. "The restraint has to be
   visible or it reads as an oversight" applies to the field list too. */
{
  const app = await boot({ persona: 'fleet', exportOpen: true });
  const omitted = readFileSync(join(ROOT, 'src', 'data', 'domain.js'), 'utf8');
  check(/ACORD_OMITTED/.test(omitted),
    'the fields ACORD asks for and this flow refuses are enumerated');
  for (const must of ['Art. 9', 'ESTIMATE AMT', 'PURPOSE OF USE', 'licence']) {
    check(omitted.includes(must),
      `the omission list names "${must}"`);
  }
  app.close();
}

/* ================================================================== *
 * RULE 11 · The injury section collects what ACORD 2 actually asks for.
 *
 * The form's INJURED section is a table with one row per person, and its
 * columns are PED / INS VEH / OTH VEH — which party each injured person
 * was. That routes the claim: a hurt third party makes this a liability
 * notification as well as an own-damage claim, and a single "someone is
 * hurt" boolean cannot say so. The same check found no field anywhere on
 * ACORD 2 asking whether the driver is fit to keep driving.
 * ================================================================== */
{
  const app = await boot({ persona: 'driver', screen: 's1', scenario: 'collision' });
  await app.click('#root [data-act="set-injured"][data-v="yes"]');

  const parties = [...app.doc.querySelectorAll('#root [data-act="toggle-injured-party"]')]
    .map(n => n.getAttribute('data-v'));
  for (const col of ['driver', 'our_vehicle', 'other_vehicle', 'pedestrian']) {
    check(parties.includes(col), `injury: the "${col}" party can be reported`);
  }

  // Multi-select: an injured driver AND an injured third party is one of the
  // commonest shapes a motor claim takes.
  await app.click('#root [data-act="toggle-injured-party"][data-v="driver"]');
  await app.click('#root [data-act="toggle-injured-party"][data-v="other_vehicle"]');
  const on = [...app.doc.querySelectorAll('#root [data-act="toggle-injured-party"][aria-pressed="true"]')]
    .map(n => n.getAttribute('data-v'));
  check(on.length === 2, 'injury: more than one party can be hurt at once', `selected: ${on.join(', ')}`);

  // Tapping again clears it — every answer stays correctable.
  await app.click('#root [data-act="toggle-injured-party"][data-v="driver"]');
  const after = [...app.doc.querySelectorAll('#root [data-act="toggle-injured-party"][aria-pressed="true"]')]
    .map(n => n.getAttribute('data-v'));
  check(after.length === 1 && after[0] === 'other_vehicle',
    'injury: a party can be un-selected', `selected: ${after.join(', ')}`);

  // Still no names and no diagnoses: which party, never who or what.
  const freeText = [...app.doc.querySelectorAll('#root input, #root textarea')]
    .some(i => /injur|wound|diagnos|medical|name/i.test(i.getAttribute('placeholder') || i.id || ''));
  check(!freeText, 'injury: naming an injured person is still impossible — Art. 9 holds');
  app.close();
}

/* ================================================================== *
 * RULE 10 · The six questions open with nothing answered.
 *
 * The counter exists to say how much is left, and it can only be honest if
 * it counts what the DRIVER settled on this screen. The cold open used to
 * write injured:false on "everyone's fine", so question 5 arrived already
 * ticked and the screen opened at "5 still to check" — the driver was told
 * they had completed something they had not been shown. The cold open asks
 * about people and routes to 112; it does not fill in a claim field.
 * ================================================================== */
{
  // Every route onto the six questions, including the safety detour.
  const ROUTES = [
    ['direct load', { persona: 'driver', screen: 's1', scenario: 'collision' }, null],
    ['via "everyone\'s fine"', { persona: 'driver', screen: 's0', scenario: 'collision' }, ['s0-fine']],
    ['via 112 then continue', { persona: 'driver', screen: 's0', scenario: 'collision' }, ['s0-hurt', 'emg-continue']],
  ];

  for (const [label, state, path] of ROUTES) {
    const app = await boot(state);
    for (const act of path || []) {
      await app.click(`#root [data-act="${act}"]`);
    }

    check(/6\s+still to check/i.test(app.text()),
      `${label}: the six questions open at six`,
      app.text().match(/\d+\s+still to check/i)?.[0] || 'no counter found');

    // Nothing anywhere on the screen may arrive pre-selected.
    const pressed = [...app.doc.querySelectorAll('#root .choice[aria-pressed="true"]')]
      .map(n => n.getAttribute('data-act') + '=' + n.getAttribute('data-v'));
    check(pressed.length === 0,
      `${label}: no answer is pre-selected`,
      pressed.join(', '));

    // And no submit control, because nothing has been answered.
    check(!app.submit(), `${label}: submission is not available on arrival`);
    app.close();
  }

  // Going back from 112 clears the routing signal rather than converting it
  // into "no one is hurt" — a mistap says nothing about the claim field.
  {
    const app = await boot({ persona: 'driver', screen: 's0', scenario: 'collision' });
    await app.click('#root [data-act="s0-hurt"]');
    await app.click('#root [data-act="nav-back"]');
    await app.click('#root [data-act="s0-fine"]');
    const pressed = [...app.doc.querySelectorAll('#root .choice[aria-pressed="true"]')];
    check(pressed.length === 0,
      'after a 112 mistap, question 5 is still unanswered rather than flipped to "no one"',
      pressed.map(n => n.getAttribute('data-v')).join(', '));
    app.close();
  }
}

/* ================================================================== *
 * RULE 8 · The counter says where, not just how many.
 *
 * "2 still to check" sat in the dock as a DISABLED button while the field it
 * counted was somewhere up the scroll. It named a number and refused to be
 * tapped. Unanswered, it is now a live control that finds the next one.
 * ================================================================== */
{
  const app = await boot({ persona: 'driver', screen: 's1', scenario: 'collision' });

  const seek = app.doc.querySelector('#root [data-act="goto-unanswered"]');
  check(!!seek, 'seek: the counter is a live control, not a disabled label');
  check(!seek?.hasAttribute('disabled'), 'seek: the counter can actually be tapped');
  check(/still to check/i.test(seek?.textContent || ''),
    'seek: the counter still names what it counts');

  // jsdom has no scrolling, so the call itself is the observable behaviour.
  let scrolledTo = null;
  app.window.Element.prototype.scrollIntoView = function () {
    scrolledTo = this.getAttribute('data-act');
  };

  await app.click(seek);
  check(scrolledTo === 'confirm-vehicle',
    'seek: jumps to the first unanswered field',
    `scrolled to "${scrolledTo}"`);
  check(!!app.doc.querySelector('.seek-flash'),
    'seek: the destination is marked, so a silent scroll is not missed');

  // Answering one advances the target rather than re-serving the same field.
  await app.click('#root [data-act="confirm-vehicle"]');
  await app.click('#root [data-act="goto-unanswered"]');
  check(scrolledTo === 'confirm-time',
    'seek: advances to the next outstanding field once one is answered',
    `scrolled to "${scrolledTo}"`);

  // Walk the rest; the last answer must swap the control for a real submit.
  for (const act of ['confirm-time', 'confirm-location', 'confirm-type',
    'set-injured', 'set-drivable']) {
    await app.click(`#root [data-act="${act}"]`);
  }
  check(!app.doc.querySelector('#root [data-act="goto-unanswered"]'),
    'seek: the counter is gone once nothing is outstanding');
  check(!!app.doc.querySelector('#root [data-act="submit-tier1"]'),
    'seek: submitting replaces it');
  app.close();
}

/* ================================================================== *
 * RULE 9 · Every answer shows that it was taken.
 *
 * Selection is border + tick + label, never colour alone. "No one" on the
 * injury question is the one a driver taps most and the one most worth being
 * sure about.
 * ================================================================== */
{
  for (const [act, value, label] of [
    ['set-injured', 'no', 'No one'],
    ['set-injured', 'yes', 'Yes'],
    ['set-drivable', 'no', 'vehicle not drivable'],
  ]) {
    const app = await boot({ persona: 'driver', screen: 's1', scenario: 'collision' });
    const btn = app.doc.querySelector(`#root [data-act="${act}"][data-v="${value}"]`);
    check(!!btn, `answer state: "${label}" is offered`);
    if (btn) {
      await app.click(btn);
      const again = app.doc.querySelector(`#root [data-act="${act}"][data-v="${value}"]`);
      check(again?.getAttribute('aria-pressed') === 'true',
        `answer state: "${label}" reads as selected to a screen reader`);
      // The tick is the non-colour half of the affordance.
      check((again?.querySelector('.cbox')?.innerHTML || '').length > 0,
        `answer state: "${label}" shows a tick, not just a colour`);
    }
    app.close();
  }
}

/* ================================================================== *
 * RULE 7 · Every language gets the same design, not just English.
 *
 * The cold open's headline is deliberately two parts: a small kicker naming
 * what the system did, then the subject in full size. That split was built
 * for English only, so the other four rendered one long sentence in the
 * kicker slot and no headline at all — a different design for anyone not
 * reading English, on the screen that opens the product.
 * ================================================================== */
{
  const LANGS = ['de', 'en', 'fr', 'nl', 'pl'];
  const SCENARIOS_TO_CHECK = ['glass', 'collision', 'theft'];

  for (const lang of LANGS) {
    for (const scenario of SCENARIOS_TO_CHECK) {
      const app = await boot({ persona: 'driver', screen: 's0', scenario, lang });

      const kicker = app.doc.querySelector('#root .s0-kicker')?.textContent?.trim() || '';
      const headline = app.doc.querySelector('#root .h1')?.textContent?.trim() || '';

      check(kicker.length > 0 && headline.length > 0,
        `${lang}/${scenario}: renders both a kicker and a headline`,
        `kicker="${kicker}" headline="${headline}"`);

      // The kicker names the system's action. A whole sentence there means the
      // split was skipped and the headline slot went empty.
      check(kicker.split(/\s+/).length <= 2,
        `${lang}/${scenario}: the kicker is a label, not a sentence`,
        `kicker was "${kicker}"`);

      // Untranslated scenarios used to collapse the layout entirely.
      check(headline.length > 3,
        `${lang}/${scenario}: the headline names the incident`,
        `headline was "${headline}"`);

      // jsdom has no layout engine, so overflow cannot be measured here. What
      // CAN be checked is the cause: a single unbreakable word wider than the
      // handset. German compounds one noun out of three, and
      // "Windschutzscheibenschaden" ran off the right edge of the phone.
      const longestWord = headline.split(/[\s—-]+/)
        .reduce((a, w) => (w.length > a.length ? w : a), '');
      check(longestWord.length <= 20,
        `${lang}/${scenario}: no single word is too wide for the handset`,
        `longest word was "${longestWord}" (${longestWord.length} chars)`);

      app.close();
    }
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
