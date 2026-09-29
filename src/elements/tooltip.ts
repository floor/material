// src/elements/tooltip.ts
/**
 * `<m-tooltip>`: a tooltip for another element, in the top layer.
 *
 * The target is the element whose id is the `for` attribute, looked up in
 * the tooltip's own root and then the document, or the element given to the
 * `target` property, which wins over `for`. The text is the `text` attribute,
 * or the element's text when there is none; the factory writes a string, so
 * the text is read rather than slotted. The tooltip shows on hover and focus
 * as the factory does, and `show()`/`hide()` drive it from script.
 *
 * The surface stays in the element's shadow root, with its styles, and opens
 * in the top layer (`layer: "top"`). An id reference cannot cross into that
 * root, so the target is described by the host: the target's
 * `aria-describedby` names the host's id (one is given when it has none), and
 * the host carries the text as its `aria-label`, which a description reads
 * whether the tooltip shows or not. The host is `aria-hidden`, so the text is
 * not read a second time as page content. A target in a
 * shadow root below the host's tree is described through
 * `ariaDescribedByElements`; one in a tree above it, which can reference
 * neither, gets the text as its `aria-description`.
 *
 * @module elements
 */

import createTooltip from "../components/tooltip";
import type { TooltipComponent, TooltipConfig, TooltipPosition } from "../components/tooltip/types";
import { defineElement, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";

const textOf = (host: HTMLElement): string => host.getAttribute("text") ?? (host.textContent ?? "").trim();

interface Wiring {
  host: HTMLElement;
  /** Undoes the description on the current target. */
  undescribe: (() => void) | null;
}

const wirings = new WeakMap<TooltipComponent, Wiring>();
/** Targets set by the `target` property, which win over `for`. */
const explicit = new WeakMap<TooltipComponent, HTMLElement>();
let ids = 0;

const idrefs = (el: Element): string[] => (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
const setIdrefs = (el: Element, list: string[]): void => {
  if (list.length) el.setAttribute("aria-describedby", list.join(" "));
  else el.removeAttribute("aria-describedby");
};

/** Whether `tree` is the root of `node` or of one of its shadow hosts. */
const reaches = (tree: Node, node: Node): boolean => {
  for (let root = node.getRootNode(); ; root = (root as ShadowRoot).host.getRootNode()) {
    if (root === tree) return true;
    if (!(root as Partial<ShadowRoot>).host) return false;
  }
};

/** Makes the target described by the tooltip text; returns the undo. */
const describe = (host: HTMLElement, target: HTMLElement, component: TooltipComponent): (() => void) => {
  // The factory points the target at the surface, an id it cannot reach
  // from outside the shadow root
  setIdrefs(target, idrefs(target).filter((id) => id !== component.element.id));
  // The host's name is the text, so the description reads it once: the
  // host's own text and the surface's would otherwise both count
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("aria-label", component.getText());
  const tree = host.getRootNode();
  if (target.getRootNode() === tree) {
    if (!host.id) host.id = `m-tooltip-${++ids}`;
    const id = host.id;
    if (!idrefs(target).includes(id)) setIdrefs(target, [...idrefs(target), id]);
    return () => setIdrefs(target, idrefs(target).filter((ref) => ref !== id));
  }
  const reflecting = target as HTMLElement & { ariaDescribedByElements?: readonly Element[] | null };
  if (reaches(tree, target) && "ariaDescribedByElements" in reflecting) {
    const previous = reflecting.ariaDescribedByElements;
    reflecting.ariaDescribedByElements = [...(previous ?? []), host];
    return () => void (reflecting.ariaDescribedByElements = previous);
  }
  if (target.hasAttribute("aria-description")) return () => {};
  target.setAttribute("aria-description", component.getText());
  return () => target.removeAttribute("aria-description");
};

/** The element `for` names, in the host's root, then the document. */
const forTarget = (host: HTMLElement): HTMLElement | null => {
  const id = host.getAttribute("for");
  if (!id) return null;
  const root = host.getRootNode() as Partial<Document>;
  const found = root.getElementById?.(id) ?? host.ownerDocument.getElementById(id);
  return found instanceof HTMLElement ? found : null;
};

/**
 * Points the tooltip at its target, after `for`, `target` or the text
 * changed. `force` describes the target again even when it is the same.
 */
const retarget = (component: TooltipComponent, force = false): void => {
  const wiring = wirings.get(component);
  if (!wiring) return;
  const target = explicit.get(component) ?? forTarget(wiring.host);
  if (target === component.target && wiring.undescribe && !force) return;
  wiring.undescribe?.();
  wiring.undescribe = null;
  if (!target) return;
  if (target !== component.target) component.setTarget(target);
  wiring.undescribe = describe(wiring.host, target, component);
};

const tooltipSpec = {
  name: "tooltip",
  create: (config) => createTooltip({ ...(config as TooltipConfig), layer: "top" }),
  styles: ["tooltip"],
  // The host renders nothing itself: the surface is in the top layer
  hostStyles: ":host{display:contents}",
  attributes: {
    for: { type: "string", update: (c) => retarget(c) },
    text: {
      type: "string",
      config: "text",
      update: (c, _v, host) => {
        c.setText(textOf(host));
        retarget(c, true);
      },
    },
    position: {
      type: "string",
      config: "position",
      update: (c, v) => void c.setPosition((v ?? "bottom") as TooltipPosition),
    },
    variant: { type: "string", config: "variant" },
    "show-delay": { type: "number", config: "showDelay" },
    "hide-delay": { type: "number", config: "hideDelay" },
  },
  properties: {
    target: {
      get: (c) => c.target,
      set: (c, v) => {
        if (v instanceof HTMLElement) explicit.set(c, v);
        else explicit.delete(c);
        retarget(c);
      },
    },
  },
  methods: ["show", "hide"] as const,
  config: (host) => (host.hasAttribute("text") ? {} : { text: textOf(host) }),
  setup: (host, component) => {
    // A recreated tooltip gets its target back through the property: the
    // one `for` names is not an explicit one
    if (explicit.get(component) === forTarget(host)) explicit.delete(component);
    const wiring: Wiring = { host, undescribe: null };
    wirings.set(component, wiring);
    retarget(component);
    return () => {
      wiring.undescribe?.();
      wirings.delete(component);
    };
  },
  observeChildren: (host, component) => {
    if (!host.hasAttribute("text")) {
      component.setText(textOf(host));
      retarget(component, true);
    }
    return true;
  },
} satisfies ElementSpec<TooltipComponent>;

export const tooltipElement = defineElement<TooltipComponent>(tooltipSpec);
export type TooltipSpec = typeof tooltipSpec;
/** `<m-tooltip>` as a ref or a query returns it. */
export type TooltipElement = ElementInstance<TooltipSpec, TooltipComponent>;

/** Registers `<m-tooltip>` (or `<prefix-tooltip>`). */
export const defineTooltip = (options?: DefineOptions): string => tooltipElement.define(options);
