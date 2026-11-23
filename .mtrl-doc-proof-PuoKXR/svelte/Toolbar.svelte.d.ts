import type { Component } from "svelte";
import type { ToolbarSpec, ToolbarElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Toolbar: Component<SvelteProps<ToolbarSpec>, { readonly element: ToolbarElement | null }, Bindable<ToolbarSpec>>;
export default Toolbar;
