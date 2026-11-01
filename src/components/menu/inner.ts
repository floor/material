// src/components/menu/inner.ts
//
// The menu a select or a split button holds. It is not a member of either
// component: a public handle on an inner component is what would stop the menu
// from being loaded on demand. The owner keeps it under
// this symbol, for mtrl's own elements and tests. A plain symbol, not a
// registry one: the package ships one copy of this module, which every reader
// imports, so nothing has to spell the key. The description is for the
// browser checks, which run inside the page and find it by that name.
import type { MenuComponent } from "./types";

/** @internal */
export const MENU: unique symbol = Symbol("mtrl.menu");

/** What an owner of an inner menu carries. @internal */
export interface MenuOwner {
  [MENU]?: MenuComponent;
}

/** The menu inside a select or a split button, if it has one. @internal */
export const innerMenu = (owner: object): MenuComponent | undefined => (owner as MenuOwner)[MENU];

/**
 * Set in the configuration of a menu whose surface is rendered inside its own
 * element's shadow root (`src/elements/menu.ts`). The opener sits outside that
 * root and an IDREF does not cross a shadow boundary, so the menu writes it no
 * `aria-controls`: the reference would dangle. What the opener opens is
 * declared by the element that owns it, as the toolbar's overflow button
 * declares `aria-haspopup` and `aria-expanded` itself. A factory menu's
 * surface moves into the document, or beside the opener, when it opens, and
 * its id does resolve there.
 * @internal
 */
export const SHADOW_SURFACE: unique symbol = Symbol("mtrl.menu.shadowSurface");

/** A menu configuration carrying mtrl's own options. @internal */
export type InternalMenuConfig = { [SHADOW_SURFACE]?: boolean };
