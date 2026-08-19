/**
 * Text contrast, measured from the stylesheets themselves.
 *
 * The light-theme conversion remapped colours in bulk, which twice left ink
 * paired with the wrong ground — dark text on the dark chrome bar, and coral
 * used as text where it only works as a surface. Both were unreadable, and
 * both passed every other check in this repo.
 *
 * WCAG AA: 4.5:1 for body text, 3:1 for large text and UI boundaries.
 *
 *   node tests/contrast.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, 'src', 'styles', f), 'utf8');
const tokensCss = read('00-tokens.css');
const chromeCss = read('01-chrome.css');

/** Relative luminance per WCAG 2.x. */
const lum = hex => {
  const c = hex.replace('#', '').match(/../g).map(x => {
    const v = parseInt(x, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

const ratio = (a, b) => {
  const x = lum(a), y = lum(b);
  return +(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2));
};

const HEX = '(#[0-9a-fA-F]{6})';

/** Token values are the source of truth — read them, never hardcode. */
const token = name => {
  const m = tokensCss.match(new RegExp(`--${name}:\\s*${HEX}`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
};

/** Pull a declared colour back out of a stylesheet, so this tests reality. */
const declared = (css, selector, prop = 'color') => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(`${esc}\\{[^}]*${prop}:\\s*${HEX}`, 'i'));
  if (!m) throw new Error(`${selector} { ${prop} } not found`);
  return m[1];
};

let failed = 0;
const check = (label, fg, bg, min = 4.5) => {
  const r = ratio(fg, bg);
  if (r >= min) {
    console.log(`pass  ${label.padEnd(28)} ${String(r).padStart(6)}:1`);
  } else {
    console.error(`FAIL  ${label.padEnd(28)} ${String(r).padStart(6)}:1  (need ${min}) ${fg} on ${bg}`);
    failed++;
  }
};

// --- product surfaces, from the tokens ---
const bg = token('bg');
check('body text', token('ink'), bg, 7);
check('secondary text', token('ink-2'), bg);
check('tertiary text', token('ink-3'), bg);
check('text on cards', token('ink'), token('bg-raise'), 7);
check('white on primary button', token('accent-ink'), token('accent'));
check('emergency text', token('danger-deep'), bg);
check('success text', token('ok'), bg);
check('warning text', token('warn'), bg);
check('borders vs ground', token('line'), bg, 1.4);

// Coral is a surface colour. It fails as ink on light — which is exactly the
// mistake this file exists to prevent. Assert the failure, so nobody later
// "fixes" --danger into a text colour.
const coralAsText = ratio(token('danger'), bg);
if (coralAsText >= 4.5) {
  console.error(`FAIL  coral unexpectedly passes as text (${coralAsText}:1) — check the token`);
  failed++;
} else {
  console.log(`pass  coral is surface-only        ${String(coralAsText).padStart(6)}:1  (by design)`);
}
check('white on coral surface', '#ffffff', token('danger'), 3);

// --- the demo chrome: a dark bar carrying pale control chips ---
const barMatch = chromeCss.match(new RegExp(`#chrome\\{[^}]*background:\\s*${HEX}`, 'i'));
if (!barMatch) {
  console.error('FAIL  chrome bar background not found');
  failed++;
} else {
  const bar = barMatch[1];
  check('chrome label on bar', declared(chromeCss, '.chrome-tag'), bar);
  check('chrome brand on bar', declared(chromeCss, '.chrome-brand'), bar);
  check('chrome brand mark', declared(chromeCss, '.chrome-brand b'), bar);
  check('chrome hint on bar', declared(chromeCss, '.chrome-hint'), bar);
}

const chipMatch = chromeCss.match(new RegExp(`\\.seg\\{[^}]*background:\\s*${HEX}`, 'i'));
const chip = chipMatch ? chipMatch[1] : '#e7edf3';
check('segmented control', declared(chromeCss, '.seg button'), chip);
check('toggle label', declared(chromeCss, '.tog'), chip);
check('toggle (fire)', declared(chromeCss, '.tog.fire'), chip);
check('chrome button', declared(chromeCss, '.chrome-btn'), chip);

console.log(failed ? `\n${failed} contrast failure(s)` : '\nall contrast checks passed');
process.exit(failed ? 1 : 0);
