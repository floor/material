// src/elements/progress.ts
/**
 * `<m-progress>`: the linear or circular progress indicator as a custom
 * element.
 *
 * The `value` and `indeterminate` attributes are the initial state; the
 * properties of the same names are the live one. Progress is output, so the
 * element dispatches no events. `aria-label` names what is loading.
 *
 * @module elements
 */

import createProgress from "../components/progress";
import type {
  ProgressComponent, ProgressConfig, ProgressShape, ProgressThickness,
} from "../components/progress/types";
import { defineElement, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";

/** `thin`, `thick` or a number of pixels, as the attribute spells it. */
const thickness = (value: unknown): ProgressThickness => {
  if (value === "thick") return "thick";
  const pixels = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(pixels) ? pixels : "thin";
};

const progressSpec = {
  name: "progress",
  create: (config) =>
    createProgress({
      ...(config as ProgressConfig),
      ...(config.thickness !== undefined ? { thickness: thickness(config.thickness) } : {}),
    }),
  styles: ["progress"],
  // Linear fills its line; circular sits in the text like an icon.
  hostStyles: ':host{display:block}:host([variant="circular"]:not([hidden])){display:inline-flex;vertical-align:middle}',
  attributes: {
    variant: { type: "string", config: "variant" },
    value: { type: "number", config: "value", update: (c, v) => void c.setValue(Number(v ?? 0)) },
    max: { type: "number", config: "max" },
    buffer: { type: "number", config: "buffer", update: (c, v) => void c.setBuffer(Number(v ?? 0)) },
    indeterminate: { type: "boolean", config: "indeterminate", update: (c, v) => void c.setIndeterminate(!!v) },
    disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
    shape: {
      type: "string",
      config: "shape",
      update: (c, v) => void c.setShape((v === "wavy" ? "wavy" : "flat") satisfies ProgressShape),
    },
    thickness: { type: "string", config: "thickness", update: (c, v) => void c.setThickness(thickness(v)) },
    size: { type: "number", config: "size" },
    "show-label": { type: "boolean", config: "showLabel", update: (c, v) => void (v ? c.showLabel() : c.hideLabel()) },
    "aria-label": { type: "string", config: "ariaLabel" },
  },
  properties: {
    value: { get: (c) => c.getValue(), set: (c, v) => void c.setValue(Number(v ?? 0)), config: "value" },
    indeterminate: { get: (c) => c.isIndeterminate(), set: (c, v) => void c.setIndeterminate(!!v), config: "indeterminate" },
  },
} satisfies ElementSpec<ProgressComponent>;

export const progressElement = defineElement<ProgressComponent>(progressSpec);
export type ProgressSpec = typeof progressSpec;
/** `<m-progress>` as a ref or a query returns it. */
export type ProgressElement = ElementInstance<ProgressSpec, ProgressComponent>;

/** Registers `<m-progress>` (or `<prefix-progress>`). */
export const defineProgress = (options?: DefineOptions): string => progressElement.define(options);
