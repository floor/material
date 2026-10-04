// src/components/text-field/text-field.ts
import { pipe } from "../../core/compose";
import { createBase, withElement } from "../../core/compose/component";
import {
  withEvents,
  withDisabled,
  withLifecycle,
  withVariant,
  withTextInput,
  withTextLabel,
} from "../../core/compose/features";
import { withAPI } from "./api";
import {
  withLeadingIcon,
  withTrailingIcon,
  withSupportingText,
  withPrefixText,
  withSuffixText,
  withPlacement,
  withDensity,
  withError,
  withField,
  withCounter,
  withRequired,
} from "./features";
import { TextFieldConfig, TextFieldComponent } from "./types";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config";

/**
 * Creates a new TextField component
 *
 * Text fields allow users to enter text into a UI. They typically appear in forms and dialogs.
 * This implementation follows Material Design 3 guidelines for accessible, customizable text fields.
 *
 * @param {TextFieldConfig} config - TextField configuration options
 * @returns {TextFieldComponent} A fully configured text field component instance
 * @throws {Error} Throws an error if text field creation fails
 *
 * @example
 * // Create a basic text field
 * const textField = createTextField({
 *   label: 'Username',
 *   name: 'username'
 * });
 *
 * document.querySelector('.form').appendChild(textField.element);
 *
 * @example
 * // Create a text field with prefix and suffix
 * const currencyField = createTextField({
 *   label: 'Amount',
 *   type: 'number',
 *   prefixText: '$',
 *   suffixText: 'USD'
 * });
 *
 * // Add event listener
 * currencyField.on('input', ({ value }) => {
 *   console.log('Amount entered:', value);
 * });
 */
const createTextField = (config: TextFieldConfig = {}): TextFieldComponent => {
  const baseConfig = createBaseConfig(config);

  try {
    // Build text field through functional composition
    // Each function in the pipe adds specific capabilities
    const textField = pipe(
      createBase, // Base component structure
      withEvents(), // Event handling system
      withElement(getElementConfig(baseConfig)), // Create DOM element
      withLifecycle(), // Features register cleanup on the shared lifecycle
      withVariant(baseConfig), // Apply variant styling (filled/outlined)
      withField(baseConfig), // The container the features below draw into
      withTextInput(baseConfig), // Add input element
      withDensity(baseConfig), // Apply density level, to the input too: it has to exist first
      withTextLabel(baseConfig), // Add text label
      withRequired(baseConfig), // The required asterisk on the label
      withLeadingIcon(baseConfig), // Add leading icon (if specified)
      withTrailingIcon(baseConfig), // Add trailing icon (if specified)
      withPrefixText(baseConfig), // Add prefix text (if specified)
      withSuffixText(baseConfig), // Add suffix text (if specified)
      withSupportingText(baseConfig), // Add supporting/helper text (if specified)
      withError(baseConfig), // Add error state management
      // After withError: it reads the live supportingTextElement of the feature
      // before it, which a spread in between would copy into a snapshot
      withCounter(baseConfig), // The character counter, while the input has a maxlength
      withDisabled(baseConfig), // Add disabled state management
      withPlacement(), // Add dynamic positioning for elements
      (comp) => withAPI(getApiConfig(comp))(comp) // Add public API
    )(baseConfig) as TextFieldComponent;

    // A config option is the listener registered at creation, ahead of any
    // listener the caller adds afterwards.
    if (baseConfig.onTrailingClick) textField.on("trailing", baseConfig.onTrailingClick);

    return textField;
  } catch (error) {
    console.error(
      "TextField creation error:",
      error instanceof Error ? error.message : String(error)
    );
    throw new Error(
      `Failed to create text field: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export default createTextField;
