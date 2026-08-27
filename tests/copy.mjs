/**
 * The voice rules, enforced against the source rather than remembered.
 *
 * Four rules govern every string a driver reads. They are easy to state and
 * easy to forget three screens later, which is exactly the failure mode the
 * rest of this suite exists to prevent:
 *
 *   1. No em dash or en dash in driver-facing copy. It is the tell of
 *      generated prose. A sentence that needs one needs a full stop, a comma
 *      or a middot instead.
 *   2. Lean. No sentence over 18 words in a label, and no label that explains
 *      itself twice.
 *   3. Formal but friendly, and directing. No "please", no "sorry", no
 *      "are you sure", no exclamation marks.
 *   4. Second person. Address the driver as "you", never as "the driver" and
 *      never in the passive when an instruction is meant.
 *
 * SCOPE. Driver-facing strings only: the driver screens, the shell around
 * them, the toasts, and all five language packs. Code comments, dn() design
 * notes and the demo chrome are prose written for whoever is reading the
 * source or watching the demo, not copy the driver reads at a roadside.
 * They are exempt, deliberately — the chrome is styled unlike the product for
 * the same reason.
 *
 *   node tests/copy.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0;
const check = (ok, msg, detail) => {
  if (ok) console.log(`pass  ${msg}`);
  else { console.error(`FAIL  ${msg}${detail ? `\n      ${detail}` : ''}`); failed++; }
};

/* ------------------------------------------------------------------ *
 * Which files carry driver-facing copy.
 *
 * screens/fleet, screens/system and screens/export are read by a claims
 * handler and by whoever is watching the demo, not by a driver on a hard
 * shoulder. components/Chrome.jsx is the demo harness.
 * ------------------------------------------------------------------ */
const DRIVER_FACING = [
  /src[\\/]screens[\\/]driver[\\/]/,
  /src[\\/]components[\\/](DriverShell|Choice)\.jsx$/,
  /src[\\/]data[\\/]domain\.js$/,
  /src[\\/]core[\\/]actions\.jsx$/,
  /src[\\/]boot\.js$/,
];

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.jsx?$/.test(e.name)) files.push(p);
  }
})(join(ROOT, 'src'));

