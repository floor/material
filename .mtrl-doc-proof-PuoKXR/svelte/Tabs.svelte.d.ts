import type { Component } from "svelte";
import type { TabsSpec, TabsElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Tabs: Component<SvelteProps<TabsSpec>, { readonly element: TabsElement | null }, Bindable<TabsSpec>>;
export default Tabs;
