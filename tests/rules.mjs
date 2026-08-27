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
  const SCREENS = ['s0', 's1', 'witness', 'otherv', 'eas', 'police', 'cargo', 'otherins', 'archive'];
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
 * RULE 13 · "Yes, someone is hurt" is not a complete answer.
 *
 * Which party decides whether this is also a liability notification; the band
 * decides the reserve. A bare yes leaves the handler phoning back for both,
 * which is exactly the call this product exists to avoid. So the injury
 * question is settled by "no one", or by yes plus at least one party and one
 * band. Still ONE of the six — a completeness rule for a single question,
 * not a seventh blocking field.
 * ================================================================== */
{
  const answerRest = async app => {
    for (const a of ['confirm-vehicle', 'confirm-time', 'confirm-location',
      'confirm-type', 'set-drivable']) {
      await app.click(`#root [data-act="${a}"]`);
    }
  };

  // "No one" stays a single tap. The common case must not get slower to
  // protect the rare one.
  {
    const app = await boot({ persona: 'driver', screen: 's1', scenario: 'collision' });
    await answerRest(app);
    await app.click('#root [data-act="set-injured"][data-v="no"]');
    check(!!app.submit(), 'injury gate: "no one" alone completes the question');
    app.close();
  }

  // Yes, with each half missing in turn.
  for (const [label, extra] of [
    ['nothing else', []],
    ['a party but no band', ['toggle-injured-party|driver']],
    ['a band but no party', ['toggle-severity|serious']],
  ]) {
    const app = await boot({ persona: 'driver', screen: 's1', scenario: 'collision' });
    await answerRest(app);
    await app.click('#root [data-act="set-injured"][data-v="yes"]');
    for (const step of extra) {
      const [act, v] = step.split('|');
      await app.click(`#root [data-act="${act}"][data-v="${v}"]`);
    }
    check(!app.submit(), `injury gate: "yes" with ${label} does not complete it`);
    check(/1\s+still to check/i.test(app.text()),
      `injury gate: the counter still shows one outstanding with ${label}`,
      app.text().match(/\d+\s+still to check/i)?.[0] || 'no counter');
    app.close();
  }

  // Both halves present.
  {
    const app = await boot({ persona: 'driver', screen: 's1', scenario: 'collision' });
    await answerRest(app);
    await app.click('#root [data-act="set-injured"][data-v="yes"]');
    await app.click('#root [data-act="toggle-injured-party"][data-v="driver"]');
    await app.click('#root [data-act="toggle-severity"][data-v="serious"]');
    check(!!app.submit(), 'injury gate: one party and one band completes it');
    app.close();
  }

  // The seek must land on the missing half, not back on "is anyone hurt?".
  // Being sent back to a question you already answered reads as lost data.
  {
    const app = await boot({ persona: 'driver', screen: 's1', scenario: 'collision' });
    await answerRest(app);
    await app.click('#root [data-act="set-injured"][data-v="yes"]');
    let target = null;
    app.window.Element.prototype.scrollIntoView = function () {
      target = this.getAttribute('data-act');
    };
    await app.click('#root [data-act="goto-unanswered"]');
    check(target === 'toggle-injured-party',
      'injury gate: the counter jumps to the missing detail, not back to the yes/no',
      `jumped to "${target}"`);

    await app.click('#root [data-act="toggle-injured-party"][data-v="driver"]');
    await app.click('#root [data-act="goto-unanswered"]');
    check(target === 'toggle-severity',
      'injury gate: then to the band once the party is named',
      `jumped to "${target}"`);
    app.close();
  }

  // Correcting to "no one" clears the detail. Otherwise a report saying nobody
  // was hurt ships with an injured party attached — and the detail is hidden
  // at that point, so the driver cannot see it to remove it.
  {
    const app = await boot({ persona: 'driver', screen: 's1', scenario: 'collision' });
    await answerRest(app);
    await app.click('#root [data-act="set-injured"][data-v="yes"]');
    await app.click('#root [data-act="toggle-injured-party"][data-v="driver"]');
    await app.click('#root [data-act="toggle-severity"][data-v="serious"]');
    await app.click('#root [data-act="set-injured"][data-v="no"]');

    const stored = JSON.parse(app.window.localStorage.getItem('fnol.demo.v1') || '{}');
    check((stored.draft?.injuredParties || []).length === 0
      && (stored.draft?.injurySeverity || []).length === 0,
      'injury gate: correcting to "no one" clears the detail behind it',
      `parties=${JSON.stringify(stored.draft?.injuredParties)} bands=${JSON.stringify(stored.draft?.injurySeverity)}`);
    check(!!app.submit(), 'injury gate: and the question is complete again');
    app.close();
  }
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

  // Severity is multi-select for the same reason the party is. A walking
  // driver and an unconscious passenger is one accident with two bands, and
  // a single band would set the reserve from whichever was tapped.
  const bands = [...app.doc.querySelectorAll('#root [data-act="toggle-severity"]')]
    .map(n => n.getAttribute('data-v'));
  check(bands.length >= 3, 'injury: every severity band is offered', bands.join(', '));
  await app.click('#root [data-act="toggle-severity"][data-v="walking"]');
  await app.click('#root [data-act="toggle-severity"][data-v="serious"]');
  const bandsOn = [...app.doc.querySelectorAll('#root [data-act="toggle-severity"][aria-pressed="true"]')]
    .map(n => n.getAttribute('data-v'));
  check(bandsOn.length === 2,
    'injury: more than one severity band can be true at once', bandsOn.join(', '));

  // Who is asked before how bad: naming the people is what makes the
  // severity question answerable.
  const order = [...app.doc.querySelectorAll('#root [data-act^="toggle-"]')]
    .map(n => n.getAttribute('data-act'));
  check(order.indexOf('toggle-injured-party') < order.indexOf('toggle-severity'),
    'injury: "who is hurt" is asked before "how bad"');

  // Round means pick one, square means pick any number. A driver should not
  // have to read the label to learn whether a second tap replaces their first
  // answer or adds to it.
  const multiBox = app.doc.querySelector('#root [data-act="toggle-injured-party"] .cbox');
  const singleBox = app.doc.querySelector('#root [data-act="set-injured"] .cbox');
  check(multiBox && !multiBox.classList.contains('round'),
    'multi-select shows a square box, not a radio');
  check(singleBox && singleBox.classList.contains('round'),
    'single-select keeps the round box');
  check(app.doc.querySelector('#root [data-act="toggle-severity"]')?.getAttribute('role') === 'checkbox',
    'multi-select announces itself as a checkbox to a screen reader');

  /* Selecting must not move the row. The old rule thickened the border to 2px
     and compensated with margin:-0.5px, so every selected row crept upward and
     in a list of four the shifts accumulated until rows overlapped. jsdom has
     no layout engine, so the CSS is asserted directly: nothing in a selected
     state may change border-width or margin. */
  const css = readFileSync(join(ROOT, 'src', 'styles', '03-driver.css'), 'utf8');
  const selectedRules = [...css.matchAll(/\.(?:choice\[aria-pressed="true"\]|frow\.confirmed)\s*\{([^}]*)\}/g)]
    .map(m => m[1]);
  check(selectedRules.length >= 2, 'both selected-state rules are present');
  for (const body of selectedRules) {
    check(!/border-width/.test(body),
      'a selected row does not change its border width — that is what moved it',
      body.replace(/\s+/g, ' ').slice(0, 90));
    check(!/margin/.test(body),
      'a selected row does not compensate with a negative margin',
      body.replace(/\s+/g, ' ').slice(0, 90));
  }

  // No count field — a shaken driver should not be asked to be sure of a number.
  check(![...app.doc.querySelectorAll('#root input')]
    .some(i => /how many|count|number of/i.test(i.getAttribute('placeholder') || '')),
    'injury: no casualty count is demanded');

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

