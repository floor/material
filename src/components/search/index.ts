// src/components/search/index.ts

// Export main component creator
export { default, default as createSearch } from "./search";

// Export types for TypeScript users
export type {
  SearchConfig,
  SearchComponent,
  SearchEvent,
  SearchEvents,
  SearchStateEvent,
  SearchState,
  SearchViewMode,
  SearchVariant,
  SearchEventType,
  SearchSuggestion,
  SearchTrailingItem,
} from "./types";
