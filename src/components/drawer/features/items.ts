// src/components/drawer/features/items.ts

import { DrawerConfig, DrawerItemConfig, DrawerSelectEvent, DrawerSectionEvent } from "../types";
import { DRAWER_CLASSES, DRAWER_EVENTS } from "../constants";
import {
  createRipple,
} from "../../../core/compose/features/ripple";

import { setHTML } from "../../../core/dom/html";
import { activeElementOf } from "../../../core/dom/focus";
import { getIcon } from "../../../core/icons";
import { safeUrl } from "../../../core/utils/url";

let drawerCount = 0;
const DEFAULT_CHEVRON = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z"/></svg>';
const isDestination = (item: DrawerItemConfig) => item.type !== "divider" && item.type !== "section";
const isSection = (item: DrawerItemConfig) => item.type !== "divider" && !!item.items?.length;
const hasModifiers = (event: MouseEvent | KeyboardEvent) => event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
const enabled = (element: HTMLElement) => !element.matches('[disabled], [aria-disabled="true"]');
const visible = (element: HTMLElement) => enabled(element) && !element.closest("[inert], [hidden]");

interface Section {
  id: string;
  index: number;
  label: string;
  group: HTMLElement;
  button: HTMLElement;
  panel: HTMLElement;
  expanded: boolean;
}
interface Destination {
  item: DrawerItemConfig;
  element: HTMLElement;
  parent?: Section;
}

const initialActive = (items: DrawerItemConfig[]) =>
  items.flatMap(item => isSection(item) ? item.items! : [item])
    .find(item => isDestination(item) && item.active && !item.disabled)?.id || null;

/**
 * An empty or zero count is no badge: the same rule the standalone badge
 * applies to its own label ("a count of nothing is not news"). Kept local
 * because the drawer's badge is its spec's own "Badge label text" — plain
 * trailing text, not the badge component — so nothing of the badge module
 * comes with it.
 */
const hasBadge = (badge: string | undefined): badge is string => !!badge && badge !== "0";
/**
 * Component shape expected by withItems
 */
interface ItemsBaseComponent {
  element: HTMLElement;
  getClass: (name: string) => string;
  emit: (event: string, data?: unknown) => void;
}

/**
 * What withItems adds
 */
export interface ItemsFeature {
  itemsContainer: HTMLElement | null;
  drawerItems: {
    setActive: (id: string) => void;
    getActive: () => string | null;
    setItems: (items: DrawerItemConfig[]) => void;
    getItems: () => DrawerItemConfig[];
    setBadge: (id: string, badge: string) => void;
    expandSection: (id: string) => void;
    collapseSection: (id: string) => void;
    toggleSection: (id: string) => void;
    isSectionExpanded: (id: string) => boolean;
    getExpandedSections: () => string[];
    renderItems: () => void;
    destroy: () => void;
  };
}

/**
 * Creates a single navigation item element
 */
const createItemElement = (
  item: DrawerItemConfig,
  getClass: (name: string) => string,
): HTMLElement => {
  const { href } = item;
  const el = document.createElement(href === undefined ? "button" : "a");
  el.className = getClass(DRAWER_CLASSES.ITEM);
  if (href !== undefined) {
    if (item.disabled) el.setAttribute("role", "link");
    else el.setAttribute("href", safeUrl(href) || (href ? "about:blank" : ""));
  } else {
    el.setAttribute("type", "button");
    if (item.disabled) el.setAttribute("disabled", "");
  }
  el.setAttribute("tabindex", item.disabled ? "-1" : "0");

  if (item.id) {
    el.dataset.id = item.id;
  }

  if (item.disabled) {
    el.setAttribute("aria-disabled", "true");
  }

  // Active indicator (background shape)
  const indicator = document.createElement("span");
  indicator.className = getClass("drawer__active-indicator");
  el.appendChild(indicator);

  // Icon (optional, placed before label): the item's active icon while it is
  // the active destination, as the navigation rail swaps its destinations
  if (item.icon || item.activeIcon) {
    const iconEl = document.createElement("span");
    iconEl.className = getClass("drawer__item-icon");
    setHTML(iconEl, item.active && item.activeIcon ? item.activeIcon : item.icon);
    iconEl.setAttribute("aria-hidden", "true");
    el.appendChild(iconEl);
  }

  // Label text
  if (item.label) {
    const labelEl = document.createElement("span");
    labelEl.className = getClass("drawer__item-label");
    labelEl.textContent = item.label;
    el.appendChild(labelEl);
  }

  // Badge (optional, placed after label). An empty or zero count is no badge.
  if (hasBadge(item.badge)) {
    const badgeEl = document.createElement("span");
    badgeEl.className = getClass("drawer__item-badge");
    badgeEl.textContent = item.badge;
    el.appendChild(badgeEl);
  }

  // Active state
  if (item.active) {
    el.classList.add(`${getClass("drawer__item")}--active`);
    el.setAttribute("aria-current", "page");
  }

  return el;
};

