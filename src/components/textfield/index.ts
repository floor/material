// src/components/textfield/index.ts
export { default } from "./textfield";
// The canonical name, as the root exports it (FLO-383)
export { default as createTextField } from "./textfield";

// Export types
export type {
  TextfieldConfig as TextFieldConfig,
  TextfieldComponent as TextFieldComponent,
  /** @deprecated Use TextFieldConfig: M3 writes "text field" as two words. Removed in 1.0 (FLO-383). */
  TextfieldConfig,
  /** @deprecated Use TextFieldComponent: M3 writes "text field" as two words. Removed in 1.0 (FLO-383). */
  TextfieldComponent,
  TextfieldDensity,
  TextfieldEvents,
  TextfieldValuePayload,
  TextfieldFocusPayload,
  TextfieldTrailingPayload,
} from "./types";
