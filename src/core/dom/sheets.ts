// src/core/dom/sheets.ts
/**
 * Stylesheets that arrive with a component's lazy chunk.
 *
 * A few sheets are only ever needed when an optional part of a component is
 * used: the menu behind a select, the progress ring behind a button. The lazy
 * chunk that creates that part brings its stylesheet with it, and the
 * component's own CSS entry does not. The entry registers a loader, keyed by
 * where the sheet applies: the document for a factory component in light DOM,
 * a shadow root for an element. The lazy path awaits the loader before it
 * creates the part, so the sheet is in place before anything is rendered with
 * it.
 *
 * This module names no DOM global at the top level: the CSS modules import it,
 * and those are imported on the server too.
 *
 * @module core/dom
 */

/** A loader applies one deferred sheet to the root that was waiting for it. */
export type SheetLoader = (root: Node | null | undefined) => void | Promise<void>;

// One map, keyed by the scope's first letter: `d` for the document (factory
// components), `s` for a shadow root (elements).
const loaders = new Map<string, SheetLoader>();

/** Registers the loader that takes a deferred sheet to one scope. */
export const setSheetLoader = (name: string, scope: "document" | "shadow", loader: SheetLoader): void => {
  loaders.set((scope === "shadow" ? "s" : "d") + name, loader);
};

/**
 * Whether a sheet can be loaded on demand in a scope. A component's CSS entry
 * registers the loader for each dependency it defers, so this is false until
 * that entry has run.
 */
export const canLoadSheet = (name: string, scope: "document" | "shadow" = "shadow"): boolean =>
  loaders.has((scope === "shadow" ? "s" : "d") + name);

/**
 * Loads the sheet `name` into the scope that holds `node`, and returns the
 * loader's promise once it is applied — `undefined` at once when no loader is
 * registered: the sheet is the caller's to import, as before.
 */
export const loadSheet = (name: string, node: Node | null | undefined): void | Promise<void> => {
  const root = node?.getRootNode();
  // Only a shadow root has a host; a document (or no node) takes the document
  // scope. A plain DocumentFragment is not a style target.
  // A registered loader starts with a dynamic import, so nothing throws
  // before it returns its promise.
  return loaders.get((root && "host" in root ? "s" : "d") + name)?.(root);
};
