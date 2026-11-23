import type { Component } from "svelte";
import type { SwitchSpec, SwitchElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Switch: Component<SvelteProps<SwitchSpec>, { readonly element: SwitchElement | null }, Bindable<SwitchSpec>>;
export default Switch;
