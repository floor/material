// src/components/menu/features/opener-target.ts
//
// What a menu's config.opener names: an element, a selector, or a component
// that carries one. Both the opener feature and its stand-in
// (on-demand-behaviour.ts) resolve it, so the rule lives here, in the initial
// graph, rather than in the feature's chunk.

import { OpenerComponent, OpenerTarget } from "../types";

/** The opener's element, and the component it belongs to when it names one. */
export interface ResolvedOpener {
  element: HTMLElement | null;
  component: OpenerComponent | null;
}

/**
 * Resolves the opener element from string, direct reference, or component
 * Handles components with element property, components with getElement() method,
 * or DOM elements directly
 */
export const resolveOpener = (opener: OpenerTarget): ResolvedOpener => {
  if (!opener) return { element: null, component: null };

  // Handle string selector
  if (typeof opener === "string") {
    const element = document.querySelector(opener);
    if (!element) {
      console.warn(`Menu opener not found: ${opener}`);
      return { element: null, component: null };
    }
    return { element: element as HTMLElement, component: null };
  }

  // Handle component with element property (most common case)
  if (typeof opener === "object" && opener !== null) {
    // Case 1: Component with element property
    if ("element" in opener && opener.element instanceof HTMLElement) {
      return { element: opener.element, component: opener };
    }

    // Case 2: Component with getElement method
    if ("getElement" in opener && typeof opener.getElement === "function") {
      const element = opener.getElement();
      if (element instanceof HTMLElement) {
        return { element, component: opener };
      }
    }

    // Case 3: Component with input property (like text field)
    if ("input" in opener && opener.input instanceof HTMLElement) {
      return { element: opener.input, component: opener };
    }

    // Case 4: Direct HTML element
    if (opener instanceof HTMLElement) {
      return { element: opener, component: null };
    }
  }

  console.warn("Invalid opener type:", opener);
  return { element: null, component: null };
};
