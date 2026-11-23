import type { Component } from "svelte";
import type { ProgressSpec, ProgressElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Progress: Component<SvelteProps<ProgressSpec>, { readonly element: ProgressElement | null }, Bindable<ProgressSpec>>;
export default Progress;
