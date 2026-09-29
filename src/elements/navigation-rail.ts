// src/elements/navigation-rail.ts
/**
 * `<m-navigation-rail>` with `<m-navigation-rail-item>` children: the
 * standard (in-page) navigation rail.
 *
 * Each `<m-navigation-rail-item>` declares one destination (`value`, `icon`,
 * `selected-icon`, `badge`, `badge-label`, `href`, `disabled`, and its text as
 * the label). An item with `href` renders as a link and keeps native
 * navigation. The rail reads them into the factory's config and updates in
 * place when they change; the children stay where the framework put them.
 * `value` on the rail is the default destination, which moves the live one
 * until the user or script changes it; the `value` property is the live one.
 *
 * `expanded` reflects the rail's state, as `open` does on `<details>`: the
 * menu button sets and removes it. `no-toggle` drops the menu button, and an
 * element with `slot="header"` (a FAB) goes below it. `layout="modal"` is the
 * modal layout: the expanded rail is a native `<dialog>` in the element's
 * shadow root, shown with `showModal()` in the top layer, the page outside
 * inert and the scrim its `::backdrop`; collapsed, it is hidden. Escape and a
 * click on the backdrop collapse it.
 *
 * @module elements
 */

import createNavigationRail from "../components/navigation-rail";
import type {
  NavigationRailComponent, NavigationRailConfig, NavigationRailItemConfig,
} from "../components/navigation-rail/types";
import {
  createDeclarationClass, defineElement, DEFAULT_PREFIX, type Config, type DefineOptions, type ElementAttributes,
  type ElementHost, type ElementInstance, type ElementSpec,
} from "./define";

/**
 * The declared destinations, `active` as given. The factory throws on an item
 * without a label or an icon and on a repeated id, which a framework can
 * render on the way to a complete item: such an item is left out until it is
 * complete.
 */
const declaredItems = (host: HTMLElement, active: string | null): NavigationRailItemConfig[] => {
  const itemTag = `${host.localName}-item`;
  const items: NavigationRailItemConfig[] = [];
  const ids = new Set<string>();
  for (const child of Array.from(host.children)) {
    if (child.localName !== itemTag) continue;
    const label = child.getAttribute("label") ?? (child.textContent ?? "").trim();
    const id = child.getAttribute("value") ?? label;
    const icon = child.getAttribute("icon") ?? "";
    if (!label || !icon || !id || ids.has(id)) continue;
    ids.add(id);
    const badge = child.getAttribute("badge");
    items.push({
      id,
      label,
      icon,
      activeIcon: child.getAttribute("selected-icon") ?? undefined,
      href: child.getAttribute("href") ?? undefined,
      // A present, empty badge is the dot.
      badge: badge === null ? undefined : badge === "" ? true : badge,
      badgeLabel: child.getAttribute("badge-label") ?? undefined,
      disabled: child.hasAttribute("disabled"),
      active: id === active,
    });
  }
  return items;
};

/** The named slot the factory's header takes, when the rail has content for it. */
const headerSlot = (host: HTMLElement): HTMLSlotElement | undefined => {
  if (!Array.from(host.children).some((child) => child.getAttribute("slot") === "header")) return undefined;
  const slot = document.createElement("slot");
  slot.name = "header";
  return slot;
};

const readRail = (host: HTMLElement): Config =>
  ({
    items: declaredItems(host, host.getAttribute("value")),
    showToggle: !host.hasAttribute("no-toggle"),
    header: headerSlot(host),
  }) satisfies NavigationRailConfig;

const withoutActive = (items: NavigationRailItemConfig[]): string =>
  JSON.stringify(items.map(({ active: _active, ...item }) => item));

/**
 * Applies the declared items in place, keeping the selection. Returns false
 * when a header appears or goes, which the factory places only at creation.
 */
const updateRail = (host: ElementHost<NavigationRailComponent>, component: NavigationRailComponent): boolean => {
  const header = component.element.querySelector('slot[name="header"]') !== null;
  if (header !== !!headerSlot(host)) return false;
  const items = declaredItems(host, component.getActive());
  if (withoutActive(items) === withoutActive(component.getItems())) return true;
  // The factory renders its items again and keeps the focused one focused.
  component.setItems(items);
  return true;
};

