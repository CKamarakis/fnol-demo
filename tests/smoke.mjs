/**
 * Load-time smoke test for the built bundle.
 *
 * Catches what static checks cannot: declaration-order bugs, temporal dead
 * zone errors, and anything that throws while the module graph initialises.
 * The build concatenates modules in dependency order, so if that order is
 * ever wrong this is what fails.
 *
 *   node tests/smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'dist', 'prototype.html'), 'utf8');
const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

/** Minimal DOM stub — enough for module init, not for rendering. */
const node = () => ({
  children: [], style: { setProperty() {}, getPropertyValue: () => '', removeProperty() {} }, dataset: {},
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  setAttribute() {}, getAttribute: () => null, removeAttribute() {},
  append(...c) { this.children.push(...c); }, appendChild(c) { this.children.push(c); return c; },
  addEventListener() {}, removeEventListener() {},
  querySelector: () => null, querySelectorAll: () => [], closest: () => null,
  insertAdjacentHTML() {}, focus() {}, remove() {}, contains: () => false,
  getContext: () => null, getBoundingClientRect: () => ({ width: 390, height: 844, top: 0, left: 0 }),
  set innerHTML(_) {}, get innerHTML() { return ''; },
  set textContent(_) {}, get textContent() { return ''; },
  scrollTop: 0, scrollHeight: 0, offsetWidth: 390, offsetHeight: 844, value: '', checked: false,
});

const store = Object.create(null);
const define = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });

define('document', {
  createElement: node, createElementNS: node, createTextNode: node,
  getElementById: node, querySelector: node, querySelectorAll: () => [],
  addEventListener() {}, body: node(), documentElement: node(),
});
define('window', {
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  location: { href: '' }, innerWidth: 1440, innerHeight: 900,
});
define('localStorage', {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
});
define('navigator', { language: 'en', onLine: true });
define('requestAnimationFrame', cb => setTimeout(cb, 0));
// boot starts a heartbeat interval; stub the timers so the test can exit.
define('setInterval', () => 0);
define('setTimeout', () => 0);
define('matchMedia', globalThis.window.matchMedia);

try {
  new Function(js)();
  console.log('PASS  bundle initialises — no ordering or TDZ errors');
  process.exit(0);
} catch (e) {
  console.error(`FAIL  bundle threw at load: ${e.constructor.name}: ${e.message}`);
  process.exit(1);
}
