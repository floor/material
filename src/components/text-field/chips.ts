// src/components/text-field/chips.ts
//
// The opt-in entry for input chips in a text field. Importing this module is
// what brings the chip component into a page: `createTextField` only ever sees
// the function it returns, so a field created without it carries no chip code
// and its bundle is unchanged.
//
//   import createTextField from "material/components/text-field";
//   import { textFieldChips } from "material/components/text-field/chips";
//   import "material/styles/text-field-chips";
//
//   const recipients = createTextField({ label: "To", chips: textFieldChips({ separators: [",", ";"] }) });
import type { ElementComponent } from "../../core/compose/component";
import { installChips, type ChipsFeature } from "./features/chips";
import type { TextFieldChipsConfig } from "./chip-types";

/** The value `TextFieldConfig.chips` takes to enable chips. */
export type TextFieldChipsEnhancer = <C extends ElementComponent>(component: C, config: object) => C & { chips?: ChipsFeature };

/**
 * Enables input chips on the text field it is given to: the configuration
 * (separators, `maxChips`, `allowDuplicates`, `editable`, `validate`, initial
 * `items` and the `add`/`remove` listeners) travels with the function, so the
 * field itself needs no reference to the chip code.
 */
export const textFieldChips = (config: TextFieldChipsConfig = {}) =>
  <C extends ElementComponent>(component: C, fieldConfig: object): C & { chips?: ChipsFeature } =>
    installChips(component, { ...fieldConfig, chips: config }, () => {});

export type { ChipsFeature };
