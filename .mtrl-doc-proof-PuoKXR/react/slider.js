"use client";
import "material/elements/css/slider";
import { sliderElement, defineSlider } from "../elements/slider.js";
import { createComponent } from "./create.js";
export const Slider = /*#__PURE__*/ createComponent(sliderElement.spec, defineSlider, "Slider");
