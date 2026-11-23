import type { Component } from "svelte";
import type { CardSpec, CardElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Card: Component<SvelteProps<CardSpec>, { readonly element: CardElement | null }, Bindable<CardSpec>>;
export default Card;
