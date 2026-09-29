// src/elements/divider.ts
/**
 * `<m-divider>`: the divider as a custom element. The factory renders an
 * `<hr>`, a separator, with `aria-orientation` when vertical.
 *
 * A horizontal divider fills its line; a vertical one stretches with its flex
 * or grid row.
 *
 * @module elements
 */

import { createDivider } from "../components/divider";
import type { DividerConfig } from "../components/divider/config";
import type { DividerComponent } from "../components/divider/types";
import { defineElement, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";

type Variant = NonNullable<DividerConfig["variant"]>;
const variant = (value: unknown): Variant => (value === "inset" || value === "middle-inset" ? value : "full-width");

const dividerSpec = {
  name: "divider",
  create: (config) => createDivider(config as DividerConfig),
  styles: ["divider"],
  hostStyles: ':host{display:block}:host([orientation="vertical"]:not([hidden])){display:inline-block;align-self:stretch}',
  attributes: {
    orientation: {
      type: "string",
      config: "orientation",
      update: (c, v) => void c.setOrientation(v === "vertical" ? "vertical" : "horizontal"),
    },
    variant: { type: "string", config: "variant", update: (c, v) => void c.setVariant(variant(v)) },
    "inset-start": { type: "number", config: "insetStart" },
    "inset-end": { type: "number", config: "insetEnd" },
    thickness: { type: "number", config: "thickness", update: (c, v) => void c.setThickness(Number(v ?? 1)) },
    color: { type: "string", config: "color", update: (c, v) => void c.setColor(String(v ?? "")) },
  },
} satisfies ElementSpec<DividerComponent>;

export const dividerElement = defineElement<DividerComponent>(dividerSpec);
export type DividerSpec = typeof dividerSpec;
/** `<m-divider>` as a ref or a query returns it. */
export type DividerElement = ElementInstance<DividerSpec, DividerComponent>;

/** Registers `<m-divider>` (or `<prefix-divider>`). */
export const defineDivider = (options?: DefineOptions): string => dividerElement.define(options);
