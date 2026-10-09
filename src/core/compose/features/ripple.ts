// src/core/compose/features/ripple.ts

import { BaseComponent, ElementComponent } from "../component";
import { LifecycleComponent } from "./lifecycle";
import { RIPPLE_CONFIG } from "./constants";
import { getCleanup } from "../cleanup";
import { PREFIX } from "../../config";

/**
 * Ripple configuration interface
 */
export interface RippleConfig {
  /**
   * How long, in milliseconds, a released wave lingers before it is removed
   */
  duration?: number;
}

/**
 * Ripple controller interface
 */
export interface RippleController {
  /**
   * Mounts ripple effect to an element
   * @param element - Target element
   */
  mount: (element: HTMLElement) => void;

  /**
   * Unmounts ripple effect from an element
   * @param element - Target element
   */
  unmount: (element: HTMLElement) => void;
}

/**
 * Configuration for ripple feature
 */
export interface RippleFeatureConfig {
  ripple?: boolean;
  rippleConfig?: RippleConfig;
}

/**
 * Component with ripple capabilities
 */
export interface RippleComponent extends BaseComponent {
  ripple: RippleController;
}

/**
 * Creates a ripple controller for managing ripple effects
 * @param config - Ripple configuration
 * @returns Ripple controller
 */
const RELEASE = ["pointerup", "pointercancel", "mouseleave"] as const;

export const createRipple = (config: RippleConfig = {}): RippleController => {
  // The wave's motion and opacity come from the stylesheet.
  const duration = config.duration ?? RIPPLE_CONFIG.duration;

  const mounts = new WeakMap<HTMLElement, () => void>();

  return {
    mount(element) {
      if (!element || mounts.has(element)) return;
      const doc = element.ownerDocument;
      const view = doc.defaultView;
      if (!view) return;
      // The optional call matters: every browser window has getComputedStyle
      // and so does this build's server DOM (src/ssr/server-dom.ts), but a
      // minimal fake window in the unit suite does not, and with `?.` the
      // whole chain short-circuits to undefined there instead of throwing
      // into the caller's component constructor. Removing those two
      // characters to save bytes failed "constructs without browser-only
      // APIs"; the bytes were found elsewhere.
      if (view.getComputedStyle?.(element).position === "static") {
        element.style.position = "relative";
      }
      const container = doc.createElement("div");
      container.className = `${PREFIX}-ripple`;
      element.appendChild(container);
      const waves = new Set<() => void>();

      // Pointer events, so a touch shows its press while the finger is down: the ripple
      // is the press, and mousedown only fires on touch after the finger lifts.
      const press = (event: PointerEvent): void => {
        const bounds = element.getBoundingClientRect();
        // A rect is visual pixels; these lengths are layout pixels inside the
        // element and render scaled again, so the element's own zoom is
        // divided back out. It is 1 outside a scaled container, where nothing
        // moves. Read here rather than through `effectiveZoom` (core/dom): the
        // import cost 18 gzipped bytes in the split-button bundle, and its
        // budget had 17 to give (scripts/size.ts).
        const zoom = element.currentCSSZoom || 1;
        const size = Math.max(bounds.width, bounds.height) * 2 / zoom;
        const wave = doc.createElement("div");
        wave.className = `${PREFIX}-ripple-wave active`;
        Object.assign(wave.style, {
          width: `${size}px`, height: `${size}px`,
          left: `${(event.clientX - bounds.left) / zoom - size / 2}px`,
          top: `${(event.clientY - bounds.top) / zoom - size / 2}px`,
        });
        let timer: number | undefined;
        let released = false;
        const removeListeners = (): void => {
          for (const type of RELEASE) doc.removeEventListener(type, release);
        };
        const dispose = (): void => {
          removeListeners();
          // Truthiness, not `!== undefined`: a timer handle is a positive
          // integer, so every real handle takes the same branch.
          if (timer) view.clearTimeout(timer);
          wave.remove();
          waves.delete(dispose);
        };
        const release = (): void => {
          if (released) return;
          released = true;
          removeListeners();
          wave.classList.add("fade-out");
          timer = view.setTimeout(dispose, duration);
        };
        waves.add(dispose);
        for (const type of RELEASE) doc.addEventListener(type, release);
        container.appendChild(wave);
      };
      element.addEventListener("pointerdown", press);
      mounts.set(element, () => {
        element.removeEventListener("pointerdown", press);
        for (const dispose of waves) dispose();
        container.remove();
      });
    },
    unmount(element) {
      mounts.get(element)?.();
      mounts.delete(element);
    },
  };
};

/**
 * Adds ripple effect functionality to a component
 *
 * @param config - Configuration object
 * @returns Function that enhances a component with ripple effect
 */
export const withRipple =
  // `& object` lets a component config that shares no key with RippleFeatureConfig through.
  <T extends RippleFeatureConfig & object>(config: T) =>
  <C extends ElementComponent & Partial<LifecycleComponent>>(
    component: C
  ): C & RippleComponent => {
    if (!config.ripple) return component as C & RippleComponent;

    const rippleInstance = createRipple(config.rippleConfig);

    // Immediately mount ripple to ensure it's available right away
    rippleInstance.mount(component.element);

    const resources = getCleanup(component);
    resources.add(() => rippleInstance.unmount(component.element));

    return {
      ...component,
      ripple: rippleInstance,
    };
  };
