// src/core/dom/focus.ts

/**
 * The focused element as seen from a node's own root: the shadow root it
 * lives in, or the document.
 *
 * `document.activeElement` stops at the shadow host when focus is inside a
 * shadow root, so a component rendered in one never finds its focused item
 * there. A detached node has neither root, and gets the document's.
 *
 * @param node - A node of the component, usually its element
 * @returns The active element of that node's root, or null
 */
export const activeElementOf = (node: Node): Element | null => {
  // Checked by shape: the Document and ShadowRoot of another realm (a frame,
  // a test DOM) fail instanceof.
  const root = node.getRootNode() as Node & Partial<DocumentOrShadowRoot>;
  return root.activeElement !== undefined ? root.activeElement : document.activeElement;
};

/**
 * The element that really has focus, looked for through open shadow roots:
 * where focus goes back to after an overlay closes, when the overlay may sit
 * in another root than whatever opened it.
 *
 * @returns The innermost focused element, or null
 */
export const deepActiveElement = (): Element | null => {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
};
