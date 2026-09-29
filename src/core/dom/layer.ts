// src/core/dom/layer.ts

/**
 * How an element is promoted to the browser's top layer:
 * - `popover-auto`: `popover="auto"`, which the browser light-dismisses (a
 *   click outside, Escape, another auto popover opening)
 * - `popover-manual`: `popover="manual"`, closed only by its owner
 * - `modal`: a `<dialog>` shown with `showModal()`, which makes the rest of
 *   the page inert and closes on Escape
 */
export type TopLayerKind = "popover-auto" | "popover-manual" | "modal";

export interface TopLayerOptions {
  kind: TopLayerKind;
}

type Layered = HTMLElement & Partial<Pick<HTMLDialogElement, "showModal" | "close" | "open">>;

// Hides the owner asked for, so onTopLayerClose reports only the others.
const ownHides = new WeakSet<Element>();

/**
 * Whether the browser can show an element of this kind in the top layer:
 * `showPopover` for the popovers, `HTMLDialogElement.prototype.showModal` for
 * a modal.
 *
 * @param kind - The kind of top-layer element
 * @returns True where the browser supports it
 */
export const supportsTopLayer = (kind: TopLayerKind): boolean =>
  kind === "modal"
    ? typeof HTMLDialogElement === "function" &&
      typeof HTMLDialogElement.prototype.showModal === "function"
    : typeof HTMLElement === "function" &&
      typeof HTMLElement.prototype.showPopover === "function";

/** Whether an element is showing in the top layer. */
const isShown = (element: Layered): boolean =>
  element.open === true ||
  (typeof element.showPopover === "function" && element.matches(":popover-open"));

/**
 * Shows an element in the top layer, above everything else on the page
 * whatever its z-index and whatever clips or transforms its ancestors. The
 * element stays where it is in the DOM, so it keeps the styles of its tree,
 * a shadow root's included.
 *
 * The element must be connected, and for `modal` be a `<dialog>`. Showing an
 * element already shown does nothing.
 *
 * Where the browser has no support for the kind, nothing changes and false is
 * returned: the caller keeps its own positioning and stacking, which is what
 * it did before the top layer.
 *
 * @param element - The element to show
 * @param options - The kind of top-layer element
 * @returns True when the element is in the top layer
 */
export const showInTopLayer = (
  element: HTMLElement,
  { kind }: TopLayerOptions,
): boolean => {
  const layered = element as Layered;
  ownHides.delete(element);
  if (kind === "modal") {
    if (typeof layered.showModal !== "function") return false;
    if (!layered.open) layered.showModal();
    return true;
  }
  if (typeof element.showPopover !== "function") return false;
  element.setAttribute("popover", kind === "popover-auto" ? "auto" : "manual");
  if (!isShown(element)) element.showPopover();
  return true;
};

/**
 * Takes an element out of the top layer. Does nothing when it is not shown.
 * This close is not reported to onTopLayerClose.
 *
 * @param element - The element shown with showInTopLayer
 */
export const hideFromTopLayer = (element: HTMLElement): void => {
  const layered = element as Layered;
  if (!isShown(layered)) return;
  ownHides.add(element);
  if (layered.open === true && typeof layered.close === "function") layered.close();
  else element.hidePopover();
};

/**
 * Reports the closes the browser makes on its own: a light dismiss or Escape
 * for `popover="auto"` (a `toggle` event to `closed`), Escape or a form for a
 * modal dialog (its `close` event, which follows an uncanceled `cancel`).
 * Closes made with hideFromTopLayer are not reported, nor is a close the
 * element was shown again after.
 *
 * @param element - The element shown with showInTopLayer
 * @param callback - Called once for each close
 * @returns A function that stops the reports
 */
export const onTopLayerClose = (
  element: HTMLElement,
  callback: () => void,
): (() => void) => {
  const listener = (event: Event): void => {
    // A popover reports on `toggle`, a dialog on `close`: a dialog fires
    // `toggle` too, and counting both would report its close twice.
    if ((event.type === "toggle") !== element.hasAttribute("popover")) return;
    // The events are queued: by now the element may be shown again
    if ((event as ToggleEvent).newState === "open" || isShown(element)) return;
    if (ownHides.delete(element)) return;
    callback();
  };
  element.addEventListener("toggle", listener);
  element.addEventListener("close", listener);
  return () => {
    element.removeEventListener("toggle", listener);
    element.removeEventListener("close", listener);
  };
};
