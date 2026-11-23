import { SIDE_SHEET_VARIANTS, SIDE_SHEET_POSITIONS } from "./constants.js";
/** Docked or floating over a scrim */
export type SideSheetVariant = (typeof SIDE_SHEET_VARIANTS)[keyof typeof SIDE_SHEET_VARIANTS];
/** Which edge it docks to, in logical terms */
export type SideSheetPosition = (typeof SIDE_SHEET_POSITIONS)[keyof typeof SIDE_SHEET_POSITIONS];
/** Handlers accepted at creation, one per event name */
export interface SideSheetEventHandlers {
    open?: () => void;
    close?: () => void;
}
/** Configuration for the side sheet. */
export interface SideSheetConfig {
    /**
 * Standard sheets dock beside the page and leave it usable; modal sheets float over it behind a scrim and take focus.
 * @default 'modal'
 */
    variant?: SideSheetVariant;
    /**
 * Which edge to dock to.
 * @default 'end'
 */
    position?: SideSheetPosition;
    /** Headline in the header. */
    title?: string;
    /** Accessible label for assistive technology when no visible `title` headline is provided. */
    ariaLabel?: string;
    /** Body of the sheet, as markup or an element */
    content?: string | HTMLElement;
    /**
 * Width in pixels.
 * @default 256
 */
    width?: number;
    /**
 * The sheet never grows past this, so it does not take over a wide window.
 * @default 400
 */
    maxWidth?: number;
    /**
 * Whether the header carries a close button.
 * @default true
 */
    closeButton?: boolean;
    /**
 * Whether a click on the scrim closes a modal sheet.
 * @default true
 */
    closeOnScrimClick?: boolean;
    /**
 * Whether Escape closes it.
 * @default true
 */
    closeOnEscape?: boolean;
    /** Whether the sheet starts open */
    open?: boolean;
    /** Where to mount the sheet. */
    container?: HTMLElement;
    /** `"top"` makes a modal sheet's root a `<dialog>` element, rendered in `container` like any sheet, and opens it with `showModal()`: in the browser's top layer, above every z-index and outside any clipping ancestor, with the rest of the page inert. */
    layer?: "top";
    /** Handlers registered at creation, equivalent to calling `on` for each */
    on?: SideSheetEventHandlers;
    /** Extra classes for the root element */
    class?: string;
    prefix?: string;
    componentName?: string;
}
/** A side sheet instance. */
export interface SideSheetComponent {
    /** The root element, which holds the scrim and the container */
    element: HTMLElement;
    /** Opens the sheet */
    open: () => SideSheetComponent;
    /** Closes the sheet */
    close: () => SideSheetComponent;
    /** Opens it if closed, closes it if open */
    toggle: () => SideSheetComponent;
    /** Whether the sheet is showing */
    isOpen: () => boolean;
    /** Replaces the body */
    setContent: (content: string | HTMLElement) => SideSheetComponent;
    /** Replaces the headline */
    setTitle: (title: string) => SideSheetComponent;
    /** Adds an event listener */
    on: <T extends keyof SideSheetEventHandlers>(event: T, handler: NonNullable<SideSheetEventHandlers[T]>) => SideSheetComponent;
    /** Removes an event listener */
    off: <T extends keyof SideSheetEventHandlers>(event: T, handler: NonNullable<SideSheetEventHandlers[T]>) => SideSheetComponent;
    /** Removes the sheet from the page and releases its listeners */
    destroy: () => void;
    /** Prefixes a class name, for styling hooks */
    getClass: (name: string) => string;
}
