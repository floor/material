// src/components/button/features/progress.ts
import type { ProgressConfig, ProgressComponent, ProgressEvents } from "../../progress/types";
import { addClass, removeClass } from "../../../core/dom";
import { ButtonConfig, IconAPI } from "../types";

/**
 * Component with progress capabilities
 */
interface ProgressEnhancedComponent {
  element: HTMLElement;
  icon?: IconAPI;
  getClass: (name: string) => string;
  progress?: ProgressComponent;
  disabled?: {
    enable: () => void;
    disable: () => void;
  };
  lifecycle?: {
    destroy: () => void;
  };
  setText?: (text: string) => unknown;
  getText?: () => string;
  /** The label manager withText installs; the setText/getText above only exist after withAPI. */
  text?: {
    setText: (text: string) => unknown;
    getText: () => string;
  };
  showProgress?: () => Promise<ProgressEnhancedComponent>;
  showProgressSync?: () => ProgressEnhancedComponent;
  hideProgress?: () => Promise<ProgressEnhancedComponent>;
  hideProgressSync?: () => ProgressEnhancedComponent;
  setProgress?: (value: number) => Promise<ProgressEnhancedComponent>;
  setProgressSync?: (value: number) => ProgressEnhancedComponent;
  setIndeterminate?: (
    indeterminate: boolean
  ) => Promise<ProgressEnhancedComponent>;
  setIndeterminateSync?: (indeterminate: boolean) => ProgressEnhancedComponent;
  setLoading?: (
    loading: boolean,
    text?: string
  ) => Promise<ProgressEnhancedComponent>;
  setLoadingSync?: (
    loading: boolean,
    text?: string
  ) => ProgressEnhancedComponent;
}

/**
 * Dynamically imports and creates a progress component
 * @param config Progress configuration
 * @returns Promise resolving to the progress component
 */
const createProgressLazy = async (
  config: ProgressConfig
): Promise<ProgressComponent> => {
  // Dynamic import directly from progress.ts to avoid index re-exports
  const { default: createProgress } = await import("../../progress/progress");
  return createProgress(config);
};

/**
 * Adds progress functionality to a button component
 *
 * @param config - Button configuration with progress options
 * @returns Component enhancer function
 */
