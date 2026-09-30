// src/elements/loading-indicator.ts
/**
 * `<m-loading-indicator>`: the expressive loading indicator as a custom
 * element. It animates from connection; a `value` from 0 to 1 makes it
 * determinate. `aria-label` names what is loading.
 *
 * Parts: `loading-indicator`, `canvas`.
 *
 * @module elements
 */

import createLoadingIndicator from "../components/loading-indicator";
import { LOADING_INDICATOR_DEFAULTS } from "../components/loading-indicator/constants";
import type { LoadingIndicatorComponent, LoadingIndicatorConfig } from "../components/loading-indicator/types";
import { defineElement, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";

const loadingIndicatorSpec = {
  name: "loading-indicator",
  create: (config) => createLoadingIndicator(config as LoadingIndicatorConfig),
  styles: ["loading-indicator"],
  // A flex host has no line box, so it is exactly the indicator's size.
  hostStyles: ":host{display:inline-flex;vertical-align:middle}",
  attributes: {
    size: {
      type: "number",
      config: "size",
      update: (c, v) => void c.setSize(v === null ? LOADING_INDICATOR_DEFAULTS.SIZE : Number(v)),
    },
    contained: { type: "boolean", config: "contained" },
    value: { type: "number", config: "value", update: (c, v) => void c.setValue(v === null ? null : Number(v)) },
    "aria-label": {
      type: "string",
      config: "ariaLabel",
      update: (c, v) => void c.setLabel(v === null ? LOADING_INDICATOR_DEFAULTS.LABEL : String(v)),
    },
  },
  methods: ["start", "stop"] as const,
} satisfies ElementSpec<LoadingIndicatorComponent>;

export const loadingIndicatorElement = defineElement<LoadingIndicatorComponent>(loadingIndicatorSpec);
export type LoadingIndicatorSpec = typeof loadingIndicatorSpec;
/** `<m-loading-indicator>` as a ref or a query returns it. */
export type LoadingIndicatorElement = ElementInstance<LoadingIndicatorSpec, LoadingIndicatorComponent>;

/** Registers `<m-loading-indicator>` (or `<prefix-loading-indicator>`). */
export const defineLoadingIndicator = (options?: DefineOptions): string => loadingIndicatorElement.define(options);
