// src/core/dom/roving.ts

/** Input types that take no text: arrow keys do nothing to them, so a composite may use them. */
const NON_TEXT_INPUTS = new Set(["button", "checkbox", "color", "file", "image", "radio", "range", "reset", "submit"]);

/**
 * Whether the arrow keys, Home and End belong to an element: a text input, a
 * textarea or editable content, where they move the caret.
 */
export const isTextEditable = (element: EventTarget | null | undefined): boolean => {
  const node = element as Partial<HTMLElement> | null | undefined;
  if (!node || typeof node.localName !== "string") return false;
  if (node.isContentEditable) return true;
  if (node.localName === "textarea") return true;
  return node.localName === "input" && !NON_TEXT_INPUTS.has(((node as HTMLInputElement).type || "text").toLowerCase());
};

/** Whether a focus target is disabled, natively or as `aria-disabled` (FLO-119). */
const isDisabled = (element: HTMLElement): boolean =>
  element.matches(":disabled") || element.getAttribute("aria-disabled") === "true";

export interface RovingOptions {
  /** The composite: it receives the key and focus listeners. */
  container: HTMLElement;
  /**
   * The focus targets in order. A target is an element that takes focus itself:
   * a control, or the host of a web component that delegates focus to one.
   */
  targets: () => HTMLElement[];
  /** Whether Up and Down move focus instead of Left and Right. */
  vertical?: () => boolean;
}

export interface Roving {
  /** Puts the one tab stop back on the current target, or the first enabled one. */
  sync(): void;
  /** Removes the listeners. */
  destroy(): void;
}

/**
 * A roving tab index over a composite's focus targets (the WAI-ARIA toolbar
 * pattern): one tab stop, kept on the target focused last; the arrow keys along
 * the layout, Left and Right following the reading direction; Home and End to
 * the ends. Disabled targets are skipped and the ends do not wrap. Inside a
 * text input the keys stay with the caret.
 */
export const createRoving = ({ container, targets, vertical = () => false }: RovingOptions): Roving => {
  let current: HTMLElement | null = null;

  const enabled = () => targets().filter((target) => !isDisabled(target));
  // The target an event came from: the target itself, or one holding it.
  const owner = (list: HTMLElement[], node: EventTarget | null) =>
    list.find((target) => target === node || (node instanceof Node && target.contains(node))) ?? null;

  const sync = () => {
    const list = enabled();
    if (!current || !list.includes(current)) current = list[0] ?? null;
    for (const target of targets()) target.tabIndex = target === current ? 0 : -1;
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (isTextEditable(event.composedPath()[0])) return;
    const list = enabled();
    const from = list.indexOf(owner(list, event.target) as HTMLElement);
    if (from === -1) return;
    // :dir() follows the directionality into a shadow root, which closest("[dir]") does not.
    const rtl = container.matches(":dir(rtl)");
    const isVertical = vertical();
    const back = isVertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
    const forward = isVertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
    let next: number;
    if (event.key === back) next = Math.max(0, from - 1);
    else if (event.key === forward) next = Math.min(list.length - 1, from + 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = list.length - 1;
    else return;
    event.preventDefault();
    current = list[next]!;
    sync();
    current.focus();
  };

  // Focus reached by a click or by script moves the tab stop too.
  const onFocusin = (event: FocusEvent) => {
    const target = owner(enabled(), event.target);
    if (target && target !== current) {
      current = target;
      sync();
    }
  };

  container.addEventListener("keydown", onKeydown);
  container.addEventListener("focusin", onFocusin);
  sync();

  return {
    sync,
    destroy() {
      container.removeEventListener("keydown", onKeydown);
      container.removeEventListener("focusin", onFocusin);
    },
  };
};
