// src/components/text-field-chips/index.ts
//
// `material/components/text-field-chips`: the opt-in entry for input chips
// inside a text field. It is the value `createTextField({ chips })` takes, and
// importing it is what brings the chip component into a page. The stylesheet is
// `material/styles/text-field-chips`.
//
//   import createTextField from "material/components/text-field";
//   import { textFieldChips } from "material/components/text-field-chips";
//   import "material/styles/text-field-chips";
//
//   createTextField({ label: "To", chips: textFieldChips({ separators: [",", ";"] }) });
export { textFieldChips, type TextFieldChipsEnhancer, type ChipsFeature } from "../text-field/chips";
