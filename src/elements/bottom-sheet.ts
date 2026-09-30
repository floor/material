// src/elements/bottom-sheet.ts
/**
 * `<m-bottom-sheet>`: the bottom sheet as a custom element. Its regions are
 * slots: `headline` (the `headline` attribute is its fallback text), which
 * names the sheet, and the default slot, the content. The drag handle is the
 * factory's; `no-drag-handle` drops it, and dragging with it.
 *
 * Standard by default, in the page beside what it covers. `modal` makes it
 * the modal sheet in the factory's top layer (`layer: "top"`): a native
 * `<dialog>` in the element's shadow root, shown with `showModal()`, above
 * every z-index, the page outside inert, the scrim its `::backdrop`; Escape
 * and a click on the backdrop close it.
 *
 * `open` shows it and reflects its state, as on `<dialog open>`. `show()`,
 * `close()`, `expand()` and `collapse()` are its methods, and `open` and
 * `close` are dispatched as it opens and closes (not when the attribute is
 * what changed).
 *
 * An open sheet is partially expanded, `peek-height` pixels tall (by
 * default its content up to half the screen), or with `expanded` at its full
 * height. `max-width` is the widest it grows, in pixels (640 by default),
 * past which it centres itself; a change recreates it. `expanded` reflects that state as `open` does: set while the sheet
 * is closed, it opens expanded. `expand` and `collapse` are dispatched as the
 * user or a method moves it to its full height and away from it, closing
 * included, so an app keeping `expanded` in its state follows them.
 * `no-close-on-scrim-click` and `no-close-on-escape` keep a modal sheet open
 * on a click on the scrim and on Escape.
 *
 * Parts: `bottom-sheet`, `container`, `handle`, `header`, `title`, `content`.
 *
 * @module elements
 */

