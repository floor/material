import type { Component } from "svelte";
import type { CarouselSpec, CarouselElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Carousel: Component<SvelteProps<CarouselSpec>, { readonly element: CarouselElement | null }, Bindable<CarouselSpec>>;
export default Carousel;
