// src/components/split-button/api.ts
import {
  BaseComponent,
  SplitButtonComponent,
  SplitButtonConfig,
  SplitButtonEvent,
  SplitButtonEventType,
} from "./types";
import type { MenuContent } from "../menu/types";
import { MENU, type MenuOwner } from "../menu/inner";
import { makeMenu } from "./features/menu";
import type { OnDemandMenu } from "../menu/on-demand";
import { SPLIT_BUTTON_CLASSES, SPLIT_BUTTON_EVENTS } from "./constants";

interface ApiOptions {
  config: SplitButtonConfig;
  lifecycle: { destroy: () => void };
}

/**
 * Adds the public API and wires the two buttons together
 * @param {ApiOptions} options - API configuration
 * @returns {Function} Higher-order function that adds the API
 */
export const withAPI =
  ({ config, lifecycle }: ApiOptions) =>
  (component: BaseComponent): SplitButtonComponent => {
    const element = component.element;
    const prefix = config.prefix || "mtrl";
    const { leading, trailing } = component;
    let menu = component[MENU];
    const expandedClass = `${prefix}-${SPLIT_BUTTON_CLASSES.EXPANDED}`;

    let expanded = false;
    let destroyed = false;
    // Set while ArrowUp waits for the menu to show, cleared by destroy()
    let focusLastTimer: ReturnType<typeof setTimeout> | null = null;

    const emit = (type: SplitButtonEventType, extra: Partial<SplitButtonEvent> = {}): void => {
      component.emit?.(type, {
        splitButton: api,
        expanded,
        originalEvent: null,
        ...extra,
      });
    };

    const setExpanded = (
      next: boolean,
      originalEvent: Event | null = null,
      interactionType?: "keyboard" | "mouse",
    ): void => {
      if (expanded === next) return;
      expanded = next;
      element.classList.toggle(expandedClass, expanded);
      trailing.element.setAttribute("aria-expanded", String(expanded));

      if (menu) {
        // The interaction type decides where the menu puts focus: the first
        // item for a key, the surface for the pointer.
        if (expanded) menu.open(originalEvent ?? undefined, interactionType);
        else menu.close(originalEvent ?? undefined);
      }

      emit(expanded ? SPLIT_BUTTON_EVENTS.EXPAND : SPLIT_BUTTON_EVENTS.COLLAPSE, { originalEvent });
      emit(SPLIT_BUTTON_EVENTS.CHANGE, { originalEvent });
    };

    const api: SplitButtonComponent & MenuOwner = {
      element,
      leadingElement: leading.element as HTMLButtonElement,
      trailingElement: trailing.element as HTMLButtonElement,
      // Not a member: mtrl's own elements and tests reach it here
      [MENU]: menu,

      setItems(items: MenuContent[]): SplitButtonComponent {
        // Destroyed, it must not create a menu nobody would destroy
        if (destroyed) return this;
        if (menu) menu.setItems(items);
        else if (items.length) {
          wire((api[MENU] = menu = makeMenu(config, trailing.element, items)));
          if (expanded) menu.open();
        }
        return this;
      },

      getItems(): MenuContent[] {
        return menu ? menu.getItems() : [];
      },

      setText(text: string): SplitButtonComponent {
        leading.setText(text);
        return this;
      },

      getText(): string {
        return leading.getText();
      },

      setIcon(icon: string): SplitButtonComponent {
        leading.setIcon(icon);
        return this;
      },

      expand(): SplitButtonComponent {
        setExpanded(true);
        return this;
      },

      collapse(): SplitButtonComponent {
        setExpanded(false);
        return this;
      },

      isExpanded(): boolean {
        return expanded;
      },

      disable(): SplitButtonComponent {
        leading.disable();
        trailing.disable();
        return this;
      },

      enable(): SplitButtonComponent {
        leading.enable();
        trailing.enable();
        return this;
      },

      isDisabled(): boolean {
        return (leading.element as HTMLButtonElement).disabled === true;
      },

      on(event: SplitButtonEventType, handler: (event: SplitButtonEvent) => void): SplitButtonComponent {
        component.on?.(event, handler as (...args: unknown[]) => void);
        return this;
      },

      off(event: SplitButtonEventType, handler: (event: SplitButtonEvent) => void): SplitButtonComponent {
        component.off?.(event, handler as (...args: unknown[]) => void);
        return this;
      },

      destroy(): void {
        destroyed = true;
        if (focusLastTimer !== null) clearTimeout(focusLastTimer);
        focusLastTimer = null;
        trailing.element.removeEventListener("keydown", handleTrailingKeydown);
        menu?.destroy?.();
        leading.destroy();
        trailing.destroy();
        element.remove();
        lifecycle.destroy();
      },
    };

    // The leading button carries the action
    // Same payload/event confusion as dialog and button-group: this stored
    // the whole payload in `originalEvent`, which is declared `Event`.
    leading.on("click", ({ originalEvent: event }) => {
      emit(SPLIT_BUTTON_EVENTS.CLICK, { originalEvent: event });
    });

    // The trailing button opens and closes what it opens. A click a key
    // produces is a MouseEvent too, but it carries no pointer count: Enter,
    // Space and a programmatic activation leave detail at 0, a pointer click
    // counts the clicks. The menu focuses its first item only for a keyboard
    // open, so it has to hear which one this was.
    const interactionOf = (event: Event | null): "keyboard" | "mouse" =>
      event instanceof MouseEvent && event.detail === 0 ? "keyboard" : "mouse";

    trailing.on("click", ({ originalEvent: event }) => {
      setExpanded(!expanded, event, interactionOf(event));
    });

    // ArrowDown and ArrowUp on a closed trailing button open the menu on its
    // first and last item, which is what the menu's own opener does with them
    // (menu/features/opener.ts). Enter and Space arrive as the click above.
    const focusLastItem = (): void => {
      // A menu closed again before its chunk arrived has no last item to
      // focus, and an item of a closed menu would take focus nowhere.
      if (!expanded || !menu?.isOpen()) return;
      const surface = menu.element;
      const items = surface.querySelectorAll<HTMLElement>(
        `.${prefix}-menu__item:not(.${prefix}-menu__item--disabled)`,
      );
      items[items.length - 1]?.focus();
    };
    const handleTrailingKeydown = (event: KeyboardEvent): void => {
      const openFirst = event.key === "ArrowDown" || event.key === "Down";
      const openLast = event.key === "ArrowUp" || event.key === "Up";
      if (!openFirst && !openLast) return;
      event.preventDefault();
      if (expanded) return;
      setExpanded(true, event, "keyboard");
      if (!openLast) return;
      // The menu's own initial focus lands on the first item 100 ms after it
      // shows. Focusing the last before that timer runs leaves focus where it
      // is: the menu keeps focus that is already inside it.
      menu?.whenReady?.(() => {
        focusLastTimer = setTimeout(() => {
          focusLastTimer = null;
          focusLastItem();
        }, 100);
      });
    };
    trailing.element.addEventListener("keydown", handleTrailingKeydown);

    // A menu closed from the outside, by Escape or a click elsewhere, has to
    // bring the button's state back with it
    // Runs for the menu made at creation, or by the first setItems
    const wire = (menu: OnDemandMenu): void => {
      // A trailing button that opens this component's own menu says so. The
      // menu's opener wiring sets a plain "true", so this comes after it.
      trailing.element.setAttribute("aria-haspopup", "menu");
      menu.on?.("close", () => {
        if (!expanded) return;
        expanded = false;
        element.classList.remove(expandedClass);
        trailing.element.setAttribute("aria-expanded", "false");
        emit(SPLIT_BUTTON_EVENTS.COLLAPSE);
        emit(SPLIT_BUTTON_EVENTS.CHANGE);
      });
      menu.on?.("select", (event: { item?: MenuContent }) => {
        const item = event?.item;
        emit(SPLIT_BUTTON_EVENTS.SELECT, { item, value: item && "id" in item ? (item.id ?? null) : null });
      });
    };
    if (menu) wire(menu);

    // Configured callbacks
    if (config.onClick) api.on(SPLIT_BUTTON_EVENTS.CLICK, config.onClick);
    if (config.onSelect) api.on(SPLIT_BUTTON_EVENTS.SELECT, config.onSelect);
    if (config.on) {
      for (const [type, handler] of Object.entries(config.on)) {
        if (handler) api.on(type as SplitButtonEventType, handler);
      }
    }

    return api;
  };
