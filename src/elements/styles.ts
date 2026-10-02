// src/elements/styles.ts
/**
 * Stylesheets for the shadow roots of the elements.
 *
 * Each element adopts the CSS of its component and the component's style
 * dependencies, the same entries the selective stylesheets are built from
 * (`scripts/style-manifest.ts`). One sheet per entry per page, shared by every
 * instance.
 *
 * @module elements
 */

/** The tag prefix: `<m-switch>`. The pre-upgrade CSS is built for it. */
export const DEFAULT_PREFIX = "m";

const sources = new Map<string, string>();
const fallbackStyles = new WeakSet<Node>();

/** Internal registry access; preserves application registrations and overrides. */
export const styleText = (name: string): string | undefined => sources.get(name);

/** Identifies only fallback nodes inserted by applyStyles, never authored styles. */
export const isFallbackStyle = (node: Node): boolean => fallbackStyles.has(node);

const sheets = new Map<string, CSSStyleSheet>();

/**
 * Registers the CSS text of style entries, keyed as in `componentStyles`.
 * Must run before the elements that use them are created.
 *
 * @experimental The element authoring API (`defineElement`, `ElementSpec`,
 * `registerStyles`, `hasStyles`, `SHADOW_BASE_STYLES`) is outside semantic
 * versioning in 3.x: it may change in a minor release. The elements the
 * library defines, and their attributes, properties and events, are not.
 */
export const registerStyles = (css: Record<string, string>): void => {
  for (const [name, text] of Object.entries(css)) {
    sources.set(name, text);
    sheets.delete(name);
  }
};

/**
 * Whether CSS is registered under a name.
 *
 * @experimental The element authoring API (`defineElement`, `ElementSpec`,
 * `registerStyles`, `hasStyles`, `SHADOW_BASE_STYLES`) is outside semantic
 * versioning in 3.x: it may change in a minor release. The elements the
 * library defines, and their attributes, properties and events, are not.
 */
export const hasStyles = (name: string): boolean => sources.has(name);

const canAdopt = (): boolean =>
  typeof CSSStyleSheet === "function" &&
  "replaceSync" in CSSStyleSheet.prototype &&
  typeof ShadowRoot === "function" &&
  "adoptedStyleSheets" in ShadowRoot.prototype;

const sheetFor = (name: string, text: string): CSSStyleSheet => {
  let sheet = sheets.get(name);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(text);
    sheets.set(name, sheet);
  }
  return sheet;
};

// ---------------------------------------------------------------------------
// Pre-upgrade styles (ssr.md, Phase A): `:not(:defined)` rules that give an
// element its box before its script upgrades it. They ship as stylesheets
// (`material/elements/preupgrade.css` and `material/elements/preupgrade/<name>.css`),
// not from the element CSS modules. Built for the default prefix;
// `preupgradeStyles(prefix)` retags them.

const PREUPGRADE_LAYER = "mtrl.preupgrade";

/**
 * On a host the server rendered with a declarative shadow root.
 * No `data-mtrl-*` name is used anywhere else: component `data-*` names
 * (`data-id`, `data-density`, `data-theme`) are that component's own state,
 * and a page's `data-ssr` must not be this contract. Inert after upgrade,
 * because the rollback rule is `:not(:defined)`.
 */
export const RENDERED_HOST_ATTRIBUTE = "data-mtrl-ssr";

/**
 * Last rule of every pre-upgrade sheet, inside `mtrl.preupgrade`.
 * `:not(#\0)` is an id selector (specificity 1,0,0) that matches every element,
 * so each selector outranks every pre-upgrade selector of the same subject
 * (the host, its `::before` and `::after`, and a direct child), none of which
 * has an id. The child subject is `:defined` (specificity 1,3,0). Every
 * built-in element is defined, so a slotted `div` or `span` is rolled back.
 * An undefined custom element is not: a carousel, a FAB menu, or a menu that
 * opted out keeps its own pre-upgrade rule. A rendered mtrl child carries
 * this attribute and is covered by the host selector. The deepest pre-upgrade
 * subject is a direct child, including a following sibling of one (`> * + *`);
 * none styles a grandchild or a child's pseudo-element. `all` does not reset
 * custom properties; the element rules set none. Not tag-specific, so
 * retagging for another prefix leaves it as it is.
 */
export const preupgradeRollback = (): string => {
  const selector = `[${RENDERED_HOST_ATTRIBUTE}]:not(:defined):not(#\\0)`;
  return `${selector},${selector}::before,${selector}::after,${selector} > :defined{all:revert-layer}`;
};

/**
 * Pre-upgrade CSS, built for the default prefix, for another one: every tag
 * selector `m-*` becomes `<prefix>-*`. The rules name tags only in selectors
 * (`m-tabs:not(:defined)>*`), and no value starts a word with `m-`.
 */
export const retagPreupgrade = (css: string, prefix: string): string =>
  prefix === DEFAULT_PREFIX ? css : css.replace(/(^|[\s,>+~({}])m-(?=[a-z])/g, `$1${prefix}-`);

/** The rules as one layered stylesheet, for each prefix. The rollback is once, after them. */
export const preupgradeSheet = (css: string, prefixes: Iterable<string> = [DEFAULT_PREFIX]): string =>
  `@layer ${PREUPGRADE_LAYER}{${Array.from(prefixes, (prefix) => retagPreupgrade(css, prefix)).join("")}${preupgradeRollback()}}`;

/**
 * Applies the registered entries to a shadow root, in the given order.
 * Falls back to `<style>` elements where constructable stylesheets are missing.
 */
export const applyStyles = (root: ShadowRoot, names: readonly string[]): void => {
  const known = names.filter((name) => sources.has(name));
  if (canAdopt()) {
    root.adoptedStyleSheets = known.map((name) => sheetFor(name, sources.get(name) as string));
    return;
  }
  for (const name of known) {
    const style = document.createElement("style");
    style.textContent = sources.get(name) as string;
    fallbackStyles.add(style);
    root.append(style);
  }
};
