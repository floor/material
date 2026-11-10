// src/core/navigation/collection.ts
/**
 * The destination list the navigation bar and the navigation rail keep: the
 * render, the focus retained across a re-render, the click-to-model mapping
 * and the setters that repaint one item or the selection. Each component
 * passes only its two differences: the rail's focus fallback when no enabled
 * destination remains, and the bar's item count for its layout modifier.
 * The rail's modal and expansion lifecycles and the bar's visibility stay
 * outside. Internal: core/navigation has no index, so it is no public subpath.
 */
import { activeElementOf } from "../dom/focus";
import {
  copyDestinations, createDestination, updateBadge, updateSelection,
  type DestinationConfig, type PartClass,
} from "./destinations";

/** What a destination click carries once it lands on an enabled destination. */
export interface DestinationSelection {
  id: string;
  value: string;
  index: number;
  originalEvent: MouseEvent;
}

export interface DestinationCollectionOptions {
  /** The component's part-class function. */
  cls: PartClass;
  /** The component name `copyDestinations` names in its error. */
  name: string;
  items: DestinationConfig[];
  /** The rail's toggle: focused when no enabled destination remains. The bar has none. */
  fallbackFocus?: () => HTMLElement | null;
  /** The bar's item count, called after every render. */
  count?: (count: number) => void;
}

export interface DestinationCollection {
  /** The `__items` container, appended by the caller where its DOM order wants it. */
  container: HTMLElement;
  nodes: Map<string, HTMLElement>;
  /** Builds every destination element from the current items and restores focus. */
  render(): void;
  /** Replaces the items (validated and copied) and renders. */
  replace(items: DestinationConfig[]): void;
  /** Marks one destination active, silently; `null` clears the selection. */
  setActive(id: string | null): void;
  setBadge(id: string, badge: DestinationConfig["badge"], label?: string): void;
  activeId(): string | null;
  /** A copy of the items, for the components' getItems. */
  snapshot(): DestinationConfig[];
  /**
   * The click's destination as the select detail, or null when the click is
   * outside, on a disabled destination (prevented) or a modified link
   * (left to native navigation).
   */
  selectDetail(event: MouseEvent): DestinationSelection | null;
  destroy(): void;
}

export const createDestinationCollection = (options: DestinationCollectionOptions): DestinationCollection => {
  const cls = options.cls;
  let items = copyDestinations(options.items, options.name);
  let destroyed = false;
  const nodes = new Map<string, HTMLElement>();
  const container = document.createElement("div");
  container.className = cls("__items");
  const firstEnabled = (): HTMLElement | undefined =>
    [...nodes.values()].find((element) => !element.hasAttribute("aria-disabled"));
  const paintSelection = (): void => updateSelection(items, nodes, cls);
  const render = (): void => {
    const focusedId = [...nodes].find(([, element]) => element === activeElementOf(container))?.[0];
    nodes.clear();
    container.replaceChildren();
    for (const item of items) {
      const element = createDestination(item, cls);
      nodes.set(item.id, element);
      container.append(element);
    }
    paintSelection();
    options.count?.(items.length);
    if (focusedId) {
      const previous = nodes.get(focusedId);
      const target = previous && !previous.hasAttribute("aria-disabled")
        ? previous
        : firstEnabled() || options.fallbackFocus?.();
      target?.focus();
    }
  };
  return {
    container,
    nodes,
    render,
    replace(value) {
      if (destroyed) return;
      items = copyDestinations(value, options.name);
      render();
    },
    setActive(id) {
      if (destroyed || (id !== null && !items.some((item) => item.id === id && !item.disabled))) return;
      items = items.map((item) => ({ ...item, active: item.id === id }));
      paintSelection();
    },
    setBadge(id, badge, label) {
      if (destroyed) return;
      const item = items.find((entry) => entry.id === id);
      if (item) {
        item.badge = badge;
        item.badgeLabel = label;
        updateBadge(item, nodes.get(id)!, cls);
      }
    },
    activeId: () => items.find((item) => item.active)?.id || null,
    snapshot: () => items.map((item) => ({ ...item })),
    selectDetail(event) {
      const element = (event.target as Element).closest<HTMLElement>(`.${cls("__item")}`);
      if (!element || !container.contains(element)) return null;
      const index = items.findIndex((item) => nodes.get(item.id) === element), item = items[index];
      if (!item || item.disabled) {
        event.preventDefault();
        return null;
      }
      if (item.href && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)) return null;
      return { id: item.id, value: item.id, index, originalEvent: event };
    },
    destroy() {
      destroyed = true;
      nodes.clear();
    },
  };
};
