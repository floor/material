import { createAssistChip, createFilterChip, createInputChip, createSuggestionChip, createChips, createSelect, createSearch } from "../../src";
import type { ChipConfig } from "../../src/components/chips";
import type { SelectConfig } from "../../src/components/select";
import type { SearchConfig } from "../../src/components/search";

const chip: ChipConfig = { label: "Chip", ariaLabel: "Chip details" };
const select: SelectConfig = { ariaLabel: "Choose size", options: [] };
const search: SearchConfig = { ariaLabel: "Search people by name" };
createChips({ chips: [chip] });
createAssistChip({ label: "Chip", ariaLabel: "Chip details" });
createFilterChip({ label: "Chip", ariaLabel: "Chip details" });
createInputChip({ label: "Chip", ariaLabel: "Chip details", removeLabel: "Remove chip" });
createSuggestionChip({ label: "Chip", ariaLabel: "Chip details" });
createSelect(select);
createSearch(search);
// @ts-expect-error accessible names are text
createAssistChip({ label: "Chip", ariaLabel: 3 });
// @ts-expect-error accessible names are text
createSelect({ ariaLabel: 3 });
// @ts-expect-error accessible names are text
createSearch({ ariaLabel: 3 });
