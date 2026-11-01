// src/components/menu/features/on-demand-behaviour.ts
//
// The menu's behaviour -- where it is placed, how keys move inside it, what
// its opener does -- as menu/surface.ts holds it before the chunk arrives.
// The menu itself is not deferred: its element, its items, its ids and its
// listbox ARIA are the menu at creation, and select's open() contract reads
// them on the tick it returns.
//
// Until features/behaviour.ts has arrived, this module stands in for the
// three stages it composes (position, keyboard, opener):
//
// - Placement is a promise, not a guess. The controller asks the stand-in for
//   `whenReady` before placing and revealing the menu
//   (features/controller.ts), so nothing is shown at 0,0 and then moved.
// - A placement or a key that arrives before the chunk is queued and
//   replayed, in order, once it is there. The controller's own call of
//   `setupKeyboardHandlers` at creation is one of those: it is replayed onto
//   the real feature, with the same element, state and actions.
// - The opener's synchronous part stays: the field's aria-haspopup,
//   aria-expanded and aria-controls, and the click and key handlers that open
//   a menu button's menu on its first open, from opener-events.ts -- the same
//   functions the opener feature uses.
//
// Destroying the menu drops what waits; a chunk that arrives afterwards is
// not composed.

import type {
  KeyboardActions,
  KeyboardMenuState,
  MenuConfig,
  MenuFeatureHost,
  MenuOpenerApi,
} from "../types";
import { resolveOpener } from "./opener-target";
import { handleOpenerKeyboard, toggleMenuFromOpener } from "./opener-events";
import { focusWithin } from "./layer";

type PositionFeature = NonNullable<MenuFeatureHost["position"]>;
type KeyboardFeature = NonNullable<MenuFeatureHost["keyboard"]>;

/** The stand-in's positioner: the feature's calls, and the promise to wait on. */
export type DeferredPosition = PositionFeature & {
  /** Runs `action` once the real positioner is there; now if it already is. */
  whenReady: (action: () => void) => void;
};

/** What features/behaviour.ts composes, as the stand-in calls it. */
export interface MenuBehaviour {
  position: PositionFeature;
  keyboard: KeyboardFeature;
  opener: MenuOpenerApi;
}

export interface OnDemandBehaviour {
  /** Installs the stand-in position and keyboard; starts the load on `open`. */
  withPositionAndKeyboard: <C extends MenuFeatureHost>(component: C) => C & {
    position: DeferredPosition;
    keyboard: KeyboardFeature;
  };
  /** Installs the stand-in opener, with the synchronous ARIA and listeners. */
  withOpener: <C extends MenuFeatureHost>(
    component: C,
  ) => C & { opener: MenuOpenerApi };
  /** Drops what waits, and the stand-in's listeners. */
  destroy: () => void;
}

