// src/components/text-field/features/index.ts

// Export features
export { withLeadingIcon } from "./leading-icon";
export { withTrailingIcon } from "./trailing-icon";
export { withPrefixText } from "./prefix-text";
export { withSuffixText } from "./suffix-text";
export { withSupportingText } from "./supporting-text";
export { withPlacement } from "./placement";
export { withDensity } from "./density";
export { withError } from "./error";
export { withField } from "./field";
export { withCounter } from "./counter";
export { withRequired } from "./required";

// Export interfaces
export type { LeadingIconComponent, LeadingIconConfig } from "./leading-icon";
export type {
  TrailingIconComponent,
  TrailingIconConfig,
  TextFieldTrailingPayload,
} from "./trailing-icon";
export type { RequiredConfig, RequiredFeature } from "./required";
export type { PrefixTextComponent, PrefixTextConfig } from "./prefix-text";
export type { SuffixTextComponent, SuffixTextConfig } from "./suffix-text";
export type {
  SupportingTextComponent,
  SupportingTextConfig,
} from "./supporting-text";
export type { PlacementComponent } from "./placement";
export type { FieldComponent } from "./field";
export type { CounterComponent } from "./counter";
