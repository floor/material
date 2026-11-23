import type { Component } from "svelte";
import type { ListSpec, ListElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const List: Component<SvelteProps<ListSpec>, { readonly element: ListElement | null }, Bindable<ListSpec>>;
export default List;
