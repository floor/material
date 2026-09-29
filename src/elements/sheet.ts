// src/elements/sheet.ts
/**
 * What `<m-bottom-sheet>` and `<m-side-sheet>` share: a headline slot in the
 * factory's title, which names the sheet while it has content, and `open`
 * reflecting the sheet's state.
 *
 * @module elements
 */

/** The part of a sheet factory the elements drive. */
export interface SheetComponent {
  element: HTMLElement;
  getClass: (name: string) => string;
  isOpen: () => boolean;
  open: () => unknown;
  close: () => unknown;
}

/** Class names, unprefixed, of the sheet's container, header and title. */
export interface SheetParts {
  container: string;
  header: string;
  title: string;
}

const hasContent = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "");

/**
 * Puts a `headline` slot, with the attribute's text as its fallback, in place
 * of the text the factory's title holds.
 */
export const headlineSlot = (component: SheetComponent, parts: SheetParts, fallback?: string): void => {
  const slot = document.createElement("slot");
  slot.name = "headline";
  if (fallback) slot.textContent = fallback;
  component.element.querySelector(`.${component.getClass(parts.title)}`)?.replaceChildren(slot);
};

/** Sets the headline's fallback text, shown while nothing is slotted. */
export const setHeadline = (component: SheetComponent, value: unknown): void => {
  const slot = component.element.querySelector<HTMLSlotElement>('slot[name="headline"]');
  if (slot) slot.textContent = value === null || value === undefined ? "" : String(value);
};

/**
 * The headline shows, and names the sheet, when it has slotted content or
 * fallback text; `aria-label` names a sheet in its place. A header left with
 * nothing to show goes too.
 */
export const syncSheet = (host: HTMLElement, component: SheetComponent, parts: SheetParts): void => {
  const find = (name: string): HTMLElement | null => component.element.querySelector(`.${component.getClass(name)}`);
  const container = find(parts.container);
  const header = find(parts.header);
  const title = find(parts.title);
  const slot = title?.querySelector("slot");
  const named = !!slot && (slot.assignedNodes().some(hasContent) || (slot.textContent ?? "") !== "");
  if (title) title.style.display = named ? "" : "none";
  if (header) header.style.display = Array.from(header.children).some((child) => (child as HTMLElement).style.display !== "none") ? "" : "none";
  if (!container) return;
  const label = host.getAttribute("aria-label");
  if (label !== null) {
    container.setAttribute("aria-label", label);
    container.removeAttribute("aria-labelledby");
  } else {
    container.removeAttribute("aria-label");
    if (named && title) container.setAttribute("aria-labelledby", title.id);
    else container.removeAttribute("aria-labelledby");
  }
};

/** Opens or closes the sheet, when that changes anything. */
export const setSheetOpen = (component: SheetComponent, open: boolean): void => {
  if (open === component.isOpen()) return;
  if (open) component.open();
  else component.close();
};

/**
 * Keeps the headline in step with its slot and `open` with the sheet, and
 * opens a sheet whose markup says `open`: once it is in the shadow root, as
 * moving a modal `<dialog>` would take it out of the top layer. `listen`
 * subscribes to the sheet's open and close and returns the unsubscribe;
 * `open` opens the sheet, when that takes more than `open()`.
 */
export const sheetSetup = (
  host: HTMLElement,
  component: SheetComponent,
  parts: SheetParts,
  listen: (handler: () => void) => () => void,
  open: () => void = () => void component.open()
): (() => void) => {
  const sync = (): void => syncSheet(host, component, parts);
  const slot = component.element.querySelector('slot[name="headline"]');
  slot?.addEventListener("slotchange", sync);
  sync();
  const unlisten = listen(() => void host.toggleAttribute("open", component.isOpen()));
  if (host.hasAttribute("open")) open();
  return () => {
    slot?.removeEventListener("slotchange", sync);
    unlisten();
  };
};
