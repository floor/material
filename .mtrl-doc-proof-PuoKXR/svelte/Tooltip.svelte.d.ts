import type { Component } from "svelte";
import type { TooltipSpec, TooltipElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Tooltip: Component<SvelteProps<TooltipSpec>, { readonly element: TooltipElement | null }, Bindable<TooltipSpec>>;
export default Tooltip;
