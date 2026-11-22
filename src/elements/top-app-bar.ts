// src/elements/top-app-bar.ts
/**
 * `<m-top-app-bar>`: the app bar under its old name, kept for 3.x. The rules
 * are `createBarSpec`'s, in app-bar.ts; see `<m-app-bar>`.
 *
 * @deprecated use `<m-app-bar>`. Material Design 3 names the component the
 * app bar.
 *
 * Parts: `top-app-bar`, `leading`, `headline`, `trailing`.
 *
 * @module elements
 */

import type { AppBarComponent } from "../components/top-app-bar/top-app-bar";
import { createBarSpec } from "./app-bar";
import { defineElement, type DefineOptions, type ElementInstance } from "./define";

const topAppBarSpec = createBarSpec("top-app-bar");
export const topAppBarElement = defineElement<AppBarComponent>(topAppBarSpec);
/** @deprecated use `AppBarSpec`. */
export type TopAppBarSpec = typeof topAppBarSpec;
/** @deprecated use `AppBarElement`. */
export type TopAppBarElement = ElementInstance<TopAppBarSpec, AppBarComponent>;

/**
 * @deprecated use `defineAppBar`. Registers `<m-top-app-bar>` (or
 * `<prefix-top-app-bar>`).
 */
export const defineTopAppBar = (options?: DefineOptions): string => topAppBarElement.define(options);

declare global {
  /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
  interface HTMLElementTagNameMap {
    /** @deprecated use `m-app-bar`. */
    "m-top-app-bar": TopAppBarElement;
  }
}
