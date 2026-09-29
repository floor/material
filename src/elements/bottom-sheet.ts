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
 * @module elements
 */

import createBottomSheet from "../components/bottom-sheet";
import type { BottomSheetComponent, BottomSheetConfig } from "../components/bottom-sheet/types";
import { defineElement, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";
import { headlineSlot, setHeadline, setSheetOpen, sheetSetup, syncSheet, type SheetParts } from "./sheet";

const PARTS: SheetParts = {
  container: "bottom-sheet__container",
  header: "bottom-sheet__header",
  title: "bottom-sheet__title",
};

/** The sheet with the `show()` the element names after `<dialog>`'s. */
export interface BottomSheetElementComponent extends BottomSheetComponent {
  show: () => BottomSheetComponent;
}

interface BottomSheetElementConfig extends BottomSheetConfig {
  headline?: string;
  modal?: boolean;
  noDragHandle?: boolean;
}

const create = (config: BottomSheetElementConfig): BottomSheetElementComponent => {
  const { headline, modal, noDragHandle, ...rest } = config;
  const content = document.createElement("slot");
  const sheet = createBottomSheet({
    ...rest,
    // A placeholder the headline slot replaces, so the headline names the sheet
    title: " ",
    content,
    dragHandle: !noDragHandle,
    variant: modal ? "modal" : "standard",
    layer: modal ? "top" : undefined,
  });
  headlineSlot(sheet, PARTS, headline);
  return Object.assign(sheet, { show: () => sheet.open() });
};

const bottomSheetSpec = {
  name: "bottom-sheet",
  create: (config) => create(config as BottomSheetElementConfig),
  styles: ["bottom-sheet"],
  hostStyles: ":host{display:contents}",
  attributes: {
    open: { type: "boolean", update: (c, v) => setSheetOpen(c, !!v) },
    modal: { type: "boolean", config: "modal" },
    headline: {
      type: "string",
      config: "headline",
      update: (c, v, host) => {
        setHeadline(c, v);
        syncSheet(host, c, PARTS);
      },
    },
    "no-drag-handle": { type: "boolean", config: "noDragHandle" },
    "aria-label": { type: "string", update: (c, _v, host) => syncSheet(host, c, PARTS) },
  },
  methods: ["show", "close", "expand", "collapse"] as const,
  events: {
    open: { detail: () => null },
    close: { detail: () => null },
  },
  setup: (host, component) =>
    sheetSetup(host, component, PARTS, (handler) => {
      component.on("open", handler);
      component.on("close", handler);
      return () => {
        component.off("open", handler);
        component.off("close", handler);
      };
    }),
} satisfies ElementSpec<BottomSheetElementComponent>;

export const bottomSheetElement = defineElement<BottomSheetElementComponent>(bottomSheetSpec);
export type BottomSheetSpec = typeof bottomSheetSpec;
/** `<m-bottom-sheet>` as a ref or a query returns it. */
export type BottomSheetElement = ElementInstance<BottomSheetSpec, BottomSheetElementComponent>;

/** Registers `<m-bottom-sheet>` (or `<prefix-bottom-sheet>`). */
export const defineBottomSheet = (options?: DefineOptions): string => bottomSheetElement.define(options);
