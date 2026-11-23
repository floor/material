import type { Component } from "svelte";
import type { DatepickerSpec, DatepickerElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Datepicker: Component<SvelteProps<DatepickerSpec>, { readonly element: DatepickerElement | null }, Bindable<DatepickerSpec>>;
export default Datepicker;
