// src/elements/top-app-bar.ts
/**
 * `<m-top-app-bar>`: the top app bar as a container with slots.
 *
 * Children are the headline, and `headline` its text when there are none;
 * `slot="leading"` takes the navigation icon button and `slot="trailing"` the
 * action icon buttons. `type` is `small`, `center`, `medium` or `large`, as
 * the factory names them.
 *
 * The bar shows its scrolled state once the window scrolls past
 * `scroll-threshold`; `no-scroll` turns that off and `no-compress` keeps a
 * medium or large bar from compressing. `scroll-target` names the id of a
 * scrolling element to follow instead of the window; any other scroller can
 * drive the bar through `setScrollState(scrolled)`.
 *
 * Parts: `top-app-bar`, `leading`, `headline`, `trailing`.
 *
 * @module elements
 */

import createTopAppBar from "../components/top-app-bar";
import type { TopAppBar } from "../components/top-app-bar/top-app-bar";
import type { TopAppBarConfig, TopAppBarType } from "../components/top-app-bar/types";
import { TOP_APP_BAR_DEFAULTS } from "../components/top-app-bar/constants";
import { defineElement, type Config, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";

const namedSlot = (name: string): HTMLSlotElement => {
  const slot = document.createElement("slot");
  slot.name = name;
  return slot;
};

/**
 * The factory sets the headline as text: the element puts a slot there, and
 * the text after it (see `headlineFallback`). Slots go in the leading and
 * trailing containers the factory appends elements to.
 */
const create = (config: TopAppBarConfig): TopAppBar => {
  const bar = createTopAppBar(config);
  const headline = bar.getHeadlineElement();
  const text = document.createElement("span");
  text.textContent = headline.textContent;
  headline.replaceChildren(document.createElement("slot"), text);
  bar.addLeadingElement(namedSlot("leading"));
  bar.addTrailingElement(namedSlot("trailing"));
  return bar;
};

const headlineText = (component: TopAppBar): HTMLElement | null =>
  component.getHeadlineElement().querySelector("span");

/**
 * Shows the `headline` text while the default slot has no content. Not the
 * slot's own fallback: the whitespace between the slotted buttons is
 * assigned to the default slot, which would hide it.
 */
const headlineFallback = (component: TopAppBar): (() => void) => {
  const slot = component.getHeadlineElement().querySelector("slot") as HTMLSlotElement;
  const sync = (): void => {
    const text = headlineText(component);
    if (text) {
      text.hidden = slot
        .assignedNodes()
        .some((node) => node.nodeType === Node.ELEMENT_NODE || (node.textContent ?? "").trim() !== "");
    }
  };
  sync();
  slot.addEventListener("slotchange", sync);
  return () => slot.removeEventListener("slotchange", sync);
};

const readBar = (host: HTMLElement): Config =>
  ({
    // A scroll target replaces the window as what the bar follows.
    scrollable: !host.hasAttribute("no-scroll") && !host.hasAttribute("scroll-target"),
    compressible: !host.hasAttribute("no-compress"),
  }) satisfies Partial<TopAppBarConfig>;

const threshold = (host: HTMLElement): number => {
  const value = Number(host.getAttribute("scroll-threshold") ?? TOP_APP_BAR_DEFAULTS.SCROLL_THRESHOLD);
  return Number.isNaN(value) ? TOP_APP_BAR_DEFAULTS.SCROLL_THRESHOLD : value;
};

/**
 * Follows the element whose id `scroll-target` names. Listening at the
 * document, in the capture phase, finds a target rendered after the bar.
 */
const followScrollTarget = (host: HTMLElement, component: TopAppBar): (() => void) => {
  const id = host.getAttribute("scroll-target");
  if (!id || host.hasAttribute("no-scroll")) return () => undefined;
  const update = (target: Element): void => void component.setScrollState(target.scrollTop > threshold(host));
  const onScroll = (event: Event): void => {
    const target = event.composedPath()[0];
    if (target instanceof Element && target.id === id) update(target);
  };
  const initial = host.ownerDocument.getElementById(id);
  if (initial) update(initial);
  host.ownerDocument.addEventListener("scroll", onScroll, { capture: true, passive: true });
  return () => host.ownerDocument.removeEventListener("scroll", onScroll, { capture: true });
};

const topAppBarSpec = {
  name: "top-app-bar",
  create: (config) => create(config as TopAppBarConfig),
  styles: ["top-app-bar"],
  hostStyles: ":host{display:block}",
  attributes: {
    type: { type: "string", config: "type", update: (c, v) => void c.setType((v ?? "small") as TopAppBarType) },
    headline: {
      type: "string",
      config: "title",
      update: (c, v) => {
        const text = headlineText(c);
        if (text) text.textContent = v === null ? "" : String(v);
      },
    },
    "no-scroll": { type: "boolean" },
    "no-compress": { type: "boolean" },
    "scroll-threshold": { type: "number", config: "scrollThreshold" },
    "scroll-target": { type: "string" },
    "aria-label": {
      type: "string",
      // The factory names the banner "Top app bar" and takes no other name.
      update: (c, v) => c.element.setAttribute("aria-label", v === null ? "Top app bar" : String(v)),
    },
  },
  methods: ["setScrollState"] as const,
  config: readBar,
  setup: (host, component) => {
    const label = host.getAttribute("aria-label");
    if (label !== null) component.element.setAttribute("aria-label", label);
    const cleanups = [headlineFallback(component), followScrollTarget(host, component)];
    return () => cleanups.forEach((cleanup) => cleanup());
  },
} satisfies ElementSpec<TopAppBar>;

export const topAppBarElement = defineElement<TopAppBar>(topAppBarSpec);
export type TopAppBarSpec = typeof topAppBarSpec;
/** `<m-top-app-bar>` as a ref or a query returns it. */
export type TopAppBarElement = ElementInstance<TopAppBarSpec, TopAppBar>;

/** Registers `<m-top-app-bar>` (or `<prefix-top-app-bar>`). */
export const defineTopAppBar = (options?: DefineOptions): string => topAppBarElement.define(options);
