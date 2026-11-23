import { createBarSpec } from "./app-bar.js";
import { defineElement } from "./define.js";
const topAppBarSpec = createBarSpec("top-app-bar");
export const topAppBarElement = defineElement(topAppBarSpec);
export const defineTopAppBar = (options) => topAppBarElement.define(options);
