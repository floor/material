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

const sources = new Map<string, string>();
const sheets = new Map<string, CSSStyleSheet>();

/**
 * Registers the CSS text of style entries, keyed as in `componentStyles`.
 * Must run before the elements that use them are created.
 */
export const registerStyles = (css: Record<string, string>): void => {
  for (const [name, text] of Object.entries(css)) {
    sources.set(name, text);
    sheets.delete(name);
  }
};

/** Whether CSS is registered under a name. */
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
    root.append(style);
  }
};
