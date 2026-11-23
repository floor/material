import type { Component } from "svelte";
import type { BottomAppBarSpec, BottomAppBarElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
/** @deprecated Material Design 3 Expressive replaces the bottom app bar with the docked toolbar. Use Toolbar with variant="docked" placement="bottom" instead. A centred FAB, adding a FAB after creation, a custom transition duration and a custom tag are not yet available on the docked toolbar. */
declare const BottomAppBar: Component<SvelteProps<BottomAppBarSpec>, { readonly element: BottomAppBarElement | null }, Bindable<BottomAppBarSpec>>;
export default BottomAppBar;
