import type { Component } from "svelte";
import type { SnackbarSpec, SnackbarElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Snackbar: Component<SvelteProps<SnackbarSpec>, { readonly element: SnackbarElement | null }, Bindable<SnackbarSpec>>;
export default Snackbar;
