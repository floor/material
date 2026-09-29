// src/elements/badge.ts
/**
 * `<m-badge>`: a standalone badge. The factory attaches a badge to a target
 * it wraps; the element is the badge alone, placed by the page like any
 * inline element.
 *
 * The label is the `label` attribute, or the element's text when there is
 * none. The factory writes a formatted string (`999+`), not a node, so the
 * text is read rather than slotted. The `visible` property is the live
 * visibility; an empty or zero label hides the badge, as in the factory.
 *
 * @module elements
 */

import createBadge from "../components/badge";
import type { BadgeComponent, BadgeConfig } from "../components/badge/types";
import { defineElement, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";

const labelOf = (host: HTMLElement): string => host.getAttribute("label") ?? (host.textContent ?? "").trim();

/** The label each badge shows, so changes that leave it alone do not touch it. */
const labels = new WeakMap<BadgeComponent, string>();

const applyLabel = (component: BadgeComponent, label: string): void => {
  if (labels.get(component) === label) return;
  labels.set(component, label);
  component.setLabel(label);
};

const badgeSpec = {
  name: "badge",
  create: (config) => createBadge(config as BadgeConfig),
  styles: ["badge"],
  // The factory positions the badge against its target; alone, it takes its place in the flow.
  hostStyles: ":host{display:inline-flex;vertical-align:middle}:host>*{position:relative}",
  attributes: {
    label: { type: "string", config: "label", update: (c, _v, host) => applyLabel(c, labelOf(host)) },
    max: { type: "number", config: "max" },
    variant: { type: "string", config: "variant", update: (c, v) => void c.setVariant(String(v ?? "large")) },
    color: { type: "string", config: "color", update: (c, v) => void c.setColor(String(v ?? "error")) },
  },
  properties: {
    visible: { get: (c) => c.isVisible(), set: (c, v) => void c.toggle(!!v), config: "visible" },
  },
  config: (host) => (host.hasAttribute("label") ? {} : { label: labelOf(host) }),
  setup: (host, component) => void labels.set(component, labelOf(host)),
  observeChildren: (host, component) => {
    applyLabel(component, labelOf(host));
    return true;
  },
} satisfies ElementSpec<BadgeComponent>;

export const badgeElement = defineElement<BadgeComponent>(badgeSpec);
export type BadgeSpec = typeof badgeSpec;
/** `<m-badge>` as a ref or a query returns it. */
export type BadgeElement = ElementInstance<BadgeSpec, BadgeComponent>;

/** Registers `<m-badge>` (or `<prefix-badge>`). */
export const defineBadge = (options?: DefineOptions): string => badgeElement.define(options);
