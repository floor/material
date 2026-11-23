import type { AssistChipConfig, FilterChipConfig, InputChipConfig, SuggestionChipConfig, ChipComponent } from "./types.js";
/** Action chip; flat and outlined by default. */
export declare const createAssistChip: (config: AssistChipConfig) => ChipComponent;
/** Toggleable filter; selected chips show a checkmark. */
export declare const createFilterChip: (config: FilterChipConfig) => ChipComponent;
/** Selectable input token with an optional independent removal action. */
export declare const createInputChip: (config: InputChipConfig) => ChipComponent;
/** Suggested action; flat and outlined by default. */
export declare const createSuggestionChip: (config: SuggestionChipConfig) => ChipComponent;
