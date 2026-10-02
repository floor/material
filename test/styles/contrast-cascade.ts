// test/styles/contrast-cascade.ts
// Resolve theme colour custom properties the way the cascade does: selectors,
// specificity, source order, the two media features, and inheritance from an
// unthemed root. No browser. FLO-540.
export type Spec = [number, number, number];

export type ElementState = {
  root: boolean;
  theme: string | null;
  mode: string | null;
  contrast: string | null;
  dark: boolean;
};

export type OsState = { scheme: "light" | "dark"; contrast: "no-preference" | "more" };

type Media = { scheme: "light" | "dark" | null; contrastMore: boolean };

type Rule = {
  selectors: string[];
  media: Media;
  layer: string | null;
  order: number;
  decls: [string, string][];
};

const EMPTY_MEDIA: Media = { scheme: null, contrastMore: false };

function addSpec(a: Spec, b: Spec): Spec {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function cmpSpec(a: Spec, b: Spec): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

function matchParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`unclosed paren in ${text}`);
}

function splitTop(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && ch === separator) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

type Simple =
  | { kind: "root" }
  | { kind: "class"; name: string }
  | { kind: "attr"; name: string; value: string | null }
  | { kind: "is" | "not"; args: string[] };

function parseCompound(selector: string): Simple[] {
  const parts: Simple[] = [];
  const s = selector.trim();
  let i = 0;
  while (i < s.length) {
    if (s[i] === " " || s[i] === "\n" || s[i] === "\t") {
      throw new Error(`descendant combinator in ${selector}`);
    }
    if (s.startsWith(":is(", i) || s.startsWith(":not(", i)) {
      const kind = s.startsWith(":is(", i) ? "is" : "not";
      const open = i + kind.length + 1;
      const end = matchParen(s, open);
      parts.push({ kind, args: splitTop(s.slice(open + 1, end), ",").map(arg => arg.trim()).filter(Boolean) });
      i = end + 1;
    } else if (s.startsWith(":root", i)) {
      parts.push({ kind: "root" });
      i += 5;
    } else if (s[i] === ".") {
      const match = /^[A-Za-z_-][\w-]*/.exec(s.slice(i + 1));
      if (!match) throw new Error(`class in ${selector}`);
      parts.push({ kind: "class", name: match[0] });
      i += 1 + match[0].length;
    } else if (s[i] === "[") {
      const end = s.indexOf("]", i);
      if (end < 0) throw new Error(`attribute in ${selector}`);
      const body = s.slice(i + 1, end);
      const eq = body.indexOf("=");
      if (eq < 0) parts.push({ kind: "attr", name: body.trim(), value: null });
      else {
        const raw = body.slice(eq + 1).trim();
        const value = raw.startsWith('"') || raw.startsWith("'") ? raw.slice(1, -1) : raw;
        parts.push({ kind: "attr", name: body.slice(0, eq).trim(), value });
      }
      i = end + 1;
    } else throw new Error(`unparsed "${s.slice(i)}" in ${selector}`);
  }
  return parts;
}

function attrMatches(name: string, value: string | null, el: ElementState): boolean {
  if (name === "data-theme") return value === null ? el.theme !== null : el.theme === value;
  if (name === "data-theme-mode") return value === null ? el.mode !== null : el.mode === value;
  if (name === "data-theme-contrast") return value === null ? el.contrast !== null : el.contrast === value;
  return false;
}

const THEME_ATTRS = new Set(["data-theme", "data-theme-mode", "data-theme-contrast"]);

function selectorUnsupported(selector: string): boolean {
  let parts: Simple[];
  try { parts = parseCompound(selector); }
  catch { return true; }
  const walk = (list: Simple[]): boolean => {
    for (const part of list) {
      if (part.kind === "class" && part.name !== "dark-theme") return true;
      if (part.kind === "attr" && !THEME_ATTRS.has(part.name)) return true;
      if (part.kind === "is" || part.kind === "not") {
        for (const arg of part.args) if (selectorUnsupported(arg)) return true;
      }
    }
    return false;
  };
  return walk(parts);
}

