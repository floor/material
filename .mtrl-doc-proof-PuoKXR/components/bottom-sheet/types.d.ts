import { BOTTOM_SHEET_VARIANTS, BOTTOM_SHEET_STATES } from "./constants.js";
/** Standard or modal */
export type BottomSheetVariant = (typeof BOTTOM_SHEET_VARIANTS)[keyof typeof BOTTOM_SHEET_VARIANTS];
/** How far the sheet is open */
export type BottomSheetState = (typeof BOTTOM_SHEET_STATES)[keyof typeof BOTTOM_SHEET_STATES];
/** What a state change reports */
export interface BottomSheetStateEvent {
    /** The state the sheet has moved to */
    state: BottomSheetState;
    /** The state it came from */
    previous: BottomSheetState;
}
/** Handlers accepted at creation, one per event name */
export interface BottomSheetEventHandlers {
    open?: () => void;
    close?: () => void;
    stateChange?: (event: BottomSheetStateEvent) => void;
    dragStart?: () => void;
    dragEnd?: (event: BottomSheetStateEvent) => void;
}
/** Configuration for the bottom sheet. */
export interface BottomSheetConfig {
    /**
 * Standard sheets leave the page usable; modal sheets cover it with a scrim and take focus.
 * @default 'modal'
 */
    variant?: BottomSheetVariant;
    /** Headline shown above the content. */
    title?: string;
    /** Accessible label for assistive technology when no visible `title` headline is provided. */
    ariaLabel?: string;
    /** Body of the sheet, as markup or an element */
    content?: string | HTMLElement;
    /**
 * The 32x4dp bar at the top edge, which says the sheet can be dragged.
 * @default true
 */
    dragHandle?: boolean;
    /** Height of the partially expanded state, in pixels: a sheet with more content shows this much of it until it is expanded. */
    peekHeight?: number;
    /**
 * The sheet stops growing at this width and centres itself, so it does not stretch across a desktop window.
 * @default 640
 */
    maxWidth?: number;
    /**
 * State to start in.
 * @default 'hidden'
 */
    initialState?: BottomSheetState;
    /**
 * Whether a click on the scrim closes a modal sheet.
 * @default true
 */
    closeOnScrimClick?: boolean;
    /**
 * Whether Escape closes a modal sheet.
 * @default true
 */
    closeOnEscape?: boolean;
    /** Where to mount the sheet. */
    container?: HTMLElement;
    /** `"top"` makes a modal sheet's root a `<dialog>` element, rendered in `container` like any sheet, and opens it with `showModal()`: in the browser's top layer, above every z-index and outside any clipping ancestor, with the rest of the page inert. */
    layer?: "top";
    /** Handlers registered at creation, equivalent to calling `on` for each */
    on?: BottomSheetEventHandlers;
    /** Extra classes for the root element */
    class?: string;
    prefix?: string;
    componentName?: string;
}
/** A bottom sheet instance. */
export interface BottomSheetComponent {
    /** The root element, which holds the scrim and the container */
    element: HTMLElement;
    /** Opens the sheet, partially expanded */
    open: () => BottomSheetComponent;
    /** Closes the sheet */
    close: () => BottomSheetComponent;
    /** Opens the sheet to its full height */
    expand: () => BottomSheetComponent;
    /** Returns the sheet to the peek height */
    collapse: () => BottomSheetComponent;
    /** Whether the sheet is showing at all */
    isOpen: () => boolean;
    /** How far the sheet is open */
    getState: () => BottomSheetState;
    /** Replaces the body of the sheet */
    setContent: (content: string | HTMLElement) => BottomSheetComponent;
    /** Replaces the headline */
    setTitle: (title: string) => BottomSheetComponent;
    /** Adds an event listener */
    on: <T extends keyof BottomSheetEventHandlers>(event: T, handler: NonNullable<BottomSheetEventHandlers[T]>) => BottomSheetComponent;
    /** Removes an event listener */
    off: <T extends keyof BottomSheetEventHandlers>(event: T, handler: NonNullable<BottomSheetEventHandlers[T]>) => BottomSheetComponent;
    /** Removes the sheet from the page and releases its listeners */
    destroy: () => void;
    /** Prefixes a class name, for styling hooks */
    getClass: (name: string) => string;
}
