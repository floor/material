import type { Component } from "svelte";
import type { TimepickerSpec, TimepickerElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Timepicker: Component<SvelteProps<TimepickerSpec>, { readonly element: TimepickerElement | null }, Bindable<TimepickerSpec>>;
export default Timepicker;