function matches(selector: string, el: ElementState): boolean {
  // Reset, typography and component rules are in the base sheet too. They do not
  // set theme colour roles (unsupportedColorSelectors holds that). Skip them.
  let parts: Simple[];
  try {
    parts = parseCompound(selector);
  } catch (error) {
    if (error instanceof Error && /descendant combinator|unparsed|class in|attribute in|unclosed/.test(error.message)) return false;
    throw error;
  }
  for (const part of parts) {
    if (part.kind === "root") { if (!el.root) return false; }
    else if (part.kind === "class") { if (!(part.name === "dark-theme" && el.dark)) return false; }
    else if (part.kind === "attr") { if (!attrMatches(part.name, part.value, el)) return false; }
    else {
      const any = part.args.some(arg => matches(arg, el));
      if (part.kind === "is" ? !any : any) return false;
    }
  }
  return true;
}

/** Specificity is static: `:is()` and `:not()` take their most specific argument. */
export function selectorSpec(selector: string): Spec {
  let spec: Spec = [0, 0, 0];
  for (const part of parseCompound(selector)) {
    if (part.kind === "is" || part.kind === "not") {
      let best: Spec = [0, 0, 0];
      for (const arg of part.args) {
        const next = selectorSpec(arg);
        if (cmpSpec(best, next) < 0) best = next;
      }
      spec = addSpec(spec, best);
    } else spec = addSpec(spec, [0, 1, 0]);
  }
  return spec;
}

function mergeMedia(parent: Media, query: string): Media {
  const text = query.replace(/^@media\s+/i, "");
  let scheme = parent.scheme;
  if (/not\s*\(\s*prefers-color-scheme:\s*dark\s*\)/i.test(text)) scheme = "light";
  else if (/prefers-color-scheme:\s*dark/i.test(text)) scheme = "dark";
  else if (/prefers-color-scheme:\s*light/i.test(text)) scheme = "light";
  const contrastMore = parent.contrastMore || /prefers-contrast:\s*more/i.test(text);
  return { scheme, contrastMore };
}

function mediaMatches(media: Media, os: OsState): boolean {
  if (media.scheme && media.scheme !== os.scheme) return false;
  if (media.contrastMore && os.contrast !== "more") return false;
  return true;
}

function matchingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("unclosed block");
}

