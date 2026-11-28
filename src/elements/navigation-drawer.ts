// src/elements/navigation-drawer.ts
/**
 * `<m-navigation-drawer>` with `<m-navigation-drawer-item>` children: the
 * standard (in-page) navigation drawer.
 *
 * Each `<m-navigation-drawer-item>` declares one destination (`value`, `icon`,
 * `selected-icon`, `badge`, `disabled`, and its text as the label), or with
 * `type="section"` a section headline (its text) and with `type="divider"` a
 * divider. The drawer reads
 * them into the factory's config and updates in place when they change; the
 * children stay where the framework put them. `value` on the drawer is the
 * default destination, which moves the live one until the user or script
 * changes it; the `value` property is the live one.
 *
 * `open` shows the drawer, as on the factory: without it the drawer is
 * collapsed to no width and inert. `modal` makes it the modal drawer in the
 * factory's top layer (`layer: "top"`): a native `<dialog>` in the element's
 * shadow root, shown with `showModal()`, above every z-index, the page
 * outside inert, the scrim its `::backdrop`. Escape and a click on the
 * backdrop close it, and `open` then reflects its state;
 * `no-close-on-scrim-click` and `no-close-on-escape` keep it open instead. `open` and `close`
 * are dispatched as it opens and closes (not when the attribute is what
 * changed).
 *
 * Parts: `drawer`, `sheet`, `items`, `item`, `active-indicator`, `item-icon`, `item-label`,
 * `ripple`, `group`, `group-items`, `item-chevron`, `item-badge`.
 *
 * @module elements
 */

import { createShadowDrawer } from "../components/drawer/drawer";
import type { NavigationDrawerComponent, NavigationDrawerConfig, NavigationDrawerItemConfig, NavigationDrawerSectionEvent } from "../components/drawer/types";
import {
  createDeclarationClass, defineElement, DEFAULT_PREFIX, type Config, type DefineOptions, type ElementAttributes,
  type ElementHost, type ElementInstance, type ElementSpec,
} from "./define";

const collapsedDeclarations = new WeakSet<Element>();
const previousDeclarations = new WeakMap<HTMLElement, NavigationDrawerItemConfig[]>();

const itemChildren = (host: Element, tag: string): Element[] =>
  Array.from(host.children).filter(child => child.localName === tag);

const itemLabel = (child: Element, section: boolean): string =>
  child.getAttribute("label") ?? (section
    ? Array.from(child.childNodes).filter(node => node.nodeType === 3).map(node => node.textContent).join("")
    : child.textContent ?? "").trim();

const declaredItems = (host: Element, tag: string, active: string | null, sections: boolean): NavigationDrawerItemConfig[] => {
  const items: NavigationDrawerItemConfig[] = [];
  for (const child of itemChildren(host, tag)) {
    const type = child.getAttribute("type");
    if (type === "divider") {
      items.push({ type: "divider" });
      continue;
    }
    const nested = itemChildren(child, tag);
    const children = sections && nested.length ? declaredItems(child, tag, active, false) : [];
    const label = itemLabel(child, nested.length > 0);
    if (type === "section" && !children.length) {
      items.push({ type: "section", label });
      continue;
    }
    if (!label) continue;
    const id = child.getAttribute("value") ?? label;
    const item: NavigationDrawerItemConfig = {
      id,
      label,
      icon: child.getAttribute("icon") ?? undefined,
      activeIcon: child.getAttribute("selected-icon") ?? undefined,
      badge: child.getAttribute("badge") ?? undefined,
      disabled: child.hasAttribute("disabled"),
    };
    if (children.length) {
      item.items = children;
      if (child.hasAttribute("selectable") || child.hasAttribute("href")) {
        item.selectable = true;
        item.active = id === active;
        item.href = child.getAttribute("href") ?? undefined;
      }
      if (child.hasAttribute("expanded")) {
        collapsedDeclarations.delete(child);
        item.expanded = true;
      } else if (collapsedDeclarations.has(child)) item.expanded = false;
    } else {
      item.active = id === active;
      item.href = child.getAttribute("href") ?? undefined;
    }
    items.push(item);
  }
  return items;
};

