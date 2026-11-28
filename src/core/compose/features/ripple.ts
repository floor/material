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

  /**
   * The element the ripple is mounted on is positioned by its stylesheet
   * (anything but `static`). Mounting then reads no computed style: under a
   * connected parent that read forces a style recalculation for each element.
   * Left out, a mounted element that is connected and `static` is made
   * `relative`, as before.
   */
  positioned?: boolean;
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
  const options = { duration: config.duration ?? RIPPLE_CONFIG.duration };

  const mounts = new WeakMap<HTMLElement, () => void>();
  const positioned = config.positioned;

  return {
    mount(element) {
      if (!element || mounts.has(element)) return;
      const doc = element.ownerDocument;
      const view = doc.defaultView;
      if (!view) return;
      if (!positioned && view.getComputedStyle?.(element).position === "static") {
        element.style.position = "relative";
      }
      const container = doc.createElement("div");
      container.className = `${PREFIX}-ripple`;
      element.appendChild(container);
      // The waves in flight, kept from the first press: most elements are
      // never pressed.
      let waves: Set<() => void> | undefined;

      // Pointer events, so a touch shows its press while the finger is down: the ripple
      // is the press, and mousedown only fires on touch after the finger lifts.
      const press = (event: PointerEvent): void => {
        const bounds = element.getBoundingClientRect();
        const size = Math.max(bounds.width, bounds.height) * 2;
        const wave = doc.createElement("div");
        wave.className = `${PREFIX}-ripple-wave active`;
        Object.assign(wave.style, {
          width: `${size}px`, height: `${size}px`,
          left: `${event.clientX - bounds.left - size / 2}px`,
          top: `${event.clientY - bounds.top - size / 2}px`,
        });
        let timer: number | undefined;
        let released = false;
        const removeListeners = (): void => {
          for (const type of RELEASE) doc.removeEventListener(type, release);
        };
        const dispose = (): void => {
          removeListeners();
          if (timer !== undefined) view.clearTimeout(timer);
          wave.remove();
          waves?.delete(dispose);
        };
        const release = (): void => {
          if (released) return;
          released = true;
          removeListeners();
          wave.classList.add("fade-out");
          timer = view.setTimeout(dispose, options.duration);
        };
        (waves ||= new Set()).add(dispose);
        for (const type of RELEASE) doc.addEventListener(type, release);
        container.appendChild(wave);
      };
      element.addEventListener("pointerdown", press);
      mounts.set(element, () => {
        element.removeEventListener("pointerdown", press);
        waves?.forEach((dispose) => dispose());
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
 * @param defaults - Ripple settings the component itself knows, under the
 *   caller's `rippleConfig`: a component whose stylesheet positions its root
 *   passes `{ positioned: true }`
 * @returns Function that enhances a component with ripple effect
 */
export const withRipple =
  // `& object` lets a component config that shares no key with RippleFeatureConfig through.
  <T extends RippleFeatureConfig & object>(config: T, defaults?: RippleConfig) =>
  <C extends ElementComponent & Partial<LifecycleComponent>>(
    component: C
  ): C & RippleComponent => {
    if (!config.ripple) return component as C & RippleComponent;

    const rippleInstance = createRipple({ ...defaults, ...config.rippleConfig });

    // Immediately mount ripple to ensure it's available right away
    rippleInstance.mount(component.element);

    const resources = getCleanup(component);
    resources.add(() => rippleInstance.unmount(component.element));

    return {
      ...component,
      ripple: rippleInstance,
    };
  };
