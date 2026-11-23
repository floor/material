import type { Component } from "svelte";
import type { DialogSpec, DialogElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Dialog: Component<SvelteProps<DialogSpec>, { readonly element: DialogElement | null }, Bindable<DialogSpec>>;
export default Dialog;