const reflectSection = (host: HTMLElement, { id, expanded }: NavigationDrawerSectionEvent): void => {
  const tag = `${host.localName}-item`;
  const item = itemChildren(host, tag).find(child =>
    itemChildren(child, tag).length && (child.getAttribute("value") ?? itemLabel(child, true)) === id);
  if (!item) return;
  if (expanded) collapsedDeclarations.delete(item);
  else collapsedDeclarations.add(item);
  const previous = previousDeclarations.get(host)?.find(section => section.items && section.id === id);
  if (previous) previous.expanded = expanded;
  item.toggleAttribute("expanded", expanded);
};

const readDrawer = (host: HTMLElement): Config => {
  const items = declaredItems(host, `${host.localName}-item`, host.getAttribute("value"), true);
  previousDeclarations.set(host, items);
  const reflect = (event: NavigationDrawerSectionEvent): void => reflectSection(host, event);
  return { items, onExpand: reflect, onCollapse: reflect } satisfies NavigationDrawerConfig;
};

const withoutActive = (items: NavigationDrawerItemConfig[]): string =>
  JSON.stringify(items, (name, value: unknown) => name === "active" ? undefined : value);

/** Update declarations in place and restore focus if the focused item remains visible. */
const updateDrawer = (host: ElementHost<NavigationDrawerComponent>, component: NavigationDrawerComponent): boolean => {
  const active = component.getActive();
  const items = declaredItems(host, `${host.localName}-item`, host.dirty ? active : host.getAttribute("value"), true);
  const previous = previousDeclarations.get(host) ?? [];
  previousDeclarations.set(host, items);

  const signature = withoutActive(items);
  if (signature === withoutActive(previous) || signature === withoutActive(component.getItems())) return true;

  // Keep live expansion when the declaration's expansion attribute did not
  // change. A newly available active child still uses the initial-state rule.
  const settings = items.map(item => {
    if (!item.items || item.id === undefined || item.items.some(child => child.active && child.id !== active)) return item;
    const old = previous.find(candidate => candidate.items && candidate.id === item.id);
    return old && old.expanded === item.expanded
      ? { ...item, expanded: component.isSectionExpanded(item.id) }
      : item;
  });

  const focused = (host.shadowRoot?.activeElement as HTMLElement | null)?.dataset.id;
  component.setItems(settings);
  // The items feature restores the focus itself, to the same row or the
  // same section chevron; only fall back when it found nothing to focus.
  const still = host.shadowRoot?.activeElement;
  if (focused !== undefined && !(still && component.element.contains(still))) {
    const item = Array.from(component.element.querySelectorAll<HTMLElement>("[data-id]")).find(
      element => element.dataset.id === focused && !element.matches('[disabled], [aria-disabled="true"]') && !element.closest("[inert]")
    );
    item?.focus();
  }
  return true;
};

const sectionDetail = (payload: unknown) => {
  const { value, expanded } = payload as NavigationDrawerSectionEvent;
  return { value, expanded };
};

/** Selects an item; null clears the selection, which the factory does for an empty id. */
const select = (component: NavigationDrawerComponent, value: unknown): void =>
  void component.setActive(value === null || value === undefined ? "" : String(value));

/**
 * The standard drawer, or with `modal` the modal one in the top layer; a bare
 * number `width` is pixels, as a number is for the factory.
 */
const create = ({ modal, ...config }: NavigationDrawerConfig & { modal?: boolean }): NavigationDrawerComponent => {
  const width = typeof config.width === "string" && /^\d+(\.\d+)?$/.test(config.width) ? Number(config.width) : config.width;
  return createShadowDrawer({ ...config, width, ...(modal ? { variant: "modal", layer: "top" } : { variant: "standard" }) });
};

