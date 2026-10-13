// src/components/menu/features/loader.ts

import type { MenuConfig, MenuContent, MenuFeatureHost } from "../types";

/** What the submenu feature installs, as the rest of the menu calls it. */
export type MenuSubmenuApi = NonNullable<MenuFeatureHost["submenu"]>;

/** What the controller holds: the facade it installs, and the load it starts. */
export interface SubmenuLoader {
  /** Installed as `component.submenu`, before and after the feature arrives. */
  api: MenuSubmenuApi;
  /** Starts fetching the feature. Later calls share the first load. */
  load: () => void;
  /** Drops queued interactions, and destroys the feature if it arrived. */
  destroy: () => void;
}

/** True when an item opens a submenu: the only case that needs the feature. */
export const hasNestedItems = (items: MenuContent[] | undefined): boolean =>
  !!items?.some((item) => "hasSubmenu" in item && item.hasSubmenu === true);

/**
 * Loads the submenu feature on demand.
 *
 * The feature is most of what a menu with nested items adds, and a menu
 * without them never uses it, so it is a chunk of its own rather than part of
 * every menu. The controller starts the load as soon as it sees a nested item
 * -- at creation, or in `setItems` -- so it has normally arrived before the
 * menu is even opened.
 *
 * Until it has, `api` stands in for it. A click, hover or ArrowRight on a
 * nested item is queued and replayed, in order, against the element the user
 * acted on, once the feature is there. Closing the menu drops the queue, as
 * does destroying it; a feature that arrives after `destroy` is not attached.
 * The queries answer "nothing open", which is the truth before the feature
 * exists.
 *
 * The feature gets a lifecycle of its own, destroyed from the controller's,
 * so its cleanup runs where it did when it was composed in the pipe: after
 * the controller's.
 */
export const createSubmenuLoader = (
  config: MenuConfig,
  component: MenuFeatureHost,
): SubmenuLoader => {
  let feature: MenuSubmenuApi | null = null;
  let loading = false;
  let destroyed = false;
  let queue: Array<(submenu: MenuSubmenuApi) => void> = [];
  const lifecycle = { destroy: (): void => {} };

  const load = (): void => {
    if (feature || loading || destroyed) return;
    loading = true;
    import("./submenu").then(
      ({ default: withSubmenu }) => {
        loading = false;
        if (destroyed) return;
        const submenu = withSubmenu(config)({ ...component, lifecycle }).submenu;
        feature = submenu;
        const waiting = queue;
        queue = [];
        waiting.forEach((action) => action(submenu));
      },
      (error: unknown) => {
        // What was waiting for the chunk is dropped; the next interaction
        // with a nested item tries the load again.
        loading = false;
        queue = [];
        console.error("Menu submenu feature failed to load:", error);
      },
    );
  };

  /**
   * Runs an interaction now, or once the feature has arrived. A queued one is
   * skipped if its item left the document meanwhile (`setItems` re-rendered).
   */
  const interact = (
    action: (submenu: MenuSubmenuApi) => void,
    itemElement?: HTMLElement,
  ): void => {
    if (feature) {
      action(feature);
      return;
    }
    if (destroyed) return;
    queue.push((submenu) => {
      if (!itemElement || itemElement.isConnected) action(submenu);
    });
    load();
  };

  /** Closing before the feature exists: nothing is open, so drop what waits. */
  const close = (action: (submenu: MenuSubmenuApi) => void): void => {
    if (feature) action(feature);
    else queue = [];
  };

  const api: MenuSubmenuApi = {
    handleSubmenuClick: (item, index, itemElement) =>
      interact((s) => s.handleSubmenuClick(item, index, itemElement), itemElement),
    handleNestedSubmenuClick: (item, index, itemElement) =>
      interact((s) => s.handleNestedSubmenuClick(item, index, itemElement), itemElement),
    handleSubmenuHover: (item, index, itemElement) =>
      interact((s) => s.handleSubmenuHover(item, index, itemElement), itemElement),
    handleSubmenuLeave: () => interact((s) => s.handleSubmenuLeave()),
    closeSubmenu: (level) => close((s) => s.closeSubmenu(level)),
    closeAllSubmenus: () => close((s) => s.closeAllSubmenus()),
    hasOpenSubmenu: () => feature?.hasOpenSubmenu() ?? false,
    getActiveSubmenus: () => feature?.getActiveSubmenus() ?? [],
  };

  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    queue = [];
    lifecycle.destroy();
  };

  return { api, load, destroy };
};
