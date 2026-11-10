/**
 * Opt-in client-only fixed filled/small/round button. Import its shadow and
 * pre-upgrade styles separately. Visual attributes are inert; visual properties
 * always read the fixed value, and visual setter calls are inert and chainable.
 * Use the general button definition for a mutable visual profile.
 */
import type { ButtonComponent } from "../components/button/types";
import { buttonElement, type ButtonSpec, type ButtonElement } from "./button";
import { defineElement, type DefineOptions } from "./define";

/** Visual setters accept only the fixed profile; writes are inert and chainable. */
export type ButtonFilledSmallRoundComponent = Omit<ButtonComponent, "setVariant" | "setSize" | "setShape"> & {
  setVariant(value: "filled"): ButtonFilledSmallRoundComponent;
  setSize(value: "s"): ButtonFilledSmallRoundComponent;
  setShape(value: "round"): ButtonFilledSmallRoundComponent;
};

const general = buttonElement.spec as ButtonSpec;
const fixed = { variant: "filled", size: "s", shape: "round" } as const;
const inert = { type: "string" as const, update: () => {} };
const buttonFilledSmallRoundSpec = {
  ...general,
  name: "button-filled-small-round",
  ssr: false,
  styles: ["progress", "button-filled-small-round"],
  create: (config: Record<string, unknown>): ButtonComponent => {
    const component = general.create({ ...config, ...fixed });
    // `component` is public too: no inherited setter may escape the profile.
    component.setVariant = component.setSize = component.setShape = () => component;
    return component;
  },
  attributes: { ...general.attributes, variant: inert, size: inert, shape: inert },
  properties: {
    ...general.properties,
    variant: { get: () => fixed.variant, set: () => {} },
    size: { get: () => fixed.size, set: () => {} },
    shape: { get: () => fixed.shape, set: () => {} },
  },
};
export const buttonFilledSmallRoundElement = defineElement<ButtonComponent>(buttonFilledSmallRoundSpec);
export type ButtonFilledSmallRoundElement = Omit<ButtonElement, "variant" | "size" | "shape" | "component"> & {
  variant: "filled";
  size: "s";
  shape: "round";
  readonly component: ButtonFilledSmallRoundComponent | null;
};
export const defineButtonFilledSmallRound = (options?: DefineOptions): string => buttonFilledSmallRoundElement.define(options);

declare global {
  interface HTMLElementTagNameMap {
    "m-button-filled-small-round": ButtonFilledSmallRoundElement;
  }
}