import createBottomSheet from "../components/bottom-sheet";
import type {
  BottomSheetComponent, BottomSheetConfig, BottomSheetEventHandlers, BottomSheetStateEvent,
} from "../components/bottom-sheet/types";
import { defineElement, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";
import { headlineSlot, setHeadline, setSheetOpen, sheetSetup, syncSheet, type SheetParts } from "./sheet";

const PARTS: SheetParts = {
  container: "bottom-sheet__container",
  header: "bottom-sheet__header",
  title: "bottom-sheet__title",
};

/** The sheet's events, and `expand` and `collapse`, which the element tells apart from its state changes. */
export interface BottomSheetElementEvents extends BottomSheetEventHandlers {
  expand?: () => void;
  collapse?: () => void;
}

/** The sheet with the `show()` the element names after `<dialog>`'s, and its `expand` and `collapse` events. */
export interface BottomSheetElementComponent extends Omit<BottomSheetComponent, "on" | "off"> {
  show: () => BottomSheetComponent;
  on: <T extends keyof BottomSheetElementEvents>(event: T, handler: NonNullable<BottomSheetElementEvents[T]>) => unknown;
  off: <T extends keyof BottomSheetElementEvents>(event: T, handler: NonNullable<BottomSheetElementEvents[T]>) => unknown;
}

interface BottomSheetElementConfig extends BottomSheetConfig {
  host: HTMLElement;
  headline?: string;
  modal?: boolean;
  noDragHandle?: boolean;
  noCloseOnScrimClick?: boolean;
  noCloseOnEscape?: boolean;
}

const create = (config: BottomSheetElementConfig): BottomSheetElementComponent => {
  const { host, headline, modal, noDragHandle, noCloseOnScrimClick, noCloseOnEscape, ...rest } = config;
  const content = document.createElement("slot");
  const sheet = createBottomSheet({
    ...rest,
    // A placeholder the headline slot replaces, so the headline names the sheet
    title: " ",
    content,
    dragHandle: !noDragHandle,
    closeOnScrimClick: !noCloseOnScrimClick,
    closeOnEscape: !noCloseOnEscape,
    variant: modal ? "modal" : "standard",
    layer: modal ? "top" : undefined,
  });
  headlineSlot(sheet, PARTS, headline);

  // The factory reports every move as `stateChange`: reaching the full height
  // is `expand`, leaving it `collapse`. `expanded` is reflected first, so a
  // listener reads it.
  const handlers = { expand: new Set<() => void>(), collapse: new Set<() => void>() };
  sheet.on("stateChange", ({ state, previous }: BottomSheetStateEvent) => {
    const event = state === "expanded" ? "expand" : previous === "expanded" ? "collapse" : null;
    if (!event) return;
    host.toggleAttribute("expanded", state === "expanded");
    handlers[event].forEach((handler) => handler());
  });
  const own = (event: string): event is keyof typeof handlers => event === "expand" || event === "collapse";
  const { on, off } = sheet;
  return Object.assign(sheet, {
    show: () => sheet.open(),
    on: (event: keyof BottomSheetElementEvents, handler: () => void) =>
      own(event) ? handlers[event].add(handler) : on.call(sheet, event, handler),
    off: (event: keyof BottomSheetElementEvents, handler: () => void) =>
      own(event) ? handlers[event].delete(handler) : off.call(sheet, event, handler),
  }) as BottomSheetElementComponent;
};

/** Opens the sheet, at its full height when `expanded` says so. */
const setOpen = (component: BottomSheetElementComponent, open: boolean, host: HTMLElement): void => {
  if (open && !component.isOpen() && host.hasAttribute("expanded")) component.expand();
  else setSheetOpen(component, open);
};

/** Moves an open sheet to its full height or back; a closed one waits for `open`. */
const setExpanded = (component: BottomSheetElementComponent, expanded: boolean): void => {
  if (!component.isOpen() || expanded === (component.getState() === "expanded")) return;
  if (expanded) component.expand();
  else component.collapse();
};

const bottomSheetSpec = {
  name: "bottom-sheet",
  create: (config) => create(config as unknown as BottomSheetElementConfig),
  styles: ["bottom-sheet"],
  hostStyles: ":host{display:contents}",
  attributes: {
    open: { type: "boolean", update: (c, v, host) => setOpen(c, !!v, host) },
    expanded: { type: "boolean", update: (c, v) => setExpanded(c, !!v) },
    modal: { type: "boolean", config: "modal" },
    headline: {
      type: "string",
      config: "headline",
      update: (c, v, host) => {
        setHeadline(c, v);
        syncSheet(host, c, PARTS);
      },
    },
    "peek-height": { type: "number", config: "peekHeight" },
    "max-width": { type: "number", config: "maxWidth" },
    "no-drag-handle": { type: "boolean", config: "noDragHandle" },
    "no-close-on-scrim-click": { type: "boolean", config: "noCloseOnScrimClick" },
    "no-close-on-escape": { type: "boolean", config: "noCloseOnEscape" },
    "aria-label": { type: "string", update: (c, _v, host) => syncSheet(host, c, PARTS) },
  },
  methods: ["show", "close", "expand", "collapse"] as const,
  events: {
    open: { detail: () => null, state: true },
    close: { detail: () => null, state: true },
    expand: { detail: () => null, state: true },
    collapse: { detail: () => null, state: true },
  },
  // `config` below supplies the host
  config: (host) => ({ host }),
  setup: (host, component) =>
    sheetSetup(host, component, PARTS, (handler) => {
      component.on("open", handler);
      component.on("close", handler);
      return () => {
        component.off("open", handler);
        component.off("close", handler);
      };
    }, () => setOpen(component, true, host)),
} satisfies ElementSpec<BottomSheetElementComponent>;

export const bottomSheetElement = defineElement<BottomSheetElementComponent>(bottomSheetSpec);
export type BottomSheetSpec = typeof bottomSheetSpec;
/** `<m-bottom-sheet>` as a ref or a query returns it. */
export type BottomSheetElement = ElementInstance<BottomSheetSpec, BottomSheetElementComponent>;

/** Registers `<m-bottom-sheet>` (or `<prefix-bottom-sheet>`). */
export const defineBottomSheet = (options?: DefineOptions): string => bottomSheetElement.define(options);

declare global {
  /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
  interface HTMLElementTagNameMap {
    "m-bottom-sheet": BottomSheetElement;
  }
}
