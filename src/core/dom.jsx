import { createElement, Fragment, isValidElement } from 'react';

/**
 * el(tag, attrs, ...children) — the element builder the screens are written
 * against. It now produces React elements.
 *
 * The screens build trees imperatively in places:
 *
 *     const body = el("div", {class:"pad"});
 *     body.append(el("p", {text:"..."}));
 *     if (cond) body.append(somethingElse);
 *
 * That reads naturally for conditional, data-driven forms, and it is where
 * the product logic lives — so rather than rewrite 300 call sites into nested
 * JSX, el() returns a thin mutable builder that collects children and turns
 * into a React element only when React asks for it. Components stay real
 * components; React owns reconciliation either way.
 *
 * Attribute shims, so existing call sites remain valid:
 *   class → className   html → dangerouslySetInnerHTML   text → child
 *   onclick → onClick   style string → style object      for → htmlFor
 */

const EVENT = /^on[a-z]/;
const SVG_ATTR = {
  'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin', 'stroke-dasharray': 'strokeDasharray',
  'stroke-opacity': 'strokeOpacity', 'fill-rule': 'fillRule', 'clip-rule': 'clipRule',
  'text-anchor': 'textAnchor', 'font-size': 'fontSize', 'font-family': 'fontFamily',
  'font-weight': 'fontWeight', 'letter-spacing': 'letterSpacing',
  'stop-color': 'stopColor', 'stop-opacity': 'stopOpacity',
  'clip-path': 'clipPath', 'fill-opacity': 'fillOpacity', 'paint-order': 'paintOrder',
  'dominant-baseline': 'dominantBaseline', 'patternunits': 'patternUnits',
  'patternUnits': 'patternUnits', 'gradientUnits': 'gradientUnits',
};

/** "color:red;font-size:2px" → { color:'red', fontSize:'2px' } */
function parseStyle(str) {
  if (typeof str !== 'string') return str;
  const out = {};
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) continue;
    out[prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = val;
  }
  return out;
}

function toProps(attrs) {
  const props = {};
  let text = null, html = null;
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') props.className = v;
    else if (k === 'html') html = v;
    else if (k === 'text') text = v;
    else if (k === 'style') props.style = parseStyle(v);
    else if (k === 'for') props.htmlFor = v;
    else if (k === 'value' && !('onChange' in (attrs || {}))) { props.defaultValue = v; }
    else if (k === 'checked') props.defaultChecked = v;
    else if (EVENT.test(k)) props['on' + k[2].toUpperCase() + k.slice(3)] = v;
    else if (SVG_ATTR[k]) props[SVG_ATTR[k]] = v;
    else props[k] = v === true ? '' : v;
  }
  return { props, text, html };
}

/** Children arrive positionally and these subtrees are static, so index keys are safe. */
function keyed(kids) {
  return kids.map((c, i) => {
    if (c == null || c === false || c === true) return null;
    if (isValidElement(c)) return c.key == null ? createElement(Fragment, { key: i }, c) : c;
    if (c && typeof c.build === 'function') return createElement(Fragment, { key: i }, c.build());
    return c;
  }).filter(c => c != null);
}

class Builder {
  constructor(tag, attrs, children) {
    this.tag = tag;
    const { props, text, html } = toProps(attrs);
    this.attrs = props;
    this.html = html;
    this.children = [];
    if (text != null) this.children.push(text);
    this.append(...children);
  }
  /** Mirrors DOM append: accepts nodes, arrays, strings; ignores null/false. */
  append(...kids) {
    for (const c of kids.flat(9)) {
      if (c == null || c === false) continue;
      this.children.push(c);
    }
    return this;
  }
  build() {
    if (this.html != null) {
      return createElement(this.tag, {
        ...this.attrs,
        dangerouslySetInnerHTML: { __html: this.html },
      });
    }
    return createElement(this.tag, this.attrs, ...keyed(this.children));
  }
}

/**
 * A Builder is accepted anywhere a React element is.
 *
 * React identifies elements by the `$$typeof` symbol and then reads `type`,
 * `props`, `key` and `ref`. Exposing those as lazy getters means the builder
 * materialises only when React actually reads it — so children appended after
 * construction are still included, and a builder can be returned straight into
 * JSX without any conversion call at the boundary.
 *
 * This matters because screens mix both styles freely: JSX that embeds a
 * builder-returning helper like textField(), and builders that append JSX.
 * Requiring an explicit conversion at every crossing is exactly the kind of
 * rule that gets forgotten and fails at runtime.
 */
function materialise(b) {
  return (b._el ??= b.build());
}

Object.defineProperties(Builder.prototype, {
  $$typeof: { get() { return materialise(this).$$typeof; }, configurable: true },
  type:     { get() { return materialise(this).type; }, configurable: true },
  props:    { get() { return materialise(this).props; }, configurable: true },
  key:      { get() { return materialise(this).key; }, configurable: true },
  ref:      { get() { return materialise(this).ref ?? null; }, configurable: true },
});

/** Kept for explicit use; the getters above make it optional. */
export function toEl(x) {
  return x && typeof x.build === 'function' ? materialise(x) : x;
}

export function el(tag, attrs, ...children) {
  return new Builder(tag, attrs, children);
}

export { Fragment };
export const $ = (s, r) => (r || document).querySelector(s);