/**
 * Creates a divider element
 */
const createDividerElement = (
  getClass: (name: string) => string,
): HTMLElement => {
  const el = document.createElement("hr");
  el.className = getClass("drawer__divider");
  el.setAttribute("role", "separator");
  return el;
};

/**
 * Creates a section label element
 */
const createSectionElement = (
  item: DrawerItemConfig,
  getClass: (name: string) => string,
): HTMLElement => {
  const el = document.createElement("div");
  el.className = getClass("drawer__section-label");
  el.textContent = item.label || item.sectionLabel || "";
  return el;
};

/**
 * Adds item management functionality to the drawer component
 *
 * @param config - Drawer configuration
 * @returns Component enhancer function
 */
export const withItems =
  (config: DrawerConfig, shadow: boolean) =>
  <C extends ItemsBaseComponent>(component: C): C & ItemsFeature => {
    const cls = component.getClass;
    const itemsContainer = document.createElement("div");
    itemsContainer.className = cls(DRAWER_CLASSES.ITEMS);
    let currentItems = config.items ?? [];
    let activeId = initialActive(currentItems);
    let destinations: Destination[] = [];
    let instance: number | undefined;
    const sections = new Map<string, Section>();

    // Capture the registry value at creation, as with other drawer icons.
    const chevronMarkup = getIcon("expand-more", DEFAULT_CHEVRON);
    const ripple = config.ripple !== false ? createRipple() : null;
    let rippled: HTMLElement[] = [];
    const unmountRipples = (): void => {
      rippled.forEach(element => ripple?.unmount(element));
      rippled = [];
    };
    const mountRipple = (element: HTMLElement, disabled?: boolean): void => {
      if (!ripple || disabled) return;
      ripple.mount(element);
      rippled.push(element);
    };

    const paintSection = (section: Section, expanded: boolean): void => {
      section.expanded = expanded;
      section.button.setAttribute("aria-expanded", String(expanded));
      section.button.classList.toggle(cls(DRAWER_CLASSES.ITEM_EXPANDED), expanded);
      section.group.classList.toggle(cls("drawer__group--expanded"), expanded);
      section.panel.toggleAttribute("inert", !expanded);
    };
    const paintParent = (section: Section, active: boolean): void => {
      section.button.classList.toggle(cls(DRAWER_CLASSES.ITEM_HAS_ACTIVE), active);
    };

    const setExpanded = (section: Section | undefined, expanded: boolean, event?: Event): void => {
      if (!section || section.expanded === expanded) return;
      if (!expanded && section.panel.contains(activeElementOf(itemsContainer))) {
        (enabled(section.button) ? section.button : component.element).focus();
      }
      paintSection(section, expanded);
      currentItems = currentItems.map((item, index) => index === section.index ? { ...item, expanded } : item);
      const detail: DrawerSectionEvent = {
        id: section.id, value: section.id, label: section.label, expanded,
        ...(event && { originalEvent: event }),
      };
      component.emit(expanded ? DRAWER_EVENTS.EXPAND : DRAWER_EVENTS.COLLAPSE, detail);
    };

    const mapItems = (map: (item: DrawerItemConfig) => DrawerItemConfig): void => {
      currentItems = currentItems.map(item => {
        const next = map(item);
        return isSection(item) ? { ...next, items: item.items!.map(map) } : next;
      });
    };

    const setActive = (id: string): void => {
      const target = id ? destinations.find(({ item }) => item.id === id && !item.disabled) : undefined;
      if (id && !target) return;
      activeId = target ? id : null;
      for (const row of destinations) {
        const active = row === target;
        row.element.classList.toggle(cls("drawer__item--active"), active);
        if (active) row.element.setAttribute("aria-current", "page");
        else row.element.removeAttribute("aria-current");
        const icon = row.element.querySelector(`.${cls(DRAWER_CLASSES.ITEM_ICON)}`);
        if (icon) setHTML(icon, active && row.item.activeIcon ? row.item.activeIcon : row.item.icon);
      }
      for (const section of sections.values()) paintParent(section, section === target?.parent);
      if (target?.parent && !target.parent.expanded) paintSection(target.parent, true);
      mapItems(item => ({ ...item, active: item.id === id }));
    };

    const renderItems = (): void => {
      unmountRipples();
      itemsContainer.replaceChildren();
      destinations = [];
      sections.clear();
      const usedDomIds = new Set<string>();
      const namedSections = new Set(currentItems.filter(isSection).map(item => item.id));
      let sectionIndex = 0;

      const renderItem = (item: DrawerItemConfig, container: HTMLElement, parent?: Section): void => {
        if (item.type === "divider") {
          container.append(createDividerElement(cls));
          return;
        }
        if (item.type === "section") {
          container.append(createSectionElement(item, cls));
          return;
        }
        const active = !!activeId && item.id === activeId && !item.disabled;
        const element = createItemElement({ ...item, active }, cls);
        const index = destinations.length;
        element.dataset.navIndex = String(index);
        if (parent) {
          element.classList.add(cls(DRAWER_CLASSES.ITEM_CHILD));
          element.dataset.parentId = parent.id;
        }
        destinations.push({ item, element, parent });
        element.addEventListener("click", (event) => {
          if (item.disabled) {
            event.preventDefault();
            return;
          }
          if (item.href !== undefined && (hasModifiers(event) || event.button !== 0)) return;
          if (!item.id) return;
          setActive(item.id);
          const detail: DrawerSelectEvent = { id: item.id, value: item.id, label: item.label || "", index, originalEvent: event };
          component.emit(DRAWER_EVENTS.SELECT, detail);
        });
        mountRipple(element, item.disabled);
        container.append(element);
      };

      currentItems.forEach((item, index) => {
        if (!isSection(item)) {
          renderItem(item, itemsContainer);
          return;
        }

        let id = item.id;
        if (!id) {
          do { id = String(sectionIndex++); } while (namedSections.has(id));
        }
        const slug = id.replace(/[^\w-]+/g, "-");
        // Shadow roots scope ID references. Light-DOM instances can share
        // item ids, so give each factory drawer a document-wide namespace.
        const scope = shadow ? "" : `${instance ??= ++drawerCount}-`;
        const base = cls(`drawer-sec-${scope}${slug}`);
        let prefix = base;
        for (let suffix = 1; usedDomIds.has(prefix); suffix++) prefix = `${base}-${suffix}`;
        usedDomIds.add(prefix);

        const label = item.label || item.sectionLabel || "";
        const group = document.createElement("div");
        group.className = cls(DRAWER_CLASSES.GROUP);
        group.dataset.sectionId = id;
        const button = createItemElement({ ...item, id, label, href: undefined, active: false }, cls);
        button.id = `${prefix}-btn`;
        button.classList.add(cls(DRAWER_CLASSES.ITEM_EXPANDABLE));
        const chevron = document.createElement("span");
        chevron.className = cls(DRAWER_CLASSES.ITEM_CHEVRON);
        chevron.setAttribute("aria-hidden", "true");
        setHTML(chevron, chevronMarkup);
        button.append(chevron);

        const panel = document.createElement("div");
        panel.className = cls(DRAWER_CLASSES.GROUP_ITEMS);
        panel.id = `${prefix}-panel`;
        panel.setAttribute("role", "group");
        panel.setAttribute("aria-labelledby", button.id);
        button.setAttribute("aria-controls", panel.id);
        const inner = document.createElement("div");
        inner.className = cls(DRAWER_CLASSES.GROUP_ITEMS_INNER);
        panel.append(inner);
        group.append(button, panel);
        itemsContainer.append(group);

        const section: Section = { id, index, label, group, button, panel, expanded: false };
        sections.set(id, section);
        item.items!.forEach(child => renderItem(child, inner, section));
        const active = !!activeId && item.items!.some(child => isDestination(child) && !child.disabled && child.id === activeId);
        paintParent(section, active);
        paintSection(section, item.expanded ?? active);
        button.addEventListener("click", event => {
          if (!item.disabled) setExpanded(section, !section.expanded, event);
        });
        mountRipple(button, item.disabled);
      });
    };

    const setItems = (items: DrawerItemConfig[]): void => {
      currentItems = items;
      activeId = initialActive(items);
      renderItems();
    };

    const setBadge = (id: string, badge: string): void => {
      const section = sections.get(id);
      const element = section?.button ?? destinations.find(row => row.element.dataset.id === id)?.element;
      if (!element) return;

      let badgeElement = element.querySelector(`.${cls(DRAWER_CLASSES.ITEM_BADGE)}`);
      if (hasBadge(badge)) {
        if (!badgeElement) {
          badgeElement = document.createElement("span");
          badgeElement.className = cls(DRAWER_CLASSES.ITEM_BADGE);
          element.insertBefore(badgeElement, element.querySelector(`.${cls(DRAWER_CLASSES.ITEM_CHEVRON)}`));
        }
        badgeElement.textContent = badge;
      } else badgeElement?.remove();
      if (section && currentItems[section.index].id !== id) {
        currentItems = currentItems.map((item, index) => index === section.index ? { ...item, badge } : item);
      } else mapItems(item => item.id === id ? { ...item, badge } : item);
    };

    const visibleItems = (container: HTMLElement): HTMLElement[] =>
      [...container.querySelectorAll<HTMLElement>(`.${cls(DRAWER_CLASSES.ITEM)}`)].filter(visible);

    const handleKeydown = (event: KeyboardEvent): void => {
      const { key } = event;
      const items = visibleItems(itemsContainer);
      if (!items.length) return;
      const current = activeElementOf(itemsContainer) as HTMLElement;
      const index = items.indexOf(current);
      let next: HTMLElement | undefined;

      switch (key) {
        case "ArrowDown": next = items[(index + 1) % items.length]; break;
        case "ArrowUp": next = items[index > 0 ? index - 1 : items.length - 1]; break;
        case "Home": next = items[0]; break;
        case "End": next = items.at(-1); break;
        case "Enter":
        case " ":
          if (key === "Enter" && current?.localName === "a" && hasModifiers(event)) return;
          event.preventDefault();
          if (index >= 0) {
            const section = sections.get(current.dataset.id ?? "");
            if (section?.button === current) setExpanded(section, !section.expanded, event);
            else current.click();
          }
          return;
        case "ArrowRight":
        case "ArrowLeft": {
          if (index < 0 || !sections.size) return;
          const opens = key === (itemsContainer.matches(":dir(rtl)") ? "ArrowLeft" : "ArrowRight");
          const section = sections.get(current.dataset.id ?? "");
          const parent = sections.get(current.dataset.parentId ?? "");
          if (section?.button === current) {
            event.preventDefault();
            if (opens && section.expanded) visibleItems(section.panel)[0]?.focus();
            else setExpanded(section, opens, event);
          } else if (!opens && parent && enabled(parent.button)) {
            event.preventDefault();
            parent.button.focus();
          }
          return;
        }
        default: return;
      }
      event.preventDefault();
      next?.focus();
    };
    itemsContainer.addEventListener("keydown", handleKeydown);
    renderItems();

    return {
      ...component,
      itemsContainer,
      drawerItems: {
        setActive,
        getActive: () => activeId,
        setItems,
        getItems: () => currentItems,
        setBadge,
        expandSection: id => setExpanded(sections.get(id), true),
        collapseSection: id => setExpanded(sections.get(id), false),
        toggleSection: id => {
          const section = sections.get(id);
          if (section) setExpanded(section, !section.expanded);
        },
        isSectionExpanded: id => sections.get(id)?.expanded ?? false,
        getExpandedSections: () => [...sections.values()].filter(section => section.expanded).map(section => section.id),
        renderItems,
        destroy: unmountRipples,
      },
    };
  };
