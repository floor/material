// src/components/listbox/index.ts

/**
 * Lean selection popup
 * @module components/listbox
 * @description A synchronous, single-selection combobox popup for flat text
 * options: one committed value, a positioned top-layer surface and the APG
 * select-only keyboard model, without the full menu implementation.
 */

export { default, default as createListbox } from "./listbox";

export type {
  ListboxChangeDetail,
  ListboxComponent,
  ListboxConfig,
  ListboxEventDetail,
  ListboxEventHandlers,
  ListboxEvents,
  ListboxOption,
} from "./types";
