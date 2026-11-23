"use client";
import "material/elements/css/tooltip";
import { tooltipElement, defineTooltip } from "../elements/tooltip.js";
import { createComponent } from "./create.js";
export const Tooltip = /*#__PURE__*/ createComponent(tooltipElement.spec, defineTooltip, "Tooltip");
