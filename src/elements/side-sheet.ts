// src/elements/side-sheet.ts
/**
 * `<m-side-sheet>`: the side sheet as a custom element. Its regions are
 * slots: `headline` (the `headline` attribute is its fallback text), which
 * names the sheet, and the default slot, the content. The header's close
 * button is the factory's; `no-close-button` drops it. `position` is `start`
 * or `end` (the default), logical as on the factory.
 *
 * Standard by default, docked beside the page. `modal` makes it the modal
 * sheet in the factory's top layer (`layer: "top"`): a native `<dialog>` in
 * the element's shadow root, shown with `showModal()`, above every z-index,
 * the page outside inert, the scrim its `::backdrop`; Escape and a click on
 * the backdrop close it.
 *
 * `open` shows it and reflects its state, as on `<dialog open>`. `show()` and
 * `close()` are its methods, and `open` and `close` are dispatched as it
 * opens and closes (not when the attribute is what changed).
 *
 * @module elements
 */

import createSideSheet from "../components/side-sheet";
import type { SideSheetComponent, SideSheetConfig } from "../components/side-sheet/types";
import { defineElement, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";
import { headlineSlot, setHeadline, setSheetOpen, sheetSetup, syncSheet, type SheetParts } from "./sheet";

const PARTS: SheetParts = {
  container: "side-sheet__container",
  header: "side-sheet__header",
  title: "side-sheet__title",
};

/** The sheet with the `show()` the element names after `<dialog>`'s. */
export interface SideSheetElementComponent extends SideSheetComponent {
  show: () => SideSheetComponent;
}

interface SideSheetElementConfig extends SideSheetConfig {
  headline?: string;
  modal?: boolean;
  noCloseButton?: boolean;
}

const create = (config: SideSheetElementConfig): SideSheetElementComponent => {
  const { headline, modal, noCloseButton, ...rest } = config;
  const content = document.createElement("slot");
  const sheet = createSideSheet({
    ...rest,
    // A placeholder the headline slot replaces, so the headline names the sheet
    title: " ",
    content,
    closeButton: !noCloseButton,
    variant: modal ? "modal" : "standard",
    layer: modal ? "top" : undefined,
  });
  headlineSlot(sheet, PARTS, headline);
  return Object.assign(sheet, { show: () => sheet.open() });
};

const sideSheetSpec = {
  name: "side-sheet",
  create: (config) => create(config as SideSheetElementConfig),
  styles: ["side-sheet"],
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
    position: { type: "string", config: "position" },
    "no-close-button": { type: "boolean", config: "noCloseButton" },
    "aria-label": { type: "string", update: (c, _v, host) => syncSheet(host, c, PARTS) },
  },
  methods: ["show", "close"] as const,
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
} satisfies ElementSpec<SideSheetElementComponent>;

export const sideSheetElement = defineElement<SideSheetElementComponent>(sideSheetSpec);
export type SideSheetSpec = typeof sideSheetSpec;
/** `<m-side-sheet>` as a ref or a query returns it. */
export type SideSheetElement = ElementInstance<SideSheetSpec, SideSheetElementComponent>;

/** Registers `<m-side-sheet>` (or `<prefix-side-sheet>`). */
export const defineSideSheet = (options?: DefineOptions): string => sideSheetElement.define(options);
