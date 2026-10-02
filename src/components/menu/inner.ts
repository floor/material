// src/components/menu/inner.ts
//
// The menu a select or a split button holds. It is not a member of either
// component: a public handle on an inner component is what would stop the menu
// from being loaded on demand (FLO-543, FLO-544). The owner keeps it under
// this symbol, for mtrl's own elements and tests. A registry symbol: the
// package's entries are bundled apart, and each copy of this module has to
// name the same key.
import type { MenuComponent } from "./types";

/** @internal */
export const MENU: unique symbol = Symbol.for("mtrl.menu");

/** What an owner of an inner menu carries. @internal */
export interface MenuOwner {
  [MENU]?: MenuComponent;
}

/** The menu inside a select or a split button, if it has one. @internal */
export const innerMenu = (owner: object): MenuComponent | undefined => (owner as MenuOwner)[MENU];
