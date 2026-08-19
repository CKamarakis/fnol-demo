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
    if (c && typeof c.toElement === 'function') return createElement(Fragment, { key: i }, c.toElement());
    return c;
  }).filter(c => c != null);
}

class Builder {
  constructor(tag, attrs, children) {
    this.tag = tag;
    const { props, text, html } = toProps(attrs);
    this.props = props;
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
  toElement() {
    if (this.html != null) {
      return createElement(this.tag, {
        ...this.props,
        dangerouslySetInnerHTML: { __html: this.html },
      });
    }
    return createElement(this.tag, this.props, ...keyed(this.children));
  }
}

/**
 * React only accepts real elements, so the builder must become one before it
 * is returned into a tree. Screens call el() and append to it in the same
 * function, so converting at the point of return is enough: toElement() is
 * called by keyed() for any builder appended as a child, and by the render
 * boundary for the value a screen returns.
 */
export function toEl(x) {
  return x && typeof x.toElement === 'function' ? x.toElement() : x;
}

export function el(tag, attrs, ...children) {
  return new Builder(tag, attrs, children);
}

export { Fragment };
export const $ = (s, r) => (r || document).querySelector(s);
