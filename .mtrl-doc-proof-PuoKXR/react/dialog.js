"use client";
import "material/elements/css/progress";
import "material/elements/css/button";
import "material/elements/css/divider";
import "material/elements/css/dialog";
import { dialogElement, defineDialog } from "../elements/dialog.js";
import { createComponent } from "./create.js";
export const Dialog = /*#__PURE__*/ createComponent(dialogElement.spec, defineDialog, "Dialog");