const setAriaLabel = (component: NavigationRailComponent, value: unknown): void => {
  // The factory reads ariaLabel at creation only: write the landmark's name.
  component.element.setAttribute("aria-label", value === null || value === undefined ? "Primary navigation" : String(value));
};

const navigationRailSpec = {
  name: "navigation-rail",
  create: (config) => {
    const { layout, ...rest } = config as NavigationRailConfig;
    return createNavigationRail({ ...rest, layout: layout === "modal" ? "modal" : "standard" });
  },
  styles: ["navigation-rail"],
  hostStyles: ":host{display:block;flex-shrink:0}",
  attributes: {
    value: { type: "string", update: (c, v) => void c.setActive(v === null ? null : String(v)) },
    expanded: { type: "boolean", config: "expanded", update: (c, v) => void (v ? c.expand() : c.collapse()) },
    "hide-when-collapsed": { type: "boolean", config: "hideWhenCollapsed" },
    layout: { type: "string", config: "layout" },
    "expanded-width": { type: "number", config: "expandedWidth" },
    "no-toggle": { type: "boolean" },
    "expand-label": { type: "string", config: "expandLabel" },
    "collapse-label": { type: "string", config: "collapseLabel" },
    "expand-icon": { type: "string", config: "expandIcon" },
    "collapse-icon": { type: "string", config: "collapseIcon" },
    "aria-label": { type: "string", config: "ariaLabel", update: (c, v) => setAriaLabel(c, v) },
  },
  properties: {
    value: {
      get: (c) => c.getActive(),
      set: (c, v) => void c.setActive(v === null || v === undefined ? null : String(v)),
    },
  },
  methods: ["expand", "collapse", "toggle"] as const,
  model: "value" as const,
  events: {
    // The factory emits `select` on a click or a keyboard activation, and
    // setActive() is silent: `setup` forwards it as `change`. Listed here for
    // its type and the adapters.
    change: {
      detail: (payload) => ({ value: (payload as { value: string }).value }),
    },
  },
  config: readRail,
  setup: (host, component) => {
    const onSelect = ({ id }: { id: string }): void => {
      host.dispatchEvent(new CustomEvent("change", { detail: { value: id }, bubbles: true, composed: true }));
    };
    // `expanded` reflects the state the menu button changes; setting it back
    // to the same value is a no-op for the factory.
    const reflect = (): void => void host.toggleAttribute("expanded", component.isExpanded());
    component.on("select", onSelect);
    component.on("expand", reflect);
    component.on("collapse", reflect);
    return () => {
      component.off("select", onSelect);
      component.off("expand", reflect);
      component.off("collapse", reflect);
    };
  },
  observeChildren: updateRail,
} satisfies ElementSpec<NavigationRailComponent>;

export const navigationRailElement = defineElement<NavigationRailComponent>(navigationRailSpec);
export type NavigationRailSpec = typeof navigationRailSpec;
/** `<m-navigation-rail>` as a ref or a query returns it. */
export type NavigationRailElement = ElementInstance<NavigationRailSpec, NavigationRailComponent>;

/**
 * `<m-navigation-rail-item>` declares one destination and renders nothing.
 * Its text content is the label unless `label` is set; `icon` is required.
 */
export const navigationRailItemDeclaration = {
  name: "navigation-rail-item",
  attributes: {
    value: { type: "string" },
    label: { type: "string" },
    icon: { type: "string" },
    "selected-icon": { type: "string" },
    href: { type: "string" },
    badge: { type: "string" },
    "badge-label": { type: "string" },
    disabled: { type: "boolean" },
  },
} as const;
export type NavigationRailItemAttributes = ElementAttributes<typeof navigationRailItemDeclaration>;

/** Registers `<m-navigation-rail>` and `<m-navigation-rail-item>` (or with another prefix). */
export const defineNavigationRail = (options?: DefineOptions): string => {
  const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${navigationRailItemDeclaration.name}`;
  // Defined first, so items already in the page are upgraded before the rail
  // reads them.
  if (!customElements.get(itemTag)) {
    customElements.define(itemTag, createDeclarationClass(navigationRailItemDeclaration.attributes));
  }
  return navigationRailElement.define(options);
};
