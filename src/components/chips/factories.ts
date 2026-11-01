import createChip from "./chip/chip";
import { filterMount } from "./chip/variants/filter";
import { inputMount } from "./chip/variants/input";
import type { ChipMount } from "./chip/variant";
import type { AssistChipConfig, FilterChipConfig, InputChipConfig, SuggestionChipConfig, ChipComponent, ChipType } from "./types";

/** Public factories cannot carry the set's private `onSelected` hook. */
const open = <T extends object>(config: T, type: ChipType, mount?: ChipMount): ChipComponent =>
  createChip({ ...config, type, onSelected: undefined }, mount);

/** Action chip; flat and outlined by default. */
export const createAssistChip = (config: AssistChipConfig): ChipComponent => open(config, "assist");
/** Toggleable filter; selected chips show a checkmark. */
export const createFilterChip = (config: FilterChipConfig): ChipComponent => open(config, "filter", filterMount);
/** Selectable input token with an optional independent removal action. */
export const createInputChip = (config: InputChipConfig): ChipComponent => open(config, "input", inputMount);
/** Suggested action; flat and outlined by default. */
export const createSuggestionChip = (config: SuggestionChipConfig): ChipComponent => open(config, "suggestion");
