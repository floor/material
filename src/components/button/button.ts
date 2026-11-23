// src/components/button/button.ts
import { withProgress } from "./features/progress";
import { composeButton } from "./compose";
import { ButtonConfig, ButtonComponent } from "./types";

/**
 * Creates a new Button component with the specified configuration.
 *
 * The Button component implements support for different variants, states, and features.
 * It follows accessibility best practices and provides a rich API for state management.
 *
 * The Button component is created using a functional composition pattern,
 * applying various features through the pipe function. This approach allows
 * for flexible and modular component construction.
 *
 * @param {ButtonConfig} config - Configuration options for the button
 *  This can include text content, icon options, variant styling, disabled state,
 *  and other button properties. See {@link ButtonConfig} for available options.
 *
 * @returns {ButtonComponent} A fully configured button component instance with
 *  all requested features applied. The returned component has methods for
 *  manipulation, event handling, and lifecycle management.
 *
 * @throws {Error} Throws an error if button creation fails for any reason
 *
 * @example
 * ```ts
 * // Create a button with integrated progress
 * const submitButton = createButton({
 *   text: 'Submit',
 *   variant: 'filled',
 *   progress: {
 *     variant: 'circular',
 *     size: 18,
 *     indeterminate: true
 *   }
 * });
 *
 * // Create a square button with different sizes
 * const squareButton = createButton({
 *   text: 'Square Button',
 *   variant: 'tonal',
 *   shape: 'square',
 *   size: 'm'  // Square buttons have size-specific corner radius
 * });
 *
 * // Synchronous usage (common for UI interactions)
 * submitButton.on('click', () => {
 *   submitButton.setLoadingSync(true, 'Submitting...');
 *
 *   // Simulate async work
 *   setTimeout(() => {
 *     submitButton.setLoadingSync(false, 'Submit');
 *   }, 2000);
 * });
 *
 * // Asynchronous usage (when you need to ensure progress is loaded)
 * submitButton.on('click', async () => {
 *   await submitButton.setLoading(true, 'Processing...');
 *   await submitButton.setProgress(50);
 *   // ... more async operations
 *   await submitButton.setLoading(false, 'Done');
 * });
 * ```
 *
 * @category Components
 */
const createButton = (config: ButtonConfig = {}): ButtonComponent => {
  try {
    // withProgress no-ops unless progress or loading is set, and its import()
    // of the progress component stays on this module. composeButton is the
    // same button without that edge.
    return composeButton(config, withProgress as (config: ButtonConfig) => (component: ButtonComponent) => ButtonComponent);
  } catch (error) {
    console.error("Button creation error:", error);
    throw new Error(`Failed to create button: ${(error as Error).message}`);
  }
};

export default createButton;
