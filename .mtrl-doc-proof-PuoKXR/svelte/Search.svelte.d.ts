import type { Component } from "svelte";
import type { SearchSpec, SearchElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Search: Component<SvelteProps<SearchSpec>, { readonly element: SearchElement | null }, Bindable<SearchSpec>>;
export default Search;
