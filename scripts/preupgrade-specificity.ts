// Specificity of a pre-upgrade selector, Selectors Level 4: an id, then a
// class / attribute / pseudo-class, then a type / pseudo-element. `:not()`,
// `:is()` and `:has()` take their argument's specificity. `:where()` adds none.
import { preupgradeRollback } from "../src/elements/styles";

export type Specificity = readonly [number, number, number];

const compare = (left: Specificity, right: Specificity): number =>
  left[0] - right[0] || left[1] - right[1] || left[2] - right[2];

/** Selectors of compressed CSS that has no nested rules. */
export const ruleSelectors = (css: string): string[] => {
  const selectors: string[] = [];
  for (const match of css.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
    selectors.push(...splitSelectors(match[1]));
  }
  return selectors;
};

/** Comma-separated selectors, not commas inside a function, an attribute or a string. */
export const splitSelectors = (prelude: string): string[] => {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let i = 0; i < prelude.length; i++) {
    const char = prelude[i];
    if (quote) {
      if (char === "\\") i++;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") depth--;
    else if (char === "," && depth === 0) {
      parts.push(prelude.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = prelude.slice(start).trim();
  if (last) parts.push(last);
  return parts;
};

const specificity = (selector: string): Specificity => {
  let a = 0;
  let b = 0;
  let c = 0;
  let i = 0;
  const fail = (): never => {
    throw new Error(`Unparsed pre-upgrade selector at ${JSON.stringify(selector.slice(i))} in ${selector}`);
  };
  const escape = (): void => {
    i++;
    if (i >= selector.length) return;
    if (/[0-9a-fA-F]/.test(selector[i])) {
      let digits = 0;
      while (digits < 6 && i < selector.length && /[0-9a-fA-F]/.test(selector[i])) {
        i++;
        digits++;
      }
      if (i < selector.length && /[\n\r\f\t ]/.test(selector[i])) i++;
      return;
    }
    i++;
  };
  const ident = (): void => {
    if (selector[i] === "-") i++;
    if (i >= selector.length) fail();
    if (selector[i] === "\\") escape();
    else i++;
    while (i < selector.length) {
      const char = selector[i];
      if (char === "\\") escape();
      else if (/[A-Za-z0-9_-]/.test(char) || char.charCodeAt(0) > 127) i++;
      else break;
    }
  };
  const skip = (open: string, close: string): string => {
    const start = i;
    let depth = 0;
    let quote = "";
    while (i < selector.length) {
      const char = selector[i];
      if (quote) {
        i += char === "\\" ? 2 : 1;
        if (char === quote) quote = "";
        continue;
      }
      if (char === '"' || char === "'") { quote = char; i++; continue; }
      if (char === "\\") { i += 2; continue; }
      i++;
      if (char === open) depth++;
      else if (char === close) {
        depth--;
        if (depth === 0) return selector.slice(start + 1, i - 1);
      }
    }
    return fail();
  };
  while (i < selector.length) {
    const char = selector[i];
    if (char === " " || char === "\n" || char === "\t" || char === "+" || char === ">" || char === "~") {
      i++;
      continue;
    }
    if (char === "*") { i++; continue; }
    if (char === "#") {
      i++;
      ident();
      a++;
      continue;
    }
    if (char === ".") {
      i++;
      ident();
      b++;
      continue;
    }
    if (char === "[") {
      skip("[", "]");
      b++;
      continue;
    }
    if (char === ":") {
      const pseudoElement = selector[i + 1] === ":";
      i += pseudoElement ? 2 : 1;
      const nameStart = i;
      ident();
      const name = selector.slice(nameStart, i);
      if (selector[i] === "(") {
        const inner = skip("(", ")");
        if (pseudoElement) c++;
        else if (name === "where") { /* adds nothing */ }
        else if (name === "not" || name === "is" || name === "has") {
          let best: Specificity = [0, 0, 0];
          for (const argument of splitSelectors(inner)) {
            const next = specificity(argument);
            if (compare(next, best) > 0) best = next;
          }
          a += best[0];
          b += best[1];
          c += best[2];
        } else if (name === "nth-child" || name === "nth-last-child") {
          b++;
          const of = inner.match(/\sof\s([\s\S]*)$/);
          if (of?.[1]) {
            const extra = specificity(of[1]);
            a += extra[0];
            b += extra[1];
            c += extra[2];
          }
        } else b++;
      } else if (pseudoElement) c++;
      else b++;
      continue;
    }
    if (char === "\\" || /[A-Za-z_]/.test(char) || char.charCodeAt(0) > 127 || char === "-") {
      ident();
      c++;
      continue;
    }
    fail();
  }
  return [a, b, c];
};

export const selectorSpecificity = specificity;

/**
 * What a selector styles, relative to the undefined host: `host`, `host::before`,
 * `child` (a direct child, including a following sibling of one), and so on.
 * Combinators inside a function (`:has(> [icon])`) are not the subject.
 */
export const subjectShape = (selector: string): string => {
  let depth = 0;
  let descendant = false;
  let pseudo = "";
  let compound = false;
  let i = 0;
  const fail = (): never => {
    throw new Error(`Unparsed pre-upgrade selector at ${JSON.stringify(selector.slice(i))} in ${selector}`);
  };
  const escape = (): void => {
    i++;
    if (i >= selector.length) return;
    if (/[0-9a-fA-F]/.test(selector[i])) {
      let digits = 0;
      while (digits < 6 && i < selector.length && /[0-9a-fA-F]/.test(selector[i])) {
        i++;
        digits++;
      }
      if (i < selector.length && /[\n\r\f\t ]/.test(selector[i])) i++;
      return;
    }
    i++;
  };
  const ident = (): void => {
    if (selector[i] === "-") i++;
    if (i >= selector.length) fail();
    if (selector[i] === "\\") escape();
    else i++;
    while (i < selector.length) {
      const char = selector[i];
      if (char === "\\") escape();
      else if (/[A-Za-z0-9_-]/.test(char) || char.charCodeAt(0) > 127) i++;
      else break;
    }
  };
  const skip = (open: string, close: string): void => {
    let nest = 0;
    let quote = "";
    while (i < selector.length) {
      const char = selector[i];
      if (quote) {
        i += char === "\\" ? 2 : 1;
        if (char === quote) quote = "";
        continue;
      }
      if (char === '"' || char === "'") { quote = char; i++; continue; }
      if (char === "\\") { i += 2; continue; }
      i++;
      if (char === open) nest++;
      else if (char === close) {
        nest--;
        if (nest === 0) return;
      }
    }
    fail();
  };
  const nextCompound = (child: boolean): void => {
    if (child) depth++;
    pseudo = "";
    compound = false;
  };
  while (i < selector.length) {
    const char = selector[i];
    if (char === " " || char === "\n" || char === "\t") {
      let j = i;
      while (j < selector.length && /[\n\t ]/.test(selector[j])) j++;
      const next = selector[j];
      if (next === ">" || next === "+" || next === "~") { i = j; continue; }
      if (compound && next) {
        depth++;
        descendant = true;
        pseudo = "";
        compound = false;
      }
      i = j;
      continue;
    }
    if (char === ">") { nextCompound(true); i++; continue; }
    if (char === "+" || char === "~") { nextCompound(false); i++; continue; }
    compound = true;
    if (char === "*") { i++; continue; }
    if (char === "#") { i++; ident(); continue; }
    if (char === ".") { i++; ident(); continue; }
    if (char === "[") { skip("[", "]"); continue; }
    if (char === ":") {
      const pseudoElement = selector[i + 1] === ":";
      i += pseudoElement ? 2 : 1;
      const nameStart = i;
      ident();
      const name = selector.slice(nameStart, i);
      if (selector[i] === "(") skip("(", ")");
      if (pseudoElement) pseudo = name;
      continue;
    }
    if (char === "\\" || /[A-Za-z_]/.test(char) || char.charCodeAt(0) > 127 || char === "-") {
      ident();
      continue;
    }
    fail();
  }
  const base = depth === 0 ? "host" : descendant ? `descendant-${depth}` : depth === 1 ? "child" : `child-${depth}`;
  return pseudo ? `${base}::${pseudo}` : base;
};

/**
 * The rollback is last, has no tag, and its specificity is strictly above
 * every selector in `rules` (the sheet without the rollback). No rule in
 * `rules` may contain an id, which is what makes `:not(#\0)` win for good.
 * A selector is beaten by a rollback selector of the same subject.
 */
export const assertRollbackBeats = (rules: string): { selector: string; specificity: Specificity } => {
  const rollback = preupgradeRollback();
  const prelude = rollback.slice(0, rollback.indexOf("{"));
  const rollbackByShape = new Map<string, Specificity[]>();
  for (const selector of splitSelectors(prelude)) {
    const shape = subjectShape(selector);
    const ranks = rollbackByShape.get(shape) ?? [];
    ranks.push(specificity(selector));
    rollbackByShape.set(shape, ranks);
  }
  let max: { selector: string; specificity: Specificity } = { selector: "", specificity: [0, 0, 0] };
  for (const selector of ruleSelectors(rules)) {
    const rank = specificity(selector);
    if (rank[0] !== 0) throw new Error(`A pre-upgrade selector has an id, so :not(#\\0) does not beat it: ${selector}`);
    if (compare(rank, max.specificity) > 0) max = { selector, specificity: rank };
    const shape = subjectShape(selector);
    const covering = rollbackByShape.get(shape);
    if (!covering) throw new Error(`Rollback has no selector for ${shape}: ${selector}`);
    if (!covering.some((required) => compare(required, rank) > 0)) {
      throw new Error(`Rollback does not beat ${shape} ${selector} (${rank.join(",")})`);
    }
  }
  return max;
};

/** Form 1: the attribute repeated once more than the highest class-column, then `:not(:defined)`. */
export const repeatedAttributeBytes = (classColumn: number): number => {
  const attribute = "[data-mtrl-ssr]".repeat(classColumn + 1);
  const base = `${attribute}:not(:defined)`;
  return `${base},${base}::before,${base}::after,${base} > *{all:revert-layer}`.length;
};

export const specificityText = (rank: Specificity): string => rank.join(",");