/* ================================================================== *
 * RULE 7 · No photograph is required, and none is owed.
 *
 * ACORD 2 has no photo field. The screen asks by perishability alone, so its
 * copy must never tell the driver they owe us a picture — "required",
 * "must", "you need to" on that screen is the failure this catches.
 * ================================================================== */
{
  const app = await boot({ persona: 'driver', screen: 'photos', scenario: 'glass', navStack: ['s0'] });
  const text = app.text();

  // Tests the claim, not one phrasing of it: "nothing here is required" and
  // "none of them required" are the same promise, and a rule pinned to the
  // exact sentence fails on a copy edit that changed nothing that matters.
  check(/no(thing|ne)[^.]{0,40}required|not required/i.test(text),
    'photos: states plainly that nothing is required',
    text.slice(0, 120).replace(/\s+/g, ' '));

  // "Nothing here is required" contains the word, so test the obligation
  // phrasings rather than the bare token.
  const OBLIGE = /(photos?|shots?|pictures?)\s+(are|is)\s+required|you\s+must\s+(take|photograph)|required\s+(photos?|shots?)/i;
  check(!OBLIGE.test(text), 'photos: no copy obliges the driver to photograph',
    (text.match(OBLIGE) || [])[0]);

  // The counter states what it counts and never scolds.
  check(!/(\d+\s+(left|remaining|missing)\b)/i.test(text),
    'photos: the counter does not nag about what is outstanding',
    (text.match(/\d+\s+(left|remaining|missing)\b/i) || [])[0]);

  app.close();
}

