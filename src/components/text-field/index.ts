// src/components/text-field/index.ts
export { default } from "./text-field";
// The canonical name, as the root exports it (FLO-383)
export { default as createTextField } from "./text-field";

// Export types
export type {
  TextFieldConfig,
  TextFieldVariant,
  TextFieldComponent,
  TextFieldDensity,
  TextFieldEvents,
  TextFieldValuePayload,
  TextFieldFocusPayload,
  TextFieldTrailingPayload,
} from "./types";