function parseCss(css: string, orderStart: number): { rules: Rule[]; next: number; layers: string[] | null } {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const prelude = text.match(/@layer\s+([^{;]+);/);
  const layers = prelude ? prelude[1]!.split(",").map(name => name.trim()).filter(Boolean) : null;
  const rules: Rule[] = [];
  let order = orderStart;
  const visit = (body: string, media: Media, layer: string | null, selector: string | null) => {
    let i = 0;
    const decls: [string, string][] = [];
    const flush = () => {
      if (!decls.length || !selector) return;
      rules.push({
        selectors: splitTop(selector, ",").map(item => item.trim()).filter(Boolean),
        media, layer, order, decls: decls.splice(0),
      });
      order++;
    };
    while (i < body.length) {
      while (i < body.length && /\s/.test(body[i]!)) i++;
      if (i >= body.length) break;
      const open = body.indexOf("{", i);
      const semi = body.indexOf(";", i);
      if (semi >= 0 && (open < 0 || semi < open)) {
        const statement = body.slice(i, semi).trim();
        i = semi + 1;
        if (!statement || statement.startsWith("@")) continue;
        const colon = statement.indexOf(":");
        if (colon < 0) continue;
        decls.push([statement.slice(0, colon).trim(), statement.slice(colon + 1).trim()]);
        continue;
      }
      if (open < 0) break;
      flush();
      const head = body.slice(i, open).trim();
      const close = matchingBrace(body, open);
      const inner = body.slice(open + 1, close);
      i = close + 1;
      if (head.startsWith("@media")) visit(inner, mergeMedia(media, head), layer, selector);
      else if (head.startsWith("@layer")) {
        const name = head.replace(/^@layer\s+/, "").trim();
        visit(inner, media, name.includes(",") || !name ? layer : name, selector);
      } else if (head.startsWith("@")) visit(inner, media, layer, selector);
      else visit(inner, media, layer, head);
    }
    flush();
  };
  visit(text, EMPTY_MEDIA, null, null);
  return { rules, next: order, layers };
}

export type Sheet = { css: string };

type Candidate = { spec: Spec; layer: string | null; order: number; value: string };

function layerRank(layer: string | null, order: Map<string, number>): number {
  if (layer === null) return Number.POSITIVE_INFINITY;
  return order.get(layer) ?? 0;
}

function better(next: Candidate, prev: Candidate, ranks: Map<string, number>): boolean {
  const nextRank = layerRank(next.layer, ranks);
  const prevRank = layerRank(prev.layer, ranks);
  // Both unlayered ranks are Infinity. Infinity - Infinity is NaN, so compare
  // the ranks directly: equal layers fall through to specificity, then order.
  if (nextRank !== prevRank) return nextRank > prevRank;
  const spec = cmpSpec(next.spec, prev.spec);
  if (spec !== 0) return spec > 0;
  return next.order > prev.order;
}

const parsedCache = new Map<string, { rules: Rule[]; next: number; layers: string[] | null }>();

function cachedParse(css: string): { rules: Rule[]; next: number; layers: string[] | null } {
  const hit = parsedCache.get(css);
  if (hit) return hit;
  const parsed = parseCss(css, 0);
  parsedCache.set(css, parsed);
  return parsed;
}

export function resolveColors(sheets: string[], el: ElementState, os: OsState, parent: Record<string, string> | null): Record<string, string> {
  let order = 0;
  const rules: Rule[] = [];
  const ranks = new Map<string, number>();
  for (const sheet of sheets) {
    const parsed = cachedParse(sheet);
    const base = order;
    for (const rule of parsed.rules) rules.push({ ...rule, order: rule.order + base });
    order = base + parsed.next;
    if (parsed.layers) {
      if (ranks.size === 0) parsed.layers.forEach((name, index) => ranks.set(name, index));
      else if (parsed.layers.some((name, index) => ranks.get(name) !== index)) {
        throw new Error(`cascade layer order disagrees: ${parsed.layers.join(",")}`);
      }
    }
  }
  const specified = new Map<string, Candidate>();
  for (const rule of rules) {
    if (!mediaMatches(rule.media, os)) continue;
    let spec: Spec | null = null;
    for (const selector of rule.selectors) {
      if (!matches(selector, el)) continue;
      const next = selectorSpec(selector);
      if (!spec || cmpSpec(spec, next) < 0) spec = next;
    }
    if (!spec) continue;
    for (const [prop, value] of rule.decls) {
      const candidate = { spec, layer: rule.layer, order: rule.order, value };
      const previous = specified.get(prop);
      if (!previous || better(candidate, previous, ranks)) specified.set(prop, candidate);
    }
  }
  const result: Record<string, string> = parent ? { ...parent } : {};
  for (const [prop, candidate] of specified) result[prop] = candidate.value;
  return result;
}

const HEX = /#([0-9a-f]{3}|[0-9a-f]{6})\b/i;

/** Selectors that set a theme colour and that this resolver cannot read. */
export function unsupportedColorSelectors(css: string): string[] {
  const found = new Set<string>();
  for (const rule of parseCss(css, 0).rules) {
    if (!rule.decls.some(([prop]) => prop.startsWith("--mtrl-sys-color-"))) continue;
    for (const selector of rule.selectors) {
      if (selectorUnsupported(selector)) found.add(selector);
    }
  }
  return [...found];
}

/** Colour rules, split into standard, explicit attribute, and prefers-contrast. */
export function contrastRuleCounts(css: string): { standard: number; explicit: number; preference: number } {
  const counts = { standard: 0, explicit: 0, preference: 0 };
  for (const rule of parseCss(css, 0).rules) {
    if (!rule.decls.some(([prop]) => prop.startsWith("--mtrl-sys-color-"))) continue;
    if (rule.media.contrastMore) counts.preference++;
    else if (rule.selectors.some(selector => selector.includes("data-theme-contrast"))) counts.explicit++;
    else counts.standard++;
  }
  return counts;
}

export function hexOf(value: string | undefined): string | null {
  const match = value?.match(HEX);
  if (!match) return null;
  const hex = match[1]!.toLowerCase();
  return hex.length === 3 ? `#${[...hex].map(char => char + char).join("")}` : `#${hex}`;
}