export const withProgress =
  (config: ButtonConfig) =>
  <C extends ProgressEnhancedComponent>(component: C): C => {
    // Keep the feature absent unless progress or an initial loading state needs it.
    if (!config.progress && !config.loading) {
      return component;
    }

    const { on, ...restConfig } = (
      typeof config.progress === "object" ? config.progress : {}
    ) as ProgressConfig & { on?: Partial<ProgressEvents> };
    // Private drawing floor for the existing 20px icon slot. Standalone
    // progress retains its 24px floor; this is not a public progress option.
    const progressConfig: ProgressConfig & { minSize: number } = {
      variant: "circular", size: 20, thickness: 2, indeterminate: true,
      ...restConfig,
      minSize: 20,
    };

    // Progress will be created lazily
    let progress: ProgressComponent | null = null;
    let progressPromise: Promise<ProgressComponent> | null = null;
    let isLoading = !!config.loading;
    let wasDisabled: boolean | undefined;
    // An initial busy shell has not captured a loading label yet.
    let originalText: string | undefined;
    const markLoading = (): void => {
      wasDisabled ??= (component.element as HTMLButtonElement).disabled;
      component.element.setAttribute("aria-busy", "true");
      component.disabled?.disable();
    };
    // Initial semantics do not start lazy work during synchronous SSR rendering.
    // showProgress remains the explicit initial-indicator option below.
    if (isLoading) {
      markLoading();
    }

    // Helper to ensure progress is loaded
    const ensureProgress = async (): Promise<ProgressComponent> => {
      if (progress) return progress;

      if (!progressPromise) {
        progressPromise = createProgressLazy(progressConfig).then((p) => {
          progress = p;

          // Add button-specific class to the progress element
          addClass(p.element, component.getClass("button__progress"));

          // Initially hide progress
          p.element.style.display = "none";

          // Attach event handlers if any were provided
          for (const [event, handler] of Object.entries(on ?? {}) as
            [keyof ProgressEvents, ProgressEvents[keyof ProgressEvents] | undefined][]) {
            if (handler) p.on(event, handler);
          }

          // Store progress reference
          component.progress = p;

          return p;
        });
      }

      return progressPromise;
    };

    const getIconElement = () => component.element.querySelector(`.${component.getClass("button__icon")}`);

    // Add progress methods that lazy-load the progress component. Each is held
    // in a local first: the interface marks them optional because they only
    // exist once this feature has run, and the wrappers below call the local,
    // which is always there.
    const showProgress = async (): Promise<C> => {
      const p = await ensureProgress();
      const iconElement = getIconElement();

      // Ensure progress element is in the DOM
      if (!component.element.contains(p.element)) {
        // A null reference appends; otherwise keep the existing icon/text order.
        component.element.insertBefore(p.element, iconElement?.nextSibling ?? component.element.firstChild);
      }

      p.element.style.display = "";
      addClass(
        component.element,
        `${component.getClass("button")}--progress`
      );

      // Hide the icon if it exists
      if (iconElement instanceof HTMLElement) {
        iconElement.style.display = "none";
      }
      return component;
    };
    component.showProgress = showProgress;

    // Synchronous wrapper for convenience
    component.showProgressSync = (): C => {
      void showProgress();
      return component;
    };

    const hideProgress = async (): Promise<C> => {
      // If progress hasn't been created yet, just return
      if (!progress) return component;

      progress.element.style.display = "none";
      removeClass(
        component.element,
        `${component.getClass("button")}--progress`
      );

      // Show the icon again if it exists
      const iconElement = getIconElement();
      if (iconElement instanceof HTMLElement) {
        iconElement.style.display = "";
      }

      return component;
    };
    component.hideProgress = hideProgress;

    // Synchronous wrapper
    component.hideProgressSync = (): C => {
      void hideProgress();
      return component;
    };

    const setProgress = async (value: number): Promise<C> => {
      const p = await ensureProgress();
      p.setValue(value);
      return component;
    };
    component.setProgress = setProgress;

    // Synchronous wrapper
    component.setProgressSync = (value: number): C => {
      void setProgress(value);
      return component;
    };

    const setIndeterminate = async (indeterminate: boolean): Promise<C> => {
      const p = await ensureProgress();
      p.setIndeterminate(indeterminate);
      return component;
    };
    component.setIndeterminate = setIndeterminate;

    // Synchronous wrapper
    component.setIndeterminateSync = (indeterminate: boolean): C => {
      void setIndeterminate(indeterminate);
      return component;
    };

    // This feature runs before withAPI adds setText/getText on a separate
    // object. Prefer withText's manager, with a fallback for other compositions.
    const setLoading = async (loading: boolean, text?: string): Promise<C> => {
      if (loading !== isLoading || (loading && originalText === undefined)) {
        isLoading = loading;
        if (loading) {
          originalText = (component.text ? component.text.getText() : component.getText?.()) ?? "";
          markLoading();
          await showProgress();
        } else {
          component.element.removeAttribute("aria-busy");
          await hideProgress();
          if (!wasDisabled) component.disabled?.enable();
          wasDisabled = undefined;
        }
        if (!loading) text ||= originalText;
        if (text) {
          if (component.text) component.text.setText(text);
          else component.setText?.(text);
        }
      }
      return component;
    };
    component.setLoading = setLoading;

    // Synchronous wrapper - most commonly used
    component.setLoadingSync = (loading: boolean, text?: string): C => {
      void setLoading(loading, text);
      return component;
    };

    // Update destroy to clean up progress if it was created
    if (component.lifecycle) {
      const originalDestroy = component.lifecycle.destroy;
      component.lifecycle.destroy = () => {
        if (progress) {
          progress.destroy();
          if (progress.element.parentNode) progress.element.parentNode.removeChild(progress.element);
        }
        originalDestroy();
      };
    }

    // If showProgress is true, initialize immediately
    if (config.showProgress) {
      void ensureProgress().then(() => showProgress());
    }

    return component;
  };
