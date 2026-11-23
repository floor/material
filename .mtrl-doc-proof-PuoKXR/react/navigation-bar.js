"use client";
import "material/elements/css/navigation-bar";
import { navigationBarElement, defineNavigationBar } from "../elements/navigation-bar.js";
import { createComponent } from "./create.js";
export const NavigationBar = /*#__PURE__*/ createComponent(navigationBarElement.spec, defineNavigationBar, "NavigationBar");
