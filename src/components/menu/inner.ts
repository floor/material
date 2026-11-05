// src/components/menu/inner.ts
//
// The menu a select or a split button holds. It is not a member of either
// component: a public handle on an inner component is what would stop the menu
// from being loaded on demand. The owner keeps it under
// this symbol, for mtrl's own elements and tests. A plain symbol, not a
// registry one: the package ships one copy of this module, which every reader
// imports, so nothing has to spell the key. The description is for the
// browser checks, which run inside the page and find it by that name.
import type { OnDemandMenu } from "./on-demand";
import type { MenuComponent } from "./types";

/** @internal */
export const MENU: unique symbol = Symbol("mtrl.menu");

/**
 * The open that carries which item a keyboard open focuses. `MenuComponent.open`
 * is public API and keeps its two arguments -- a third one would make an
 * optional intent a new public option -- so mtrl's own openers reach the menu
 * through this symbol instead.
 * @internal
 */
export const OPEN_WITH_INITIAL_FOCUS: unique symbol = Symbol("mtrl.openWithInitialFocus");

/** The menu side of the intent. @internal */
export interface InitialFocusOpen {
  [OPEN_WITH_INITIAL_FOCUS](event?: Event, interactionType?: "mouse" | "keyboard", initialFocus?: "first" | "last"): void;
}

/** Opens a menu on its first or last item, for mtrl's own openers. @internal */
export const openWithInitialFocus = (
  menu: MenuComponent,
  event: Event | undefined,
  interactionType: "mouse" | "keyboard" | undefined,
  initialFocus: "first" | "last",
): void => {
  const open = (menu as MenuComponent & Partial<InitialFocusOpen>)[OPEN_WITH_INITIAL_FOCUS];
  // A menu from somewhere that does not carry the symbol still opens: it
  // just focuses the surface, as a plain keyboard open does
  if (open) open.call(menu, event, interactionType, initialFocus);
  else menu.open(event, interactionType);
};

/** What an owner of an inner menu carries. @internal */
export interface MenuOwner {
  [MENU]?: OnDemandMenu;
}

/** The menu inside a select or a split button, if it has one. @internal */
export const innerMenu = (owner: object): OnDemandMenu | undefined => (owner as MenuOwner)[MENU];