/** The navigation drawer's one spec, under the tag name Material gives it. */
export const createDrawerSpec = (name: string) => ({
  name,
  create: (config) => create(config as NavigationDrawerConfig),
  styles: ["drawer"],
  hostStyles: ":host{display:block;flex-shrink:0}",
  attributes: {
    value: { type: "string", update: (c, v) => select(c, v) },
    open: { type: "boolean", config: "open", update: (c, v) => void (v ? c.open() : c.close()) },
    modal: { type: "boolean", config: "modal" },
    headline: { type: "string", config: "headline", update: (c, v) => void c.setHeadline(v === null ? "" : String(v)) },
    position: { type: "string", config: "position" },
    width: { type: "string", config: "width" },
    dense: { type: "boolean", config: "dense" },
    // Read as the user asks to close (see `setup`): nothing to update
    "no-close-on-scrim-click": { type: "boolean", update: () => undefined },
    "no-close-on-escape": { type: "boolean", update: () => undefined },
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
  methods: ["expandSection", "collapseSection", "toggleSection", "isSectionExpanded", "getExpandedSections"] as const,
  events: {
    // The factory emits `select` on a click or a keyboard activation, and
    // setActive() is silent: `setup` forwards it as `change`. Listed here for
    // its type and the adapters.
    change: {
      detail: (payload) => ({ value: (payload as { value: string }).value }),
    },
    // State beside the model: opening leaves the drawer clean.
    open: { detail: () => null, state: true },
    close: { detail: () => null, state: true },
    expand: { detail: sectionDetail, state: true },
    collapse: { detail: sectionDetail, state: true },
  },
  config: readDrawer,
  setup: (host, component) => {
    const onSelect = ({ id }: { id: string }): void => {
      host.dispatchEvent(new CustomEvent("change", { detail: { value: id }, bubbles: true, composed: true }));
    };
    // A modal drawer closes itself (Escape, the backdrop): `open` reflects it.
    const reflect = (): void => {
      if (host.hasAttribute("modal")) host.toggleAttribute("open", component.isOpen());
    };
    // The factory's `dismissible` turns off the scrim and Escape together:
    // each is refused here on its own, before the factory's listener closes.
    const root = component.element;
    const onClick = (event: MouseEvent): void => {
      if (event.target === root && host.hasAttribute("no-close-on-scrim-click")) event.stopImmediatePropagation();
    };
    const onCancel = (event: Event): void => {
      if (!host.hasAttribute("no-close-on-escape")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    root.addEventListener("click", onClick, true);
    root.addEventListener("cancel", onCancel, true);
    component.on("select", onSelect);
    component.on("open", reflect);
    component.on("close", reflect);
    return () => {
      root.removeEventListener("click", onClick, true);
      root.removeEventListener("cancel", onCancel, true);
      component.off("select", onSelect);
      component.off("open", reflect);
      component.off("close", reflect);
    };
  },
  observeChildren: updateDrawer,
}) satisfies ElementSpec<NavigationDrawerComponent>;

export const navigationDrawerSpec = createDrawerSpec("navigation-drawer");

export const navigationDrawerElement = defineElement<NavigationDrawerComponent>(navigationDrawerSpec);
export type NavigationDrawerSpec = typeof navigationDrawerSpec;
/** `<m-navigation-drawer>` as a ref or a query returns it. */
export interface NavigationDrawerElement extends ElementInstance<NavigationDrawerSpec, NavigationDrawerComponent> {
  expandSection(id: string): this;
  collapseSection(id: string): this;
  toggleSection(id: string): this;
  isSectionExpanded(id: string): boolean;
  getExpandedSections(): string[];
}

/**
 * `<m-navigation-drawer-item>` (formerly `<m-drawer-item>`) declares one
 * destination, section headline or divider, and renders nothing. Its text
 * content is the label unless `label` is set.
 */
export const navigationDrawerItemDeclaration = {
  name: "navigation-drawer-item",
  attributes: {
    type: { type: "string" },
    value: { type: "string" },
    label: { type: "string" },
    /** Markup (HTML). Not sanitized by default: see Markup and sanitizing. */
    icon: { type: "string" },
    /** Markup (HTML). Not sanitized by default: see Markup and sanitizing. Shown while this destination is active. */
    "selected-icon": { type: "string" },
    badge: { type: "string" },
    href: { type: "string" },
    expanded: { type: "boolean" },
    /** On a parent item: its header is a destination of its own (see `selectable` on the item config). */
    selectable: { type: "boolean" },
    disabled: { type: "boolean" },
  },
} as const;
export type NavigationDrawerItemAttributes = ElementAttributes<typeof navigationDrawerItemDeclaration>;

/** Registers `<m-navigation-drawer>` and `<m-navigation-drawer-item>` (or with another prefix). */
export const defineNavigationDrawer = (options?: DefineOptions): string => {
  const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${navigationDrawerItemDeclaration.name}`;
  // Defined first, so items already in the page are upgraded before the
  // drawer reads them.
  if (!customElements.get(itemTag)) customElements.define(itemTag, createDeclarationClass(navigationDrawerItemDeclaration.attributes));
  return navigationDrawerElement.define(options);
};

declare global {
  /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
  interface HTMLElementTagNameMap {
    "m-navigation-drawer": NavigationDrawerElement;
    "m-navigation-drawer-item": HTMLElement & NavigationDrawerItemAttributes;
  }
}
