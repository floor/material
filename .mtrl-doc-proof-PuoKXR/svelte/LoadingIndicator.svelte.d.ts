import type { Component } from "svelte";
import type { LoadingIndicatorSpec, LoadingIndicatorElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const LoadingIndicator: Component<SvelteProps<LoadingIndicatorSpec>, { readonly element: LoadingIndicatorElement | null }, Bindable<LoadingIndicatorSpec>>;
export default LoadingIndicator;
