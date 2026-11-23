/** Search component state */
export type SearchState = "bar" | "view";
/** Search view display mode */
export type SearchViewMode = "docked" | "fullscreen";
/** Search variant, M3's style - 'contained': M3 Expressive. */
export type SearchVariant = "contained" | "divided";
/** Valid event types for search component per MD3 spec: the names in {@link SearchEvents} */
export type SearchEventType = keyof SearchEvents;
/** Trailing content item configuration */
export interface SearchTrailingItem {
    /** Unique identifier for the item */
    id: string;
    /** HTML content (icon SVG or avatar image). */
    content: string;
    /** Type of trailing content */
    type: "icon" | "avatar";
    /** Accessible label for the item */
    ariaLabel?: string;
    /** Click handler */
    onClick?: (event: MouseEvent) => void;
}
/** Search suggestion item */
export interface SearchSuggestion {
    /** Display text */
    text: string;
    /** Value to use when selected (defaults to text) */
    value?: string;
    /** Optional leading icon HTML. */
    icon?: string;
    /** A second line under the text: a two-line list item */
    supportingText?: string;
    /** Optional group identifier for dividers */
    group?: string;
}
/** Search event data */
export interface SearchEvent {
    /** The search component instance */
    component: SearchComponent;
    /** Current search value */
    value: string;
    /** Original DOM event if available */
    originalEvent: Event | null;
    /** Selected suggestion (for suggestionSelect event) */
    suggestion?: SearchSuggestion;
    /** Prevents default behavior */
    preventDefault: () => void;
    /** Whether default was prevented */
    defaultPrevented: boolean;
}
/** What `expand` and `collapse` carry: the search after the change. */
export interface SearchStateEvent {
    /** The search component instance */
    component: SearchComponent;
    /** The state after the change: `view` on expand, `bar` on collapse */
    state: SearchState;
    /** The view mode the search has */
    viewMode: SearchViewMode;
}
/** The search's events and what each hands its listener. */
export interface SearchEvents {
    focus: (event: SearchEvent) => void;
    blur: (event: SearchEvent) => void;
    input: (event: SearchEvent) => void;
    submit: (event: SearchEvent) => void;
    clear: (event: SearchEvent) => void;
    suggestionSelect: (event: SearchEvent) => void;
    expand: (event: SearchStateEvent) => void;
    collapse: (event: SearchStateEvent) => void;
}
/** Configuration options for the Search component */
export interface SearchConfig {
    /** Initial state: 'bar' (collapsed) or 'view' (expanded). */
    initialState?: SearchState;
    /** View mode when expanded: 'docked' or 'fullscreen'. */
    viewMode?: SearchViewMode;
    /** 'contained' (M3 Expressive) or 'divided' (baseline). */
    variant?: SearchVariant;
    /** Whether the search component is disabled */
    disabled?: boolean;
    /** Placeholder/supporting text. */
    placeholder?: string;
    /** Accessible name for the search input; the current placeholder is the fallback. */
    ariaLabel?: string;
    /** Initial input value */
    value?: string;
    /** Form field name. */
    name?: string;
    /** Custom leading icon HTML (replaces default search icon). */
    leadingIcon?: string;
    /** Trailing content items (icons, avatar) */
    trailingItems?: SearchTrailingItem[];
    /** Suggestions to display in view mode */
    suggestions?: SearchSuggestion[] | string[];
    /** Show clear button when input has value. */
    showClearButton?: boolean;
    /** Auto-expand to view on focus. */
    expandOnFocus?: boolean;
    /** Auto-collapse on blur (with delay). */
    collapseOnBlur?: boolean;
    /** Collapse delay in ms when collapseOnBlur is true. */
    collapseDelay?: number;
    /** Minimum width in pixels. */
    minWidth?: number;
    /** Maximum width in pixels. */
    maxWidth?: number;
    /** Full width mode (ignores min/max width) */
    fullWidth?: boolean;
    /** Additional CSS classes */
    class?: string;
    /** Component prefix for class names */
    prefix?: string;
    /** `submit` listener registered at creation. */
    onSubmit?: SearchEvents["submit"];
    /** `input` listener registered at creation. */
    onInput?: SearchEvents["input"];
    /** `clear` listener registered at creation. */
    onClear?: SearchEvents["clear"];
    /** `expand` listener registered at creation. */
    onExpand?: SearchEvents["expand"];
    /** `collapse` listener registered at creation. */
    onCollapse?: SearchEvents["collapse"];
    /** `suggestionSelect` listener registered at creation. */
    onSuggestionSelect?: SearchEvents["suggestionSelect"];
    /** Event handlers map */
    on?: Partial<SearchEvents>;
}
/** Search component public API interface */
export interface SearchComponent {
    /** The root element of the search component */
    element: HTMLElement;
    /** Sets the search input value. */
    setValue: (value: string, triggerEvent?: boolean) => SearchComponent;
    /** Gets the current search input value */
    getValue: () => string;
    /** Sets the placeholder/supporting text */
    setPlaceholder: (text: string) => SearchComponent;
    /** Gets the current placeholder text */
    getPlaceholder: () => string;
    /** Expands to search view */
    expand: () => SearchComponent;
    /** Collapses to search bar */
    collapse: () => SearchComponent;
    /** Gets the current state ('bar' or 'view') */
    getState: () => SearchState;
    /** Checks if currently expanded */
    isExpanded: () => boolean;
    /** Sets the view mode ('docked' or 'fullscreen') */
    setViewMode: (mode: SearchViewMode) => SearchComponent;
    /** Gets the current view mode */
    getViewMode: () => SearchViewMode;
    /** Sets the variant ('contained' or 'divided') */
    setVariant: (variant: SearchVariant) => SearchComponent;
    /** Gets the current variant */
    getVariant: () => SearchVariant;
    /** Focuses the search input */
    focus: () => SearchComponent;
    /** Blurs the search input */
    blur: () => SearchComponent;
    /** Clears the search input. */
    clear: () => SearchComponent;
    /** Submits the current search value */
    submit: () => SearchComponent;
    /** Sets the leading icon HTML */
    setLeadingIcon: (iconHtml: string) => SearchComponent;
    /** Adds a trailing item */
    addTrailingItem: (item: SearchTrailingItem) => SearchComponent;
    /** Removes a trailing item by id */
    removeTrailingItem: (id: string) => SearchComponent;
    /** Sets all trailing items */
    setTrailingItems: (items: SearchTrailingItem[]) => SearchComponent;
    /** Sets the suggestions list */
    setSuggestions: (suggestions: SearchSuggestion[] | string[]) => SearchComponent;
    /** Gets the current suggestions */
    getSuggestions: () => SearchSuggestion[];
    /** Clears all suggestions */
    clearSuggestions: () => SearchComponent;
    /** Enables the search component */
    enable: () => SearchComponent;
    /** Disables the search component */
    disable: () => SearchComponent;
    /** Checks if the component is disabled */
    isDisabled: () => boolean;
    /** Adds an event listener */
    on: <K extends keyof SearchEvents>(event: K, handler: SearchEvents[K]) => SearchComponent;
    /** Removes an event listener */
    off: <K extends keyof SearchEvents>(event: K, handler: SearchEvents[K]) => SearchComponent;
    /** Destroys the component and cleans up resources */
    destroy: () => void;
}
/** Internal component structure references */
export interface SearchStructure {
    /** The bar and, when expanded, its results: what shows in the top layer while */
    surface: HTMLElement;
    /** Main container element */
    container: HTMLElement;
    /** Input element */
    input: HTMLInputElement;
    /** Input wrapper element */
    inputWrapper: HTMLElement;
    /** Leading icon container */
    leadingIcon: HTMLElement;
    /** Clear button element */
    clearButton: HTMLElement | null;
    /** Trailing items container */
    trailingContainer: HTMLElement | null;
    /** Header divider (view mode) */
    divider: HTMLElement | null;
    /** Suggestions container (view mode) */
    suggestionsContainer: HTMLElement | null;
    /** Suggestions list element */
    suggestionsList: HTMLElement | null;
    /** The live region that announces the suggestion count */
    status: HTMLElement;
}
/** Internal search state */
export interface SearchInternalState {
    /** Current component state */
    state: SearchState;
    /** Current view mode */
    viewMode: SearchViewMode;
    /** Current input value */
    value: string;
    /** Current placeholder */
    placeholder: string;
    /** Whether input is focused */
    isFocused: boolean;
    /** Whether component is disabled */
    isDisabled: boolean;
    /** Current suggestions */
    suggestions: SearchSuggestion[];
    /** Currently highlighted suggestion index (-1 = none) */
    highlightedIndex: number;
    /** Trailing items */
    trailingItems: SearchTrailingItem[];
}
