import type { Component } from "svelte";
import type { MenuSpec, MenuElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Menu: Component<SvelteProps<MenuSpec>, { readonly element: MenuElement | null }, Bindable<MenuSpec>>;
export default Menu;
