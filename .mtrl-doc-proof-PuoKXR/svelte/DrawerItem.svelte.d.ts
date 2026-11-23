import type { Component } from "svelte";
import type { DrawerItemAttributes } from "../elements/index.js";
import type { DeclarationProps } from "./runtime.js";
/** @deprecated Material Design 3 names this the navigation drawer. Use NavigationDrawerItem instead. */
declare const DrawerItem: Component<DeclarationProps<DrawerItemAttributes>>;
export default DrawerItem;
