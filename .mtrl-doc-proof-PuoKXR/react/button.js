"use client";
import "material/elements/css/progress";
import "material/elements/css/button";
import { buttonElement, defineButton } from "../elements/button.js";
import { createComponent } from "./create.js";
export const Button = /*#__PURE__*/ createComponent(buttonElement.spec, defineButton, "Button");