const targets = files.filter(f => DRIVER_FACING.some(re => re.test(f)));
const rel = f => f.replace(ROOT, '').replace(/\\/g, '/').replace(/^\//, '');

/**
 * Yields the lines of a file that are neither comments nor design-note prose.
 *
 * dn(...) strings and the *_NOTE / *_DN consts hoisted above a component are
 * the product argument, addressed to a reader of the demo. They argue ABOUT
 * the copy and quote the wording they are arguing against, so scanning them
 * would flag the very sentences that explain the rule.
 */
const DEMO_ONLY_HANDLER =
  /^\s*["'](?:fail-tpa|fail-net|fail-coverage|toggle-notes|req-refresh|send-chase|resolve-merge|triple-tap|reset)["']\s*:/;

function* copyLines(src) {
  const lines = src.split('\n');
  let inDemoHandler = false;
  let inBlockComment = false;

  // A design-note region: either a hoisted *_NOTE / *_DN const, which runs to
  // the line ending in ';', or a dn( ... ) call, which runs until its parens
  // balance. Line shape is not reliable here — these are multi-line string
  // concatenations with commas, parens and quotes inside them — so the end is
  // found by counting rather than by matching a pattern.
  let noteEnd = null;   // 'semicolon' | 'parens'
  let depth = 0;

  const countParens = s => {
    // ignore parens inside string literals
    const bare = s.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, '');
    let d = 0;
    for (const ch of bare) { if (ch === '(') d++; else if (ch === ')') d--; }
    return d;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();

    if (inBlockComment) { if (t.includes('*/')) inBlockComment = false; continue; }
    if (/^\{?\/\*/.test(t)) { if (!t.includes('*/')) inBlockComment = true; continue; }
    if (t.startsWith('//') || t.startsWith('*')) continue;

    // The demo harness explains itself in the driver's window: the DEMO timer
    // rail, the "design notes are on" hint, and the failure-theatre toasts that
    // narrate what a watcher should be looking at. They talk ABOUT the driver
    // to the person running the demo, so they are held to the chrome's voice,
    // not the product's. A real driver sees none of them.
    if (/timer-rail|DEMO|Design notes|Demo instrument/.test(raw)) continue;
    if (DEMO_ONLY_HANDLER.test(raw)) { inDemoHandler = true; continue; }
    if (inDemoHandler) {
      // handlers are one entry in the ACTIONS object; the next key ends it
      if (/^["'][a-z-]+["']\s*:/.test(t)) inDemoHandler = false;
      else continue;
    }

    if (noteEnd === 'semicolon') { if (/;\s*$/.test(t)) noteEnd = null; continue; }
    if (noteEnd === 'parens') {
      depth += countParens(raw);
      if (depth <= 0) noteEnd = null;
      continue;
    }

    // Design notes and the demo harness's own explanatory strings are written
    // for whoever is reading the source or watching the demo, not for a driver.
    if (/^(?:const\s+)?[A-Za-z0-9_]*(?:NOTE|DN)\s*=/.test(t)) {
      if (!/;\s*$/.test(t)) noteEnd = 'semicolon';
      continue;
    }
    if (/\bdn\(/.test(raw)) {
      depth = countParens(raw.slice(raw.indexOf('dn(')));
      if (depth > 0) { noteEnd = 'parens'; }
      continue;
    }
    // note: / sub: / why: / e: / meta: carry commentary in the screen
    // descriptors and the fake API's log entries.
    if (/^(?:note|sub|why|e|meta)\s*:/.test(t)) continue;

    // ACORD_MAP / ACORD_OMITTED are the audit tables, and logAdd() meta is the
    // System-pane trace. Both are documentation of the contract, read by a
    // handler or a demo watcher, never rendered to a driver.
    if (/^\{\s*[af]\s*:|^\{f\s*:|logAdd\(|\bwhy\s*:/.test(t)) continue;

    // A trailing // comment is prose about the line, not the line's copy.
    const code = raw.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, m => '\u0000'.repeat(m.length))
      .indexOf('//');
    const clean = code === -1 ? raw : raw.slice(0, code);
    if (!clean.trim()) continue;

    yield [i + 1, clean];
  }
}

/* ================================================================== *
 * RULE 1 · No em dash, no en dash.
 *
 * A bare '—' standing alone in quotes is the empty-value glyph in a summary
 * row ("Vehicle: —"), not prose. It is typography, and it is exempt.
 * '·' is the separator this project already uses between a label and a count.
 * ================================================================== */
{
  const hits = [];
  const PLACEHOLDER = /^(?:['"`])[—–](?:['"`])$/;

  for (const f of targets) {
    for (const [n, line] of copyLines(readFileSync(f, 'utf8'))) {
      if (!/[—–]/.test(line)) continue;
      // strip the standalone empty-value glyph, then re-test
      const stripped = line.replace(/(['"`])[—–]\1/g, m => (PLACEHOLDER.test(m) ? '' : m));
      if (!/[—–]/.test(stripped)) continue;
      hits.push(`${rel(f)}:${n}\n      ${line.trim().slice(0, 110)}`);
    }
  }

  check(hits.length === 0,
    'voice: no em dash or en dash in driver-facing copy',
    hits.slice(0, 8).join('\n      '));
}

/* ================================================================== *
 * RULE 2 · Lean. A label is not a paragraph.
 *
 * Counts words in the string literals that reach a driver. The threshold is
 * deliberately generous: this catches an explanation that grew a second
 * clause, not a carefully written sentence.
 * ================================================================== */
{
  const LIMIT = 18;
  const hits = [];

  for (const f of targets) {
    for (const [n, line] of copyLines(readFileSync(f, 'utf8'))) {
      // Every string that reaches a driver: a label/placeholder/title prop,
      // and the first positional argument to textField(), which is the label
      // on the free-text screens.
      const found = [];
      let m;
      const PROP = /\b(?:label|placeholder|title|sub|hint)\s*[:=]\s*["'`]([^"'`]{20,})["'`]/g;
      while ((m = PROP.exec(line))) found.push(m[1]);
      const FN = /\b(?:textField|Choice|Note)\s*\(\s*["'`]([^"'`]{20,})["'`]/g;
      while ((m = FN.exec(line))) found.push(m[1]);

      for (const text of found) {
        const words = text.replace(/<[^>]+>/g, ' ').replace(/&\w+;/g, 'x')
          .trim().split(/\s+/).length;
        if (words > LIMIT) {
          hits.push(`${rel(f)}:${n} · ${words} words\n      ${text.slice(0, 100)}`);
        }
      }
    }
  }

  check(hits.length === 0,
    `voice: no driver-facing label runs past ${LIMIT} words`,
    hits.slice(0, 6).join('\n      '));
}

/* ================================================================== *
 * RULE 3 · Formal but friendly, and directing.
 *
 * "Please" softens an instruction into a request the driver can decline,
 * which is wrong on a screen whose whole job is to direct. "Are you sure"
 * is banned by the working agreement already: make it undoable instead.
 * Exclamation marks are cheer, and nobody at a roadside wants cheering.
 * ================================================================== */
{
  const BANNED = [
    [/\bplease\b/i, '"please" — direct the driver, do not petition them'],
    [/\bbitte\b/i, '"bitte" — direct the driver, do not petition them'],
    [/\bare you sure\b/i, '"are you sure" — make it undoable instead'],
    [/\bsorry\b/i, '"sorry" — state the fact, do not apologise'],
    [/\boops\b/i, '"oops" — not the voice of a roadside tool'],
    [/!["'`]/, 'an exclamation mark — the voice is calm, not cheerful'],
  ];
  const hits = [];

  for (const f of targets) {
    for (const [n, line] of copyLines(readFileSync(f, 'utf8'))) {
      // only inside string literals, so a JSX `!x` negation is not a hit
      const strings = line.match(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g) || [];
      for (const s of strings) {
        for (const [re, why] of BANNED) {
          if (re.test(s)) hits.push(`${rel(f)}:${n} — ${why}\n      ${s.slice(0, 90)}`);
        }
      }
    }
  }

  check(hits.length === 0,
    'voice: formal but friendly, no petitioning and no cheer',
    hits.slice(0, 6).join('\n      '));
}

/* ================================================================== *
 * RULE 4 · Second person. The driver is "you", never "the driver".
 *
 * Third person in driver-facing copy is the sound of a system talking about
 * someone rather than to them. The design notes may say "the driver" as much
 * as they like — they are commentary — and copyLines() has already dropped
 * them before this runs.
 * ================================================================== */
{
  const hits = [];
  const THIRD = /\b(?:the|a)\s+driver\b/i;

  for (const f of targets) {
    for (const [n, line] of copyLines(readFileSync(f, 'utf8'))) {
      const strings = line.match(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g) || [];
      for (const s of strings) {
        // "the other driver" is a third party, not the person reading
        if (/\bother\s+driver\b/i.test(s)) continue;
        if (THIRD.test(s)) hits.push(`${rel(f)}:${n}\n      ${s.slice(0, 90)}`);
      }
    }
  }

  check(hits.length === 0,
    'voice: the driver is addressed as "you", never in the third person',
    hits.slice(0, 6).join('\n      '));
}

/* ================================================================== *
 * RULE 5 · The driver is on our side.
 *
 * "We will chase this one hard" shipped on the police screen. Read from a
 * hard shoulder it is a threat, and the person reading it is the employee who
 * just had a collision and is doing us a favour by reporting it at all.
 * Nothing may frame the driver as the party being pursued, pressed or
 * required. State what WE do; leave what they must do to the six fields that
 * genuinely block.
 * ================================================================== */
{
  const STRICT = [
    [/\bchase\s+(?:this|you|them|it)\b/i, 'chasing the driver — say what we do instead'],
    [/\bwe\s+will\s+chase\b/i, 'chasing the driver — say what we do instead'],
    [/\byou\s+must\b/i, '"you must" — only six fields block, and they say so themselves'],
    [/\byou\s+(?:are\s+)?required\b/i, '"required" — skipping is fine and is recorded'],
    [/\bfailure\s+to\b/i, '"failure to" — skipping is a known gap, not a failure'],
    [/\bdo\s+not\s+forget\b/i, 'scolding the driver'],
    [/\bmake\s+sure\s+you\b/i, 'scolding the driver'],
  ];
  const hits = [];

  for (const f of targets) {
    for (const [n, line] of copyLines(readFileSync(f, 'utf8'))) {
      const strings = line.match(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g) || [];
      for (const str of strings) {
        for (const [re, why] of STRICT) {
          if (re.test(str)) hits.push(rel(f) + ':' + n + ' · ' + why + '\n      ' + str.slice(0, 90));
        }
      }
      // JSX text between tags is not a string literal, so scan the line too
      const text = line.replace(/<[^>]*>/g, ' ');
      for (const [re, why] of STRICT) {
        if (re.test(text) && !strings.some(str => re.test(str))) {
          hits.push(rel(f) + ':' + n + ' · ' + why + '\n      ' + text.trim().slice(0, 90));
        }
      }
    }
  }

  check(hits.length === 0,
    'voice: the driver is on our side, never the party being chased',
    hits.slice(0, 6).join('\n      '));
}

/* ================================================================== *
 * RULE 6 · A yes/no question needs no accompanying text.
 *
 * Two buttons and a question are self-explanatory. A paragraph under them is
 * either restating the question or apologising for asking it, and it pushes
 * the next control off the screen. The reason a question is asked belongs in
 * the design note, which is where the argument is made.
 *
 * This checks the shape of the screen rather than the words: a Yes/No control
 * followed immediately by a body paragraph. It does not count the "Why now"
 * card, which is one shared component with one instance per screen.
 * ================================================================== */
{
  const hits = [];
  const YESNO = /<YesNo\b|value="yes"|value="no"/;

  for (const f of targets) {
    if (!/screens[\\/]driver[\\/]/.test(f)) continue;
    const lines = readFileSync(f, 'utf8').split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (!YESNO.test(lines[i])) continue;
      // look ahead past the closing of the choice group for a <Note> or a
      // card-quiet paragraph that is not conditional on an answer
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const t = lines[j].trim();
        if (YESNO.test(t)) { i = j; continue; }
        if (/^\{d\.\w+\s*===/.test(t) || /&&\s*\(/.test(t)) break;  // conditional: fine
        if (/^<Note\b/.test(t)) {
          hits.push(rel(f) + ':' + (j + 1) + '\n      ' + t.slice(0, 90));
          break;
        }
        if (/card-quiet/.test(t)) {
          hits.push(rel(f) + ':' + (j + 1) + '\n      ' + t.slice(0, 90));
          break;
        }
      }
    }
  }

  check(hits.length === 0,
    'voice: a yes/no question carries no unconditional explanatory text',
    hits.slice(0, 6).join('\n      '));
}

/* ================================================================== *
 * The rule set is documented where it will be read.
 * ================================================================== */
{
  const claude = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
  check(/no em dash|em dash/i.test(claude),
    'CLAUDE.md carries the dash rule');
  check(/second person/i.test(claude),
    'CLAUDE.md carries the second-person rule');
  check(/on our side|never the party being chased/i.test(claude),
    'CLAUDE.md carries the not-strict rule');
  check(/yes\/no question/i.test(claude),
    'CLAUDE.md carries the bare-yes/no rule');
  check(/earns its place|question the purpose/i.test(claude),
    'CLAUDE.md carries the text-block rule');
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall copy checks passed');
process.exit(failed ? 1 : 0);