export const createOnDemandBehaviour = (
  config: MenuConfig,
): OnDemandBehaviour => {
  let feature: MenuBehaviour | null = null;
  /** The component the real features are composed onto: the controller ran. */
  let latest: MenuFeatureHost | null = null;
  let loading = false;
  let destroyed = false;
  /** What config.opener names now: the API may replace it before the load. */
  let openerTarget: MenuConfig["opener"] = config.opener;
  const positions: Array<(position: PositionFeature) => void> = [];
  const keyboards: Array<(keyboard: KeyboardFeature) => void> = [];
  const openers: Array<(opener: MenuOpenerApi) => void> = [];
  const ready: Array<() => void> = [];
  /** The opener element the stand-in listens on and writes ARIA to. */
  let standInElement: HTMLElement | null = null;
  let standInListening = false;
  const standInTimers = new Set<ReturnType<typeof setTimeout>>();

  const later = (action: () => void, delay: number): void => {
    const timer = setTimeout(() => {
      standInTimers.delete(timer);
      action();
    }, delay);
    standInTimers.add(timer);
  };

  const standInClick = (e: MouseEvent): void => {
    if (latest) toggleMenuFromOpener(latest, e);
  };

  const standInKeydown = (e: KeyboardEvent): void => {
    if (latest) handleOpenerKeyboard(latest, e, later);
  };

  /** The opener feature's blur rule, without the Tab tracking it keeps. */
  const standInBlur = (e: FocusEvent): void => {
    const menu = latest?.menu;
    if (!menu || !menu.isOpen()) return;
    const related = e.relatedTarget as HTMLElement | null;
    if (related && latest) {
      if (focusWithin(config, latest.element, related)) return;
      if (
        related.getAttribute("aria-haspopup") === "true" ||
        related.closest('[aria-haspopup="true"]')
      ) {
        return;
      }
    }
    later(() => {
      if (latest?.menu?.isOpen()) latest.menu.close(e, false);
    }, 50);
  };

  const listenOn = (element: HTMLElement): void => {
    if (standInListening || config.manualOpen) return;
    element.addEventListener("click", standInClick);
    element.addEventListener("keydown", standInKeydown);
    element.addEventListener("blur", standInBlur);
    standInListening = true;
  };

  const stopListening = (): void => {
    if (!standInElement || !standInListening) return;
    standInElement.removeEventListener("click", standInClick);
    standInElement.removeEventListener("keydown", standInKeydown);
    standInElement.removeEventListener("blur", standInBlur);
    standInListening = false;
  };

  /**
   * What the opener feature sets for a menu button at creation, before any
   * chunk: the field names the menu it controls. A listbox popup belongs to a
   * combobox, which carries its own ARIA.
   */
  const installStandIn = (component: MenuFeatureHost): void => {
    standInElement = resolveOpener(openerTarget).element;
    if (!standInElement) return;
    listenOn(standInElement);
    if (config.listbox) return;

    standInElement.setAttribute("aria-haspopup", "true");
    standInElement.setAttribute("aria-expanded", "false");

    let menuId = component.element.id;
    if (!menuId) {
      menuId = `menu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      component.element.id = menuId;
    }
    standInElement.setAttribute("aria-controls", menuId);
  };

  /** The opener feature's cleanup of the attributes it set. */
  const removeStandInAttributes = (): void => {
    if (!standInElement || config.listbox) return;
    standInElement.removeAttribute("aria-haspopup");
    standInElement.removeAttribute("aria-expanded");
    standInElement.removeAttribute("aria-controls");
  };

  const load = (): void => {
    if (feature || loading || destroyed || !latest) return;
    loading = true;
    import("./behaviour").then(
      ({ createBehaviour }) => {
        loading = false;
        if (destroyed || !latest) return;
        const component = latest;
        stopListening();
        const behaviour = createBehaviour(
          { ...config, opener: openerTarget },
          component,
        );
        feature = behaviour;

        // The first open emitted while the chunk was arriving: that event is
        // in the past, and the opener feature's own `open` listener missed
        // it. Say what it would have said.
        const open = component.menu?.isOpen() ?? false;
        if (open) {
          resolveOpener(openerTarget).element?.setAttribute(
            "aria-expanded",
            "true",
          );
          behaviour.opener.setActive(true);
        }

        positions.splice(0).forEach((action) => action(behaviour.position));
        keyboards.splice(0).forEach((action) => action(behaviour.keyboard));
        openers.splice(0).forEach((action) => action(behaviour.opener));
        ready.splice(0).forEach((action) => action());
      },
      (error: unknown) => {
        loading = false;
        console.error("Menu behaviour failed to load:", error);
      },
    );
  };

  const callPosition = (
    action: (position: PositionFeature) => void,
  ): void => {
    if (feature) {
      action(feature.position);
      return;
    }
    if (destroyed) return;
    positions.push(action);
    load();
  };

  const callKeyboard = (
    action: (keyboard: KeyboardFeature) => void,
    startLoad: boolean,
  ): void => {
    if (feature) {
      action(feature.keyboard);
      return;
    }
    if (destroyed) return;
    keyboards.push(action);
    if (startLoad) load();
  };

  const callOpener = (action: (opener: MenuOpenerApi) => void): void => {
    if (feature) {
      action(feature.opener);
      return;
    }
    if (destroyed) return;
    openers.push(action);
  };

  const teardown = (): void => {
    if (destroyed) return;
    destroyed = true;
    stopListening();
    removeStandInAttributes();
    for (const timer of standInTimers) clearTimeout(timer);
    standInTimers.clear();
    positions.length = 0;
    keyboards.length = 0;
    openers.length = 0;
    ready.length = 0;
  };

  const withPositionAndKeyboard = <C extends MenuFeatureHost>(component: C) => {
    const position: DeferredPosition = {
      positionMenu: (openerElement) =>
        callPosition((position) => position.positionMenu(openerElement)),
      positionSubmenu: (submenuElement, parentItemElement, level) =>
        callPosition((position) =>
          position.positionSubmenu(submenuElement, parentItemElement, level),
        ),
      whenReady: (action) => {
        if (feature) {
          action();
          return;
        }
        if (destroyed) return;
        ready.push(action);
        load();
      },
    };

    const keyboard: KeyboardFeature = {
      // The controller's call at creation: queued, not a reason to load.
      setupKeyboardHandlers: (
        element: HTMLElement,
        state: KeyboardMenuState,
        actions: KeyboardActions,
      ) =>
        callKeyboard(
          (keyboard) => keyboard.setupKeyboardHandlers(element, state, actions),
          false,
        ),
      removeKeyboardHandlers: (element: HTMLElement) =>
        callKeyboard(
          (keyboard) => keyboard.removeKeyboardHandlers(element),
          false,
        ),
      handleMenuKeydown: (
        e: KeyboardEvent,
        state: KeyboardMenuState,
        actions: KeyboardActions,
      ) =>
        callKeyboard(
          (keyboard) => keyboard.handleMenuKeydown(e, state, actions),
          true,
        ),
      handleInitialFocus: (
        element: HTMLElement,
        interactionType: "keyboard" | "mouse",
      ) =>
        callKeyboard(
          (keyboard) => keyboard.handleInitialFocus(element, interactionType),
          true,
        ),
    };

    // The first open starts the load. It is emitted on the tick open()
    // returns, before the menu is placed.
    component.on("open", () => {
      load();
    });

    if (component.lifecycle) {
      const originalDestroy = component.lifecycle.destroy;
      component.lifecycle.destroy = () => {
        teardown();
        originalDestroy.call(component.lifecycle);
      };
    }

    return { ...component, position, keyboard };
  };

  const withOpener = <C extends MenuFeatureHost>(component: C) => {
    latest = component;
    const opener: MenuOpenerApi = {
      setOpener: (target) => {
        if (feature) {
          feature.opener.setOpener(target);
          return;
        }
        // The API accepts any OpenerTarget; the config type names the three
        // shapes resolveOpener resolves first (opener-target.ts).
        openerTarget = target as MenuConfig["opener"];
        stopListening();
        installStandIn(component);
      },
      getOpener: () =>
        feature
          ? feature.opener.getOpener()
          : resolveOpener(openerTarget).element,
      getOpenerComponent: () =>
        feature
          ? feature.opener.getOpenerComponent()
          : resolveOpener(openerTarget).component,
      setActive: (active) => callOpener((opener) => opener.setActive(active)),
      focus: () => {
        if (feature) {
          feature.opener.focus();
          return;
        }
        const { element, component: openerComponent } =
          resolveOpener(openerTarget);
        if (openerComponent && typeof openerComponent.focus === "function") {
          openerComponent.focus();
          return;
        }
        element?.focus();
      },
    };

    installStandIn(component);

    // The synchronous half of what the opener feature does on these events:
    // a menu button's field says its menu is open before the menu is placed.
    component.on("open", () => {
      if (standInElement && !config.listbox) {
        standInElement.setAttribute("aria-expanded", "true");
      }
    });
    component.on("close", () => {
      if (standInElement && !config.listbox) {
        standInElement.setAttribute("aria-expanded", "false");
      }
    });

    return { ...component, opener };
  };

  return {
    withPositionAndKeyboard,
    withOpener,
    destroy: teardown,
  };
};
