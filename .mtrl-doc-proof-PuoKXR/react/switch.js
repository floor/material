"use client";
import "material/elements/css/switch";
import { switchElement, defineSwitch } from "../elements/switch.js";
import { createComponent } from "./create.js";
export const Switch = /*#__PURE__*/ createComponent(switchElement.spec, defineSwitch, "Switch");
