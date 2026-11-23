import type { OnDemandMenu } from "./on-demand.js";
export declare const MENU: unique symbol;
/** What an owner of an inner menu carries. */
export interface MenuOwner {
    [MENU]?: OnDemandMenu;
}
/** The menu inside a select or a split button, if it has one. */
export declare const innerMenu: (owner: object) => OnDemandMenu | undefined;
