// src/elements/drawer.ts
/**
 * `<m-drawer>` with `<m-drawer-item>` children: the standard (in-page)
 * navigation drawer.
 *
 * Each `<m-drawer-item>` declares one destination (`value`, `icon`, `badge`,
 * `disabled`, and its text as the label), or with `type="section"` a section
 * headline (its text) and with `type="divider"` a divider. The drawer reads
 * them into the factory's config and updates in place when they change; the
 * children stay where the framework put them. `value` on the drawer is the
 * default destination, which moves the live one until the user or script
 * changes it; the `value` property is the live one.
 *
 * `open` shows the drawer, as on the factory: without it the drawer is
 * collapsed to no width and inert. The modal variant (scrim, focus trap) is
 * not offered here: the element always creates the standard one.
 *
 * @module elements
 */

import createDrawer from "../components/drawer";
import type { DrawerComponent, DrawerConfig, DrawerItemConfig } from "../components/drawer/types";
import {
  createDeclarationClass, defineElement, DEFAULT_PREFIX, type Config, type DefineOptions, type ElementAttributes,
  type ElementHost, type ElementInstance, type ElementSpec,
} from "./define";

/** The declared items, `active` as given. A destination without a label is left out until it has one. */
const declaredItems = (host: HTMLElement, active: string | null): DrawerItemConfig[] => {
  const itemTag = `${host.localName}-item`;
  const items: DrawerItemConfig[] = [];
  for (const child of Array.from(host.children)) {
    if (child.localName !== itemTag) continue;
    const type = child.getAttribute("type");
    const label = child.getAttribute("label") ?? (child.textContent ?? "").trim();
    if (type === "divider") {
      items.push({ type: "divider" });
      continue;
    }
    if (type === "section") {
      items.push({ type: "section", label });
      continue;
    }
    if (!label) continue;
    const id = child.getAttribute("value") ?? label;
    items.push({
      id,
      label,
      icon: child.getAttribute("icon") ?? undefined,
      badge: child.getAttribute("badge") ?? undefined,
      disabled: child.hasAttribute("disabled"),
      active: id === active,
    });
  }
  return items;
};

const readDrawer = (host: HTMLElement): Config =>
  ({ items: declaredItems(host, host.getAttribute("value")) }) satisfies DrawerConfig;

const withoutActive = (items: DrawerItemConfig[]): string =>
  JSON.stringify(items.map(({ active: _active, ...item }) => item));

/**
 * Applies the declared items in place, keeping the selection: the factory
 * renders its items again. A focused item keeps focus when it is still there.
 */
const updateDrawer = (host: ElementHost<DrawerComponent>, component: DrawerComponent): boolean => {
  const active = component.getActive();
  const items = declaredItems(host, active);
  if (withoutActive(items) === withoutActive(component.getItems())) return true;
  // The factory renders new buttons without restoring focus.
  const focused = (host.shadowRoot?.activeElement as HTMLElement | null)?.dataset.id;
  component.setItems(items);
  if (focused !== undefined) {
    const item = Array.from(component.element.querySelectorAll<HTMLElement>("[data-id]")).find(
      (element) => element.dataset.id === focused && !element.hasAttribute("disabled")
    );
    item?.focus();
  }
  return true;
};

/** Selects an item; null clears the selection, which the factory does for an empty id. */
const select = (component: DrawerComponent, value: unknown): void =>
  void component.setActive(value === null || value === undefined ? "" : String(value));

/** The standard drawer; a bare number `width` is pixels, as a number is for the factory. */
const create = (config: DrawerConfig): DrawerComponent => {
  const width = typeof config.width === "string" && /^\d+(\.\d+)?$/.test(config.width) ? Number(config.width) : config.width;
  return createDrawer({ ...config, width, variant: "standard" });
};

const drawerSpec = {
  name: "drawer",
  create: (config) => create(config as DrawerConfig),
  styles: ["drawer"],
  hostStyles: ":host{display:block;flex-shrink:0}",
  attributes: {
    value: { type: "string", update: (c, v) => select(c, v) },
    open: { type: "boolean", config: "open", update: (c, v) => void (v ? c.open() : c.close()) },
    headline: { type: "string", config: "headline", update: (c, v) => void c.setHeadline(v === null ? "" : String(v)) },
    position: { type: "string", config: "position" },
    width: { type: "string", config: "width" },
    dense: { type: "boolean", config: "dense" },
    "aria-label": {
      type: "string",
      config: "ariaLabel",
      // The factory reads ariaLabel at creation only: write the landmark's name.
      update: (c, v) => c.element.setAttribute("aria-label", v === null ? c.getHeadline() || "Navigation" : String(v)),
    },
  },
  properties: {
    value: { get: (c) => c.getActive(), set: (c, v) => select(c, v) },
  },
  model: "value" as const,
  events: {
    // The factory emits `select` on a click or a keyboard activation, and
    // setActive() is silent: `setup` forwards it as `change`. Listed here for
    // its type and the adapters.
    change: {
      detail: (payload) => ({ value: (payload as { value: string }).value }),
    },
  },
  config: readDrawer,
  setup: (host, component) => {
    const onSelect = ({ id }: { id: string }): void => {
      host.dispatchEvent(new CustomEvent("change", { detail: { value: id }, bubbles: true, composed: true }));
    };
    component.on("select", onSelect);
    return () => {
      component.off("select", onSelect);
    };
  },
  observeChildren: updateDrawer,
} satisfies ElementSpec<DrawerComponent>;

export const drawerElement = defineElement<DrawerComponent>(drawerSpec);
export type DrawerSpec = typeof drawerSpec;
/** `<m-drawer>` as a ref or a query returns it. */
export type DrawerElement = ElementInstance<DrawerSpec, DrawerComponent>;

/**
 * `<m-drawer-item>` declares one destination, section headline or divider,
 * and renders nothing. Its text content is the label unless `label` is set.
 */
export const drawerItemDeclaration = {
  name: "drawer-item",
  attributes: {
    type: { type: "string" },
    value: { type: "string" },
    label: { type: "string" },
    icon: { type: "string" },
    badge: { type: "string" },
    disabled: { type: "boolean" },
  },
} as const;
export type DrawerItemAttributes = ElementAttributes<typeof drawerItemDeclaration>;

/** Registers `<m-drawer>` and `<m-drawer-item>` (or with another prefix). */
export const defineDrawer = (options?: DefineOptions): string => {
  const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${drawerItemDeclaration.name}`;
  // Defined first, so items already in the page are upgraded before the
  // drawer reads them.
  if (!customElements.get(itemTag)) customElements.define(itemTag, createDeclarationClass(drawerItemDeclaration.attributes));
  return drawerElement.define(options);
};
