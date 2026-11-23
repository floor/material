import type { Component } from "svelte";
import type { BadgeSpec, BadgeElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Badge: Component<SvelteProps<BadgeSpec>, { readonly element: BadgeElement | null }, Bindable<BadgeSpec>>;
export default Badge;
