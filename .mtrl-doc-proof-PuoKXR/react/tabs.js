"use client";
import "material/elements/css/badge";
import "material/elements/css/progress";
import "material/elements/css/button";
import "material/elements/css/tabs";
import { tabsElement, defineTabs } from "../elements/tabs.js";
import { createComponent } from "./create.js";
export const Tabs = /*#__PURE__*/ createComponent(tabsElement.spec, defineTabs, "Tabs");
