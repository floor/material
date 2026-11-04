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

type Layered = Omit<HTMLElement, "showPopover"> &
  Partial<Pick<HTMLDialogElement & HTMLElement, "showModal" | "close" | "open" | "showPopover">>;

// Hides the owner asked for (Element -> 1), event dispatch numbers
// (Event -> number), and active marker counts per window (Window -> number).
const seen = new WeakMap<object, number>();

/**
 * Whether the browser can show an element of this kind in the top layer:
 * `showPopover` for the popovers, `HTMLDialogElement.prototype.showModal` for
 * a modal.
 *
 * @param kind - The kind of top-layer element
 * @returns True where the browser supports it
 */
export const supportsTopLayer = (kind: TopLayerKind): boolean =>
  typeof (kind === "modal"
    ? typeof HTMLDialogElement === "function" && HTMLDialogElement.prototype.showModal
    : typeof HTMLElement === "function" && HTMLElement.prototype.showPopover) === "function";

/** Whether an element is showing in the top layer. */
const isShown = (element: Layered): boolean =>
  !!(element.open || (element.showPopover && element.matches(":popover-open")));

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
  element: Layered,
  { kind }: TopLayerOptions,
): boolean => {
  seen.delete(element);
  if (kind === "modal") {
    if (!element.showModal) return false;
    if (!element.open) element.showModal();
    return true;
  }
  if (!element.showPopover) return false;
  element.setAttribute("popover", kind.slice(8));
  if (!isShown(element)) element.showPopover();
  return true;
};

/**
 * Takes an element out of the top layer. Does nothing when it is not shown.
 * This close is not reported to onTopLayerClose.
 *
 * @param element - The element shown with showInTopLayer
 */
export const hideFromTopLayer = (element: Layered): void => {
  if (!isShown(element)) return;
  seen.set(element, 1);
  if (element.open) element.close?.();
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
    if (
      (event.type === "toggle") === element.hasAttribute("popover") &&
      (event as ToggleEvent).newState !== "open" &&
      !isShown(element) &&
      !seen.delete(element)
    )
      callback();
  };
  element.addEventListener("toggle", listener);
  element.addEventListener("close", listener);
  return () => {
    element.removeEventListener("toggle", listener);
    element.removeEventListener("close", listener);
  };
};

/**
 * A modal outside the top layer: makes everything but `keep` inert,
 * as showModal() does for a top-layer dialog. The siblings of `keep` and of
 * each of its ancestors, up to the body, crossing shadow roots, get `inert`;
 * elements already inert are left alone. Returns the undo, which removes
 * `inert` from exactly the elements it set it on.
 */
export const inertOutside = (keep: Element): (() => void) => {
  const made: Element[] = [];
  for (
    let node: Element | null = keep, parent: ParentNode | null | undefined;
    (parent = node?.parentNode);
  ) {
    for (const sibling of parent.children) {
      if (
        sibling !== node &&
        !sibling.hasAttribute("inert") &&
        !/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(sibling.tagName)
      ) {
        sibling.setAttribute("inert", "");
        made.push(sibling);
      }
    }
    node =
      parent === document.body
        ? null
        : (parent as ShadowRoot).host || (parent.parentElement && (parent as Element));
  }
  return () => {
    made.splice(0).forEach((el) => el.removeAttribute("inert"));
  };
};

/** What eventsFrom returns: see there. */
export interface EventsFrom {
  /** Whether the event's dispatch began after the call */
  after: (event: Event) => boolean;
  /** Releases the marker. Harmless when called again. */
  stop: () => void;
}

// The order in which key presses and clicks began their dispatch, kept while
// an overlay is open: one capture listener on the window numbers each event
// before it reaches anything else.
let clock = 0;
const mark = (event: Event): void => {
  seen.set(event, ++clock);
};

const toggleMark = (view: Window, d: number): void => {
  const u = (seen.get(view) ?? 0) + d;
  seen.set(view, u);
  if (u === (d + 1) / 2)
    for (const t of ["keydown", "click"])
      if (d > 0) view.addEventListener(t, mark, true);
      else view.removeEventListener(t, mark, true);
};

/**
 * Tells the events that came after this call from the one that was already
 * on its way: "the event that opened an overlay never dismisses it".
 *
 * @param element - An element of the overlay, which says which window it is in
 * @returns `after(event)`, and `stop()` for when the overlay closes
 */
export const eventsFrom = (element: HTMLElement): EventsFrom => {
  const view = element.ownerDocument.defaultView!;
  let since = clock;
  toggleMark(view, 1);
  return {
    after: (event) => (seen.get(event) ?? 0) > since,
    stop: () => {
      if (since >= 0) {
        since = -1;
        toggleMark(view, -1);
      }
    },
  };
};

/** A modal's place in the Escape stack: see onModalEscape. */
export interface ModalEscape {
  /**
   * True for the rest of the task the modal opened in, for the one event the
   * marker cannot number: the `cancel` the browser sends the topmost modal
   * `<dialog>` for the key press that opened it, when the page stopped that
   * key press before it reached the window.
   */
  opening: boolean;
  /** Takes the modal off the stack. Harmless when called again. */
  stop: () => void;
}

interface EscapeEntry extends ModalEscape {
  e: HTMLElement;
  v: Window & typeof globalThis;
  s: number;
  d: () => unknown;
}

// The open modals, in the order they opened: the last one is on top.
const escapes: EscapeEntry[] = [];

const onEscapeKey = (event: KeyboardEvent): void => {
  if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
  let at = escapes.length;
  while (
    at-- &&
    (escapes[at].v !== event.currentTarget ||
      (!escapes[at].e.isConnected && (escapes[at].stop(), true)))
  );
  const top = escapes[at];
  const open = (event.composedPath() as Partial<Element>[]).find(
    (n) => n.localName === "dialog" && n.hasAttribute?.("open"),
  );
  if (!top || (open && open !== top.e)) return;
  event.preventDefault();
  if ((seen.get(event) ?? 0) > top.s) {
    top.opening = false;
    top.d();
  }
};

/**
 * Escape for a modal, handled as a key press. One bubble listener on the
 * window serves every open modal: after the listeners on the document, so
 * whatever is open inside the modal keeps a key it has used, and wherever
 * focus is, the body included. Only the topmost modal is told, and never for
 * the key press that opened it (see eventsFrom).
 *
 * @param element - The modal's element, which says which window it is in
 * @param escape - Called for an Escape that is the modal's: it closes, or refuses
 * @param d - Optional key handler when Escape dispatches a cancelable `cancel` event
 * @returns The modal's entry: `opening`, and `stop()` for when it closes
 */
export const onModalEscape = (
  element: HTMLElement,
  escape: () => void,
  d?: (() => unknown) | false,
): ModalEscape => {
  const v = element.ownerDocument.defaultView!;
  const onCancel = (event: Event): void => {
    event.preventDefault();
    if (!entry.opening) escape();
  };
  const entry: EscapeEntry = {
    e: element,
    v,
    s: clock,
    d: d || escape,
    opening: true,
    stop: () => {
      const at = escapes.indexOf(entry);
      if (at < 0) return;
      escapes.splice(at, 1);
      toggleMark(v, -1);
      element.removeEventListener("cancel", onCancel);
      if (!escapes.some((other) => other.v === v))
        v.removeEventListener("keydown", onEscapeKey);
    },
  };
  toggleMark(v, 1);
  escapes.push(entry);
  element.addEventListener("cancel", onCancel);
  v.addEventListener("keydown", onEscapeKey);
  setTimeout(() => {
    entry.opening = false;
  }, 0);
  return entry;
};
