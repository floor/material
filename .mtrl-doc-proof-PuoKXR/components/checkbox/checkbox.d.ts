/** Checkbox Component Implementation This module implements a Material Design 3 checkbox component with support for different visual variants, indeterminate state, and configurable label positioning. */
import { CheckboxConfig, CheckboxComponent } from "./types.js";
/**
 * Creates a new Checkbox component with the specified configuration.
 * @param config
 */
declare const createCheckbox: (config?: CheckboxConfig) => CheckboxComponent;
export default createCheckbox;
