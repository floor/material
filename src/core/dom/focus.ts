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

/** Whether an element is a tab stop: focusable in sequence, enabled, rendered. */
const isTabStop = (element: Element): element is HTMLElement =>
  (element as Partial<HTMLElement>).tabIndex !== undefined &&
  (element as HTMLElement).tabIndex >= 0 &&
  !element.matches(":disabled, [inert] *, [inert]") &&
  element.getClientRects().length > 0;

/**
 * The tab stops in a container, in the order Tab reaches them: through slots
 * to what is assigned to them and into shadow roots, which is where the
 * content of a web component sits. Slots are told by shape, as the roots are
 * above.
 */
export const tabStops = (container: Element): HTMLElement[] => {
  const found: HTMLElement[] = [];
  const visit = (element: Element): void => {
    const slot = element as Partial<HTMLSlotElement>;
    if (element.localName === "slot" && typeof slot.assignedElements === "function") {
      const assigned = slot.assignedElements({ flatten: true });
      (assigned.length ? assigned : Array.from(element.children)).forEach(visit);
      return;
    }
    if (isTabStop(element)) found.push(element);
    Array.from((element.shadowRoot ?? element).children).forEach(visit);
  };
  Array.from(container.children).forEach(visit);
  return found;
};

/**
 * Keeps Tab inside a modal: from its last tab stop to its first, and Shift+Tab
 * from the first (or the modal itself) to the last. Between them the browser
 * moves focus as it always does. For a keydown listener on the modal.
 *
 * @param container - The modal, which the keydown reached
 * @param event - The keydown
 */
export const wrapTab = (container: HTMLElement, event: KeyboardEvent): void => {
  if (event.key !== "Tab" || event.defaultPrevented) return;
  const stops = tabStops(container);
  const active = deepActiveElement();
  const target = !stops.length
    ? container
    : event.shiftKey && (active === stops[0] || !stops.includes(active as HTMLElement))
      ? stops[stops.length - 1]
      : !event.shiftKey && active === stops[stops.length - 1]
        ? stops[0]
        : null;
  if (!target) return;
  event.preventDefault();
  target.focus();
};
