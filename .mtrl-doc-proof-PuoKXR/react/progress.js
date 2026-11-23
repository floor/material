"use client";
import "material/elements/css/progress";
import { progressElement, defineProgress } from "../elements/progress.js";
import { createComponent } from "./create.js";
export const Progress = /*#__PURE__*/ createComponent(progressElement.spec, defineProgress, "Progress");
