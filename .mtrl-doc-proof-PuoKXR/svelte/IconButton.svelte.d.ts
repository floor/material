import type { Component } from "svelte";
import type { IconButtonSpec, IconButtonElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const IconButton: Component<SvelteProps<IconButtonSpec>, { readonly element: IconButtonElement | null }, Bindable<IconButtonSpec>>;
export default IconButton;
