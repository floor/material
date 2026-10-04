// src/components/button/index.ts

/**
 * Button component module
 * @module components/button
 */

export { default, default as createButton } from "./button";
export type { ButtonConfig, ButtonComponent, ButtonVariant, ButtonChangePayload } from "./types";
// The event map `on` and `off` are typed with
export type { ButtonEvents } from "./types";
export type { ButtonSize, ButtonShape } from "./constants";
