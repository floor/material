import createChip from "./chip/chip.js";
const open = (config, type) => createChip({ ...config, type, onSelected: undefined });
export const createAssistChip = (config) => open(config, "assist");
export const createFilterChip = (config) => open(config, "filter");
export const createInputChip = (config) => open(config, "input");
export const createSuggestionChip = (config) => open(config, "suggestion");
