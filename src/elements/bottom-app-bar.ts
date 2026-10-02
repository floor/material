// src/elements/bottom-app-bar.ts
/**
 * `<m-bottom-app-bar>`: the bottom app bar as a container with slots.
 *
 * Children are the actions (icon buttons); `slot="fab"` takes the FAB, placed
 * at the end or, with `fab-position="center"`, in the middle. `auto-hide`
 * hides the bar while the window scrolls down and shows it again on the way
 * up; `show()` and `hide()` do the same from script.
 *
 * Parts: `bottom-app-bar`, `actions`, `fab-container`.
 *
 * @module elements
 */

import createBottomAppBar from "../components/bottom-app-bar";
import type { BottomAppBarComponent, BottomAppBarConfig } from "../components/bottom-app-bar/types";
import { defineElement, type Config, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";

const fabClass = (component: BottomAppBarComponent): string => `${component.getClass("bottom-app-bar")}--with-fab`;

/**
 * Slots in the containers the factory appends actions and the FAB to. The
 * factory's addFab() marks the bar as having a FAB for good: the element
 * places the FAB slot itself and follows what is assigned to it (`setup`).
 */
const create = (config: BottomAppBarConfig): BottomAppBarComponent => {
  const bar = createBottomAppBar(config);
  bar.addAction(document.createElement("slot"));
  const fab = document.createElement("slot");
  fab.name = "fab";
  bar.element.querySelector(`.${bar.getClass("bottom-app-bar")}__fab-container`)?.append(fab);
  return bar;
};

const readBar = (host: HTMLElement): Config =>
  ({
    hasFab: Array.from(host.children).some((child) => child.getAttribute("slot") === "fab"),
  }) satisfies Partial<BottomAppBarConfig>;

const bottomAppBarSpec = {
  name: "bottom-app-bar",
  slots: ["fab"] as const,
  create: (config) => create(config as BottomAppBarConfig),
  styles: ["bottom-app-bar"],
  hostStyles: ":host{display:block}",
  attributes: {
    "fab-position": { type: "string", config: "fabPosition" },
    "auto-hide": { type: "boolean", config: "autoHide" },
    "transition-duration": { type: "number", config: "transitionDuration" },
    "aria-label": {
      type: "string",
      // The factory names the toolbar "Bottom app bar" and takes no other name.
      update: (c, v) => c.element.setAttribute("aria-label", v === null ? "Bottom app bar" : String(v)),
    },
  },
  methods: ["show", "hide"] as const,
  config: readBar,
  setup: (host, component) => {
    const label = host.getAttribute("aria-label");
    if (label !== null) component.element.setAttribute("aria-label", label);
    const slot = component.element.querySelector<HTMLSlotElement>('slot[name="fab"]');
    const onSlotChange = (): void =>
      void component.element.classList.toggle(fabClass(component), !!slot?.assignedElements().length);
    slot?.addEventListener("slotchange", onSlotChange);
    return () => slot?.removeEventListener("slotchange", onSlotChange);
  },
} satisfies ElementSpec<BottomAppBarComponent>;

export const bottomAppBarElement = defineElement<BottomAppBarComponent>(bottomAppBarSpec);
export type BottomAppBarSpec = typeof bottomAppBarSpec;
/** `<m-bottom-app-bar>` as a ref or a query returns it. */
export type BottomAppBarElement = ElementInstance<BottomAppBarSpec, BottomAppBarComponent>;

/** Registers `<m-bottom-app-bar>` (or `<prefix-bottom-app-bar>`). */
export const defineBottomAppBar = (options?: DefineOptions): string => bottomAppBarElement.define(options);

declare global {
  /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
  interface HTMLElementTagNameMap {
    "m-bottom-app-bar": BottomAppBarElement;
  }
}
