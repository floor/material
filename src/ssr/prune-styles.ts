// src/ssr/prune-styles.ts
/**
 * Server-only: drop the CSS a rendered root can never match.
 *
 * A style rule is dropped only when every selector in its list requires a class
 * that is absent from the rendered shadow tree. Anything the analysis cannot
 * prove is kept: a selector with a functional pseudo-class (`:not`, `:has`,
 * `:is`, `:where`, `:host`), a `::slotted` or `::part` pseudo-element, an
 * escape or a quoted string; a selector that requires no class at all; and
 * every at-rule that is not a conditional group (`@keyframes`, `@property`,
 * `@layer`, `@starting-style`, and anything not yet known). A conditional group
 * goes only when nothing in it survives, so an empty `@media` cannot ship.
 *
 * The pruned sheet is read before upgrade and never after: `attachShadow`
 * removes a declarative root's children and the element adopts the full sheet.
 */

/** Group rules whose body is pruned, in the same place in the cascade. */
const CONDITIONAL = /^@(media|supports|container)\b/;
/** A selector this analysis does not evaluate, or one whose classes it cannot read. */
const OPAQUE = /:(?:not|has|is|where|host)\(|::(?:slotted|part)\(|\\/;
const CLASS = /\.([A-Za-z_][A-Za-z0-9_-]*)/g;
const STRINGS = /"[^"]*"|'[^']*'/g;
const COMMENTS = /\/\*[\s\S]*?\*\//g;

/** The index just past the quoted string that starts at `at`. */
const afterString = (css: string, at: number, end: number): number => {
  const quote = css[at];
  at += 1;
  while (at < end && css[at] !== quote) at += css[at] === "\\" ? 2 : 1;
  return at + 1;
};

/** The index just past the string or comment that starts at `at`, or `at` itself. */
const afterOpaque = (css: string, at: number, end: number): number => {
  const char = css[at];
  if (char === '"' || char === "'") return afterString(css, at, end);
  if (char === "/" && css[at + 1] === "*") {
    const close = css.indexOf("*/", at + 2);
    return close < 0 ? end : Math.min(close + 2, end);
  }
  return at;
};

/** A selector list split at its top-level commas. */
const selectorsOf = (prelude: string): string[] => {
  const selectors: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < prelude.length; i += 1) {
    const after = afterOpaque(prelude, i, prelude.length);
    if (after !== i) {
      i = after - 1;
      continue;
    }
    const char = prelude[i];
    if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth = Math.max(0, depth - 1);
    else if (char === "," && depth === 0) {
      selectors.push(prelude.slice(start, i));
      start = i + 1;
    }
  }
  selectors.push(prelude.slice(start));
  return selectors.map((selector) => selector.trim());
};

/** Whether the selector needs a class the rendered tree does not carry. */
const requiresAbsent = (selector: string, present: ReadonlySet<string>): boolean => {
  if (OPAQUE.test(selector)) return false;
  const text = selector.replace(STRINGS, "").replace(COMMENTS, "");
  for (const [, name] of text.matchAll(CLASS)) {
    if (!present.has(name)) return true;
  }
  return false;
};

const prune = (css: string, from: number, to: number, present: ReadonlySet<string>): string => {
  let kept = "";
  let start = from;
  let i = from;
  while (i < to) {
    const after = afterOpaque(css, i, to);
    if (after !== i) {
      i = after;
      continue;
    }
    const char = css[i];
    if (char === ";") {
      // A statement at-rule (`@layer a, b;`): kept where it is.
      i += 1;
      kept += css.slice(start, i);
      start = i;
      continue;
    }
    if (char !== "{") {
      i += 1;
      continue;
    }
    const prelude = css.slice(start, i).trim();
    const body = i + 1;
    let depth = 1;
    i = body;
    while (i < to && depth > 0) {
      const inside = afterOpaque(css, i, to);
      if (inside !== i) {
        i = inside;
        continue;
      }
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") depth -= 1;
      i += 1;
    }
    if (CONDITIONAL.test(prelude)) {
      const inner = prune(css, body, i - 1, present);
      if (inner.trim()) kept += `${prelude}{${inner}}`;
    } else if (prelude.startsWith("@") || !selectorsOf(prelude).every((selector) => requiresAbsent(selector, present))) {
      kept += css.slice(start, i);
    }
    start = i;
  }
  return kept + css.slice(start, to);
};

/** The stylesheet without the rules the rendered root can never match. */
export const pruneStyles = (css: string, present: ReadonlySet<string>): string => prune(css, 0, css.length, present);

/** Every class the rendered shadow tree carries. */
export const renderedClasses = (root: ShadowRoot): ReadonlySet<string> => {
  const present = new Set<string>();
  for (const element of Array.from(root.querySelectorAll("*"))) {
    for (const name of Array.from(element.classList)) present.add(name);
  }
  return present;
};
