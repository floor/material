// src/components/slider/slider.ts
import { pipe } from "../../core/compose/pipe";
import { createBase, withElement } from "../../core/compose/component";
import {
  withEvents,
  withLifecycle,
  withIcon,
  withTextLabel,
} from "../../core/compose/features";
import {
  withStates,
  withController,
  withTracks,
  withDom,
} from "./features";
import { SliderConfig, SliderComponent, SliderEventType } from "./types";
import { createBaseConfig, getElementConfig } from "./config";

/**
 * Creates a new Slider component
 *
 * Slider follows a clear architectural pattern:
 * 1. Base component - Creates the foundation with event system
 * 2. Feature enhancement - Adds specific capabilities (icons, labels)
 * 3. DOM creation - Creates DOM elements directly using optimized createElement
 * 4. State management - Handles visual states and appearance
 * 5. Track rendering - Uses decorative DOM and CSS alongside accessible handles
 * 6. Controller - Manages behavior, events, UI rendering and the public API
 * 7. Lifecycle - Handles component lifecycle events
 *
 * @param {SliderConfig} config - Slider configuration object
 * @returns {SliderComponent} Slider component instance
 */
const createSlider = (config: SliderConfig = {}): SliderComponent => {
  // Process configuration with defaults
  const baseConfig = createBaseConfig(config);

  try {
    // The controller resolves the public slider only when it emits a callback.
    // Create the component by composing features in a specific order
    const slider: SliderComponent = pipe(
      // Base component with event system
      createBase,
      withEvents(),

      // Create the main slider element using standard withElement
      withElement(getElementConfig(baseConfig)),

      // Create inner DOM elements (container, handle, valueBubble)
      withDom(baseConfig),

      // Add text/label and icon features that need DOM elements
      withTextLabel(baseConfig),
      withIcon(baseConfig),

      // Establish lifecycle and appearance before track hooks wrap them.
      withLifecycle(),
      withStates(baseConfig),

      // Add DOM rendering for tracks and ticks
      withTracks(baseConfig),

      // Add state management, behavior and the public API
      withController(baseConfig, (): SliderComponent => slider)
    )(baseConfig);

    // Register event handlers from config for convenience
    if (baseConfig.on && typeof slider.on === "function") {
      Object.entries(baseConfig.on).forEach(([event, handler]) => {
        if (typeof handler === "function") {
          slider.on(event as SliderEventType, handler);
        }
      });
    }

    return slider;
  } catch (error) {
    console.error("Slider creation error:", error);
    throw new Error(`Failed to create slider: ${(error as Error).message}`);
  }
};

export default createSlider;
