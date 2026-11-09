// With material/solid/jsx, the bare tags and their prop: and on: forms type-check in Solid's JSX.
// Solid types prop: and on: for every tag at once: on:change is any element's change.
import type {} from "../../../src/solid/jsx";
import type { JSX } from "solid-js";
import type { ElementEvents } from "../../../src/elements";
import type { ToolbarSpec } from "../../../src/elements/toolbar";
import type { SnackbarSpec } from "../../../src/elements/snackbar";

export const typed = <m-switch checked supporting-text="Help" class="x" prop:checked={true} on:change={(event) => void event.detail} />;
export const declaration = <m-tabs value="t1"><m-tab value="t1">One</m-tab></m-tabs>;
// @ts-expect-error -- checked is a boolean
export const wrong = <m-switch checked="yes" />;
// The slot attribute is markup too
export const label = <m-button label="Save" />;
export const host = <m-button popover="auto" inputMode="numeric" enterkeyhint="send" itemProp="name" nonce="abc" />;

// ToolbarSpec's own events must survive the generated distributive Ev aliases.
type Assert<T extends true> = T;
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
export type ToolbarCollapseInSolid = Assert<ElementEvents<ToolbarSpec>["collapse"] extends JSX.CustomEvents["collapse"] ? true : false>;
export type ToolbarExpandInSolid = Assert<ElementEvents<ToolbarSpec>["expand"] extends JSX.CustomEvents["expand"] ? true : false>;
export type SolidCollapsePayload = Assert<Equals<JSX.CustomEvents["collapse"]["detail"], null>>;
export type SolidExpandPayload = Assert<Equals<JSX.CustomEvents["expand"]["detail"], null>>;
export const toolbar = <m-toolbar scroll-behavior="collapse" on:collapse={(event) => {
  const fromToolbar: ElementEvents<ToolbarSpec>["collapse"] = event;
  void fromToolbar;
  // @ts-expect-error -- collapse has a null payload, never an untyped value
  void event.detail.value;
}} on:expand={(event) => {
  const fromToolbar: ElementEvents<ToolbarSpec>["expand"] = event;
  void fromToolbar;
  // @ts-expect-error -- expand has a null payload, never an untyped value
  void event.detail.value;
}} />;

// SnackbarSpec's shortcut event survives regeneration with the shared Ev alias.
export type SnackbarFocusInSolid = Assert<ElementEvents<SnackbarSpec>["focus"] extends JSX.CustomEvents["focus"] ? true : false>;
export type SolidFocusPayload = Assert<Equals<JSX.CustomEvents["focus"]["detail"], null>>;
export const snackbar = <m-snackbar focus-shortcut="F8" on:focus={(event) => {
  const fromSnackbar: ElementEvents<SnackbarSpec>["focus"] = event;
  void fromSnackbar;
  // @ts-expect-error -- the element focus event has a null payload
  void event.detail.value;
}} />;
