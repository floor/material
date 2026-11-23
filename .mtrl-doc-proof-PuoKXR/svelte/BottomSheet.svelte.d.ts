import type { Component } from "svelte";
import type { BottomSheetSpec, BottomSheetElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const BottomSheet: Component<SvelteProps<BottomSheetSpec>, { readonly element: BottomSheetElement | null }, Bindable<BottomSheetSpec>>;
export default BottomSheet;