/* ================================================================== *
 * RULE 8 · The camera is real.
 *
 * The slots faked capture for the life of this prototype: they recorded a
 * timestamp and opened nothing. A photo screen whose slots cannot take a
 * photo is the one bug on it that a user notices immediately.
 *
 * jsdom cannot exercise the raster path — tests/capture.mjs does that in real
 * Chrome. What is checkable here is that the handler reaches for a real file
 * input at all, rather than silently recording a shot that never happened.
 * ================================================================== */
{
  const src = readFileSync(join(ROOT, 'src', 'core', 'actions.jsx'), 'utf8');
  const shoot = src.slice(src.indexOf('"shoot"'), src.indexOf('"retake"'));

  check(/type\s*=\s*"file"/.test(shoot), 'shoot: creates a real file input');
  check(/capture["']?\s*,\s*["']environment/.test(shoot) || /capture=["']environment/.test(shoot),
    'shoot: asks for the rear camera');
  check(/accept\s*=\s*"image\//.test(shoot), 'shoot: accepts images');
  check(!/skipped\s*:\s*false/.test(shoot),
    'shoot: does not record a capture without a file');
}

/* ================================================================== *
 * RULE 9 · Photo pixels never reach localStorage.
 *
 * The whole app gets ~5 MB; a phone photo is 3–6 MB. Persisting a data URL
 * fills the quota on the first shot and the save silently stops working —
 * which loses the CLAIM, not just the picture.
 * ================================================================== */
{
  const store = readFileSync(join(ROOT, 'src', 'core', 'store.js'), 'utf8');
  const save = store.slice(store.indexOf('  save(){'), store.indexOf('  load(){'));

  check(/thumb\s*:\s*null/.test(save),
    'save: strips photo thumbnails before writing to localStorage');
  check(/photos/.test(save),
    'save: handles the photos map explicitly rather than serialising the draft whole');
}

/* ================================================================== *
 * RULE 10 · "Where will the truck be" is not the incident location.
 *
 * Two fields that both read as "where?" send the driver back to retype the
 * roadside, and the inspection gets booked against the wrong place.
 * ================================================================== */
{
  const app = await boot({ persona: 'driver', screen: 'photos', scenario: 'collision', navStack: ['s0'] });
  const text = app.text();

  check(/inspect/i.test(text),
    'photos: the vehicle-location field says it is about inspection');
  check(!/where will the truck be\?/i.test(text),
    'photos: does not ask a bare "where" that duplicates question 3');

  app.close();
}

/* ================================================================== *
 * RULE 11 · The driver gets their own copy, and it promises no retention.
 *
 * A retention period is a policy decision with an Art. 13 disclosure behind
 * it. A prototype that invents "kept for 12 months" gets that number quoted
 * back as though someone agreed to it.
 * ================================================================== */
{
  const app = await boot({ persona: 'driver', screen: 'archive', scenario: 'collision', navStack: ['done'] });
  const text = app.text();

  check(app.errors.length === 0, 'archive: renders without errors',
    app.errors.slice(0, 2).join(' | '));
  check(/your copy/i.test(text), 'archive: names itself as the driver\'s copy');
  check(/not taken|known gap/i.test(text),
    'archive: names what was NOT captured rather than hiding it');

  const RETENTION = /kept for \d|retained for \d|stored for \d|\d+\s*(months?|years?|days?)\s*(of )?(retention|storage)/i;
  check(!RETENTION.test(text), 'archive: promises no retention period',
    (text.match(RETENTION) || [])[0]);

  app.close();
}

/* ================================================================== *
 * RULE 12 · The reference leads straight into the flow, not into a menu.
 *
 * There was a hub screen listing the outstanding items in perishability
 * order. The ordering is real and still governs what comes next; a screen
 * that only *displays* it cost the driver a tap to read a menu of the
 * screens after it.
 * ================================================================== */
{
  const app = await boot({ persona: 'driver', screen: 'photos', scenario: 'collision', navStack: ['s0'] });

  // The hub's own back control lived in the body of every optional screen,
  // alongside the nav bar's — two ways up from one screen.
  check(!app.doc.querySelector('#root [data-act="goto"][data-v="gaps"]'),
    'no control points at the removed hub');
  check(!!app.doc.querySelector('#root [data-act="nav-back"]'),
    'the standard Back control is still the way up');
  app.close();
}

/* ================================================================== *
 * RULE 13 · The finished screen offers the driver exactly one thing.
 *
 * "See what dispatch sees" was the demo harness leaking into the product —
 * a driver has no such button, and the persona switcher already does it.
 * "Add something after all" pointed at the removed hub.
 * ================================================================== */
{
  const app = await boot({ persona: 'driver', screen: 'done', scenario: 'collision', navStack: ['s0'] });

  const dock = [...app.doc.querySelectorAll('#root .dock button')];
  check(dock.length === 1, 'finished: the dock carries a single control',
    `found ${dock.length}: ${dock.map(b => b.textContent.trim()).join(' | ')}`);
  check(!app.doc.querySelector('#root [data-act="go-fleet"]'),
    'finished: no persona switch in the driver product');
  check(dock.length === 1 && /your copy/i.test(dock[0].textContent),
    'finished: the one control leads to the driver\'s own record');
  app.close();
}

/* ================================================================== *
 * RULE 14 · A named slot takes as many frames as the thing needs.
 *
 * Damage rarely fits one picture — a wing, a step and a windscreen are three
 * frames of one category. Extras hang off the named slot rather than becoming
 * the unnamed pile the naming exists to prevent.
 * ================================================================== */
{
  const app = await boot({ persona: 'driver', screen: 'photos', scenario: 'glass', navStack: ['s0'] });

  check(!!app.doc.querySelector('#root [data-act="shoot"]'),
    'photos: the named slot is still the primary control');
  check(!app.doc.querySelector('#root [data-act="skip-remaining-photos"]'),
    'photos: "Skip the rest" is gone — it stayed on the screen and read as inert');

  // The dock's skip is what leaves, and it must still be there.
  check(!!app.doc.querySelector('#root [data-act="gap-skip"]'),
    'photos: the dock still offers a non-shaming way out');
  app.close();
}

/* Add-another appears only once a slot holds something. */
{
  const app = await boot({
    persona: 'driver', screen: 'photos', scenario: 'glass', navStack: ['s0'],
    draft: { photos: { wide: { at: '09:12', skipped: false, kb: 900, name: 'a.jpg', thumb: null, extra: [] } } },
  });
  const adds = [...app.doc.querySelectorAll('#root [data-act="add-photo"]')];
  check(adds.length === 1, 'photos: "add another" appears on the captured slot only',
    `found ${adds.length}`);
  check(adds.length === 1 && adds[0].getAttribute('data-v') === 'wide',
    'photos: it is bound to the slot it sits under');
  app.close();
}

/* ================================================================== *
 * RULE 15 · No control depicts something the product cannot do.
 *
 * Every text field carried a mic button whose handler raised a toast saying
 * speech recognition needs a network service and this file makes none — a
 * control that exists to announce its own impossibility. Constraint 1 makes
 * that permanent, so the honest form is no button. Same class of bug as photo
 * slots that opened nothing.
 * ================================================================== */
{
  for (const screen of ['witness', 'otherv', 'photos', 'otherins']) {
    const app = await boot({
      persona: 'driver', screen, scenario: 'collision', navStack: ['s0'],
      // The witness name and number appear only once someone HAS been seen —
      // the screen asks the yes/no first and reveals the fields behind it.
      draft: screen === 'witness' ? { witnessPresent: true } : undefined,
    });

    check(!app.doc.querySelector('#root [data-act="voice"]'),
      `${screen}: no dictation control that cannot dictate`);

    // The fields themselves must still be there and typable.
    const inputs = [...app.doc.querySelectorAll('#root input[data-field]')];
    check(inputs.length > 0, `${screen}: still offers text entry`);
    check(inputs.every(i => !i.disabled && !i.readOnly),
      `${screen}: every field accepts typing`);
    app.close();
  }
}

/* ================================================================== *
 * RULE 16 · Theft never asks what a theft victim cannot answer.
 *
 * Six fields still block. But "can the vehicle still be driven?" has one
 * possible answer when the vehicle is gone, and "what is damaged / where can
 * it be inspected?" have none at all. The drivable fact still reaches the
 * handler — derived from the incident type and flagged as derived, never
 * presented as something the driver said.
 * ================================================================== */
{
  const app = await boot({ persona: 'driver', screen: 's1', scenario: 'theft' });

  check(!app.doc.querySelector('#root [data-act="set-drivable"]'),
    'theft: question 6 is not put to someone whose vehicle is gone');

  // The counter must match what is on screen. "6 still to check" with five
  // questions visible is the bug this guards.
  check(/5\s+still to check/i.test(app.text()),
    'theft: the counter counts the questions actually asked',
    (app.text().match(/\d+\s+still to check/i) || ['none'])[0]);

  // Five answers must release submission — the sixth is already settled.
  for (const act of ['confirm-vehicle', 'confirm-time', 'confirm-location', 'confirm-type']) {
    await app.click(`#root [data-act="${act}"]`);
  }
  await app.click('#root [data-act="set-injured"][data-v="no"]');
  check(!!app.submit(),
    'theft: five answers unblock submission, the sixth is derived');

  await app.click('#root [data-act="submit-tier1"]');
  await new Promise(r => setTimeout(r, 700));
  check(/INS-DE-\d{4}-\d+/.test(app.text()),
    'theft: the report submits and a reference is issued');

  // The value reaches storage, marked as inferred rather than answered.
  const saved = JSON.parse(app.window.localStorage.getItem('fnol.demo.v1'));
  check(saved.draft.drivable === false,
    'theft: drivable is carried to the handler, not left null');
  check(saved.draft.drivableSource === 'derived',
    'theft: it is flagged as derived, so nobody reads it as testimony',
    String(saved.draft.drivableSource));
  app.close();
}

/* The other scenarios still ask it, and are not marked derived. */
{
  const app = await boot({ persona: 'driver', screen: 's1', scenario: 'collision' });
  check(!!app.doc.querySelector('#root [data-act="set-drivable"]'),
    'collision: question 6 is still asked');
  check(/6\s+still to check/i.test(app.text()),
    'collision: all six are counted');
  app.close();
}

/* Damage and inspection address are not asked for a theft either. */
{
  const app = await boot({ persona: 'driver', screen: 'photos', scenario: 'theft', navStack: ['s0'] });
  const fields = [...app.doc.querySelectorAll('#root input[data-field]')]
    .map(i => i.getAttribute('data-field'));

  check(!fields.includes('damageDesc'),
    'theft: no field asks a driver to describe damage they have not seen');
  check(!fields.includes('whereSeen'),
    'theft: no field asks where to inspect a vehicle nobody can find');
  // The photo slots stay — the empty parking space is still worth having.
  check(!!app.doc.querySelector('#root [data-act="shoot"]'),
    'theft: the photo slots are still offered');
  app.close();
}

/* The crime reference is typable without first answering the yes/no. */
{
  const app = await boot({ persona: 'driver', screen: 'police', scenario: 'theft', navStack: ['s0'] });
  const ref = app.doc.querySelector('#root input[data-field="policeRef"]');
  check(!!ref, 'theft: the crime reference field is there before the yes/no is answered');
  check(!!ref && !ref.disabled && !ref.readOnly,
    'theft: and it accepts typing');
  app.close();
}

/* ================================================================== *
 * RULE 17 · The driver's copy shows everything the driver answered.
 *
 * It shipped covering only the six blocking fields, so a driver who answered
 * cargo, ADR, witness and police saw none of it back. A copy that omits half
 * of what was sent is not a copy — and the omissions are invisible, because
 * nothing on the screen says a section is missing.
 * ================================================================== */
{
  const app = await boot({
    persona: 'driver', screen: 'archive', scenario: 'collision', navStack: ['done'],
    draft: {
      injured: true, injuredParties: ['driver', 'pedestrian'],
      injurySeverity: ['walking'], injuryEmergency: true,
      cargoLaden: true, cargoDesc: '24 pallets, packaged food',
      trailer: 'B-RL 8829', hazardous: true,
      witnessPresent: true, witnessName: 'Anna', witnessPhone: '+49 170 000',
      policeAttended: true, policeRef: '2026/074/0084217',
      otherPlate: 'M-XY 1234', otherMake: 'Silver Sprinter',
      otherDriver: 'Jan', otherPhone: '+49 171 111',
      otherInsurer: 'Some Insurer', otherPolicy: 'POL-99',
      easA: [1, 5], easB: [12], sigA: 'x', sigB: 'x', sketch: 'x',
    },
  });
  const text = app.text();

  check(app.errors.length === 0, 'archive: renders a full draft without errors',
    app.errors.slice(0, 2).join(' | '));

  // Every value the driver typed or tapped must appear somewhere on the page.
  for (const [label, needle] of [
    ['cargo description', '24 pallets, packaged food'],
    ['trailer number', 'B-RL 8829'],
    ['witness name', 'Anna'],
    ['witness phone', '+49 170 000'],
    ['crime/police reference', '2026/074/0084217'],
    ['other plate', 'M-XY 1234'],
    ['other make', 'Silver Sprinter'],
    ['other driver', 'Jan'],
    ['their insurer', 'Some Insurer'],
    ['their policy number', 'POL-99'],
  ]) {
    check(text.includes(needle), `archive: shows the ${label}`);
  }

  // Answers chosen from a list must read as their label, not their key.
  check(/Someone on foot or on a bike/.test(text),
    'archive: injured parties read as labels, not stored keys');
  check(/Walking and talking/.test(text),
    'archive: severity bands read as labels');
  check(!/\bour_vehicle\b|\bneeds_help\b|\bother_vehicle\b/.test(text),
    'archive: no raw enum keys leak into the driver\'s copy');

  // ADR is a safety fact and is stated either way.
  check(/Hazardous/i.test(text), 'archive: states the ADR answer');
  // Loaded/empty, not a bare "Yes".
  check(/Loaded|Empty/.test(text), 'archive: says whether the truck was loaded');
  // The signed statement is the thing a driver most wants a copy of.
  check(/Signed by/i.test(text), 'archive: records who signed the accident statement');

  app.close();
}

/* A skipped screen is shown as skipped, not left blank. */
{
  const app = await boot({
    persona: 'driver', screen: 'archive', scenario: 'collision', navStack: ['done'],
    draft: { skipped: ['witness', 'cargo', 'police'] },
  });
  const text = app.text();
  check((text.match(/Skipped/g) || []).length >= 3,
    'archive: each skipped screen says so rather than vanishing',
    `found ${(text.match(/Skipped/g) || []).length}`);
  app.close();
}

console.log(failed ? `\n${failed} rule assertion(s) failed` : '\nall rule assertions passed');
process.exit(failed ? 1 : 0);
