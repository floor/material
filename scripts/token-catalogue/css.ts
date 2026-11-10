/**
 * scripts/token-catalogue/css.ts
 *
 * A small CSS walker over final outputs: it parses blocks (rules, nested
 * at-rules, nested rules) and splits declarations respecting parentheses and
 * strings, and reports every custom-property declaration, every var()
 * reference with its fallback, and every @property registration, each with the
 * selector and at-rule context it appeared in. Not a regex over Sass source:
 * the inputs are the built CSS files the package ships.
 */
import { createHash } from "node:crypto";

export interface CssContext {
  file: string;
  /** The rule's selector, or an at-rule prelude (`@media …`). */
  selector: string;
  /** Enclosing at-rule preludes, outermost first (`@layer mtrl.base`). */
  at: string[];
}

export interface CssDeclaration extends CssContext {
  name: string;
  value: string;
}

export interface CssReference extends CssContext {
  name: string;
  /** The fallback expression, when the var() carries one. */
  fallback: string | null;
  /** The declaration the reference appeared in (property or custom name). */
  within: string;
  /** The declaration's full value, so a bare `var()` read is tellable from a
   * compound one without re-parsing the file. */
  value: string;
}

export interface CssRegistration extends CssContext {
  name: string;
  syntax: string;
  inherits: boolean;
  initialValue: string;
}

export interface WalkResult {
  declarations: CssDeclaration[];
  references: CssReference[];
  registrations: CssRegistration[];
}

/** Strip comments; keep one whitespace where they sat between tokens. */
const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, " ");

/** Split a declaration list on top-level semicolons, quotes and parens aware. */
const splitDeclarations = (text: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quote) {
      if (char === "\\") i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (char === ";" && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  if (start < text.length) parts.push(text.slice(start));
  return parts.map(part => part.trim()).filter(Boolean);
};

/** A declaration's `name: value`, or null when the text is not one. */
const splitProperty = (text: string): { name: string; value: string } | null => {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quote) {
      if (char === "\\") i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (char === ":" && depth === 0) {
      const name = text.slice(0, i).trim();
      const value = text.slice(i + 1).trim();
      // A selector arm or a nested rule is not a declaration.
      if (!name || !value || /[\s{}]/.test(name)) return null;
      return { name, value };
    }
  }
  return null;
};

/** The end of the parenthesis group that opens at `open`, or -1. */
const matchingParen = (text: string, open: number): number => {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const char = text[i]!;
    if (quote) {
      if (char === "\\") i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(") depth++;
    else if (char === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
};

/** Every `var(--name, fallback)` in a value, outermost first, deduplicated.
 * Quoted strings are skipped: a `var()` inside a string literal is content. */
const referencesIn = (value: string): Array<{ name: string; fallback: string | null }> => {
  const found: Array<{ name: string; fallback: string | null }> = [];
  const seen = new Set<string>();
  const visit = (text: string): void => {
    let quote: string | null = null;
    let start = 0;
    const unquoted: string[] = [];
    for (let i = 0; i < text.length; i++) {
      const char = text[i]!;
      if (quote) {
        if (char === "\\") i++;
        else if (char === quote) {
          quote = null;
          unquoted.push(" ");
          start = i + 1;
        }
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        unquoted.push(text.slice(start, i));
      }
    }
    unquoted.push(text.slice(start));
    for (const segment of unquoted) {
      let at = segment.indexOf("var(");
      while (at >= 0) {
        const close = matchingParen(segment, at + 3);
        if (close < 0) break;
        const inner = segment.slice(at + 4, close).trim();
        const comma = inner.indexOf(",");
        const name = comma < 0 ? inner : inner.slice(0, comma).trim();
        const fallback = comma < 0 ? null : inner.slice(comma + 1).trim();
        if (/^--[\w-]+$/.test(name) && !seen.has(name)) {
          seen.add(name);
          found.push({ name, fallback });
        }
        // A fallback can itself reference tokens; those count too.
        if (fallback) visit(fallback);
        at = segment.indexOf("var(", close);
      }
    }
  };
  visit(value);
  return found;
};

/**
 * Walk one stretch of CSS. `at` carries enclosing at-rule preludes and
 * `within` the selector of the enclosing rule, so nested rules report their
 * full context.
 */
const walk = (
  file: string,
  css: string,
  at: string[],
  within: string,
  result: WalkResult,
): void => {
  let depth = 0;
  let quote: string | null = null;
  let blockStart = -1;
  let scanned = 0;
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    if (quote) {
      if (char === "\\") i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === ";" && depth === 0) {
      // A statement, not a block (`@layer a,b;`, `@import …;`): skip past it.
      scanned = i + 1;
    } else if (char === "{") {
      if (depth === 0) blockStart = i;
      depth++;
    } else if (char === "}") {
      depth = Math.max(0, depth - 1);
      if (depth === 0 && blockStart >= 0) {
        const prelude = css.slice(scanned, blockStart).trim();
        const body = css.slice(blockStart + 1, i);
        const rest = css.slice(i + 1);
        if (prelude.startsWith("@")) {
          if (/^@(media|supports|layer|container|scope)\b/i.test(prelude)) {
            // An at-rule that wraps rules: descend with the prelude as context.
            walk(file, body, [...at, prelude], within, result);
          } else if (/^@property\b/i.test(prelude)) {
            const read = (key: string): string =>
              splitDeclarations(body)
                .map(part => splitProperty(part))
                .find(property => property?.name === key)?.value ?? "";
            result.registrations.push({
              file,
              selector: within,
              at,
              name: /^@property\s+(--[\w-]+)/i.exec(prelude)?.[1] ?? "",
              syntax: read("syntax"),
              inherits: read("inherits") === "true",
              initialValue: read("initial-value"),
            });
          } else {
            // @keyframes and friends: walk the inner blocks as contexts.
            walk(file, body, [...at, prelude], prelude, result);
          }
        } else {
          const selector = within ? `${within} ${prelude}` : prelude;
          const context: CssContext = { file, selector, at };
          for (const part of splitDeclarations(body)) {
            const property = splitProperty(part);
            if (!property) continue;
            if (property.name.startsWith("--")) {
              result.declarations.push({ ...context, name: property.name, value: property.value });
            }
            for (const reference of referencesIn(property.value)) {
              result.references.push({ ...context, ...reference, within: property.name, value: property.value });
            }
          }
          // CSS nesting: a rule body can hold declarations and rules.
          walk(file, body, at, selector, result);
        }
        walk(file, rest, at, within, result);
        return;
      }
    }
  }
};

/** Parse one built CSS file into declarations, references and registrations. */
export function walkCss(file: string, css: string): WalkResult {
  const result: WalkResult = { declarations: [], references: [], registrations: [] };
  walk(file, stripComments(css), [], "", result);
  return result;
}

/** sha256 of a string or bytes, hex. */
export function sha256(text: string | Uint8Array): string {
  return createHash("sha256").update(text).digest("hex");
}
