import type { ButtonComponent } from "../button/types.js";
import type { EventCallback } from "../../core/state/emitter.js";
/** Dialog size types - determines the width and height of the dialog */
export type DialogSize = 'small' | 'medium' | 'large' | 'fullwidth' | 'fullscreen';
/** Dialog animation types - controls how the dialog appears and disappears */
export type DialogAnimation = 'scale' | 'slide-up' | 'slide-down' | 'fade';
/** Dialog footer alignment types - controls how buttons in the footer are aligned */
export type DialogFooterAlignment = 'right' | 'left' | 'center' | 'space-between';
/** Dialog event types - events that can be listened to with the on() method */
export type DialogEventType = 'open' | 'close' | 'beforeopen' | 'beforeclose' | 'afteropen' | 'afterclose';
/** Configuration interface for the Dialog component */
export interface DialogConfig {
    /** Dialog title text - appears in the header */
    title?: string;
    /** Dialog subtitle text - appears below title in smaller text */
    subtitle?: string;
    /** Dialog content (text or HTML) Can include rich content like forms, images, etc. */
    content?: string;
    /**
 * Whether to show a close affordance in the header.
 * @default false (true for the fullscreen size)
 */
    closeButton?: boolean;
    /** Accessible name for a dialog without a headline */
    ariaLabel?: string;
    /** ARIA role for the dialog. */
    role?: 'alertdialog' | 'dialog';
    /** Additional CSS classes to apply to the dialog */
    class?: string;
    /**
 * Dialog size variant
 * @default "medium"
 */
    size?: DialogSize | string;
    /**
 * Dialog animation variant
 * @default "scale"
 */
    animation?: DialogAnimation | string;
    /**
 * Footer buttons alignment
 * @default "right"
 */
    footerAlignment?: DialogFooterAlignment | string;
    /**
 * Whether dialog is initially open
 * @default false
 */
    open?: boolean;
    /**
 * Whether to close when clicking overlay background
 * @default true
 */
    closeOnOverlayClick?: boolean;
    /**
 * Whether to close when Escape key is pressed Escape is handled as a key press, in both layers, by the topmost open dialog only, and after whatever is open inside it (a menu, a select) has had the key.
 * @default true
 */
    closeOnEscape?: boolean;
    /**
 * Whether dialog should be modal
 * @default true
 */
    modal?: boolean;
    /**
 * Whether to focus the first focusable element when opened
 * @default true
 */
    autofocus?: boolean;
    /**
 * Whether to trap focus within dialog when opened
 * @default true
 */
    trapFocus?: boolean;
    /**
 * Parent element to append dialog to.
 * @default document.body
 */
    container?: HTMLElement;
    /** `"top"` makes the dialog itself a `<dialog>` element, rendered in place in `container` (or `document.body`) and kept there when it closes, and opens it with `showModal()`: in the browser's top layer, above every z-index and outside any clipping ancestor, with the rest of the page inert. */
    layer?: "top";
    /** Footer buttons configuration */
    buttons?: DialogButton[];
    /**
 * Whether to show a divider between header and content
 * @default false
 */
    divider?: boolean;
    /**
 * Dialog z-index - controls stacking order
 * @default 1000
 */
    zIndex?: number;
    /** How long `afteropen` and `afterclose` wait after opening and closing, in milliseconds, and when a closed dialog leaves the DOM. */
    animationDuration?: number;
    /** Event handlers for dialog events */
    on?: {
        [key in DialogEventType]?: (event: DialogEvent) => void;
    };
}
/** Dialog button configuration Defines the appearance and behavior of buttons in the dialog footer. */
export interface DialogButton {
    /** Button text label */
    text: string;
    /**
 * Button variant (uses button component variants)
 * @default "text"
 */
    variant?: string;
    /**
 * Button size
 * @default "medium"
 */
    size?: string;
    /**
 * Button click handler
 * @param event
 * @param dialog
 */
    onClick?: (event: MouseEvent, dialog: DialogComponent) => void | boolean;
    /**
 * Whether to close the dialog when this button is clicked
 * @default true
 */
    closeDialog?: boolean;
    /**
 * Whether to autofocus this button when the dialog opens
 * @default false
 */
    autofocus?: boolean;
    /** Additional button attributes to pass to the button element */
    attributes?: Record<string, unknown>;
}
/** Dialog event object Passed to event handlers registered with the on() method. */
export interface DialogEvent {
    /** Dialog component instance that triggered the event */
    dialog: DialogComponent;
    /** Original browser event if applicable */
    originalEvent?: Event;
    /** Call this method to prevent the default action */
    preventDefault: () => void;
    /** Whether the default action was prevented */
    defaultPrevented: boolean;
}
/** Dialog component interface */
/** The elements withStructure builds and hangs off the component. */
export interface DialogStructure {
    /** Always built by withStructure, whatever the config */
    header: HTMLElement;
    /** Always built by withStructure, whatever the config */
    content: HTMLElement;
    /** Only when the dialog has buttons, and set back to null when the last goes */
    footer: HTMLElement | null;
    /** The <hr> elements between the sections, only while shown */
    headerDivider: HTMLElement | null;
    footerDivider: HTMLElement | null;
    container: HTMLElement;
}
/** A footer button as the dialog keeps it: the live button component and the config it was built from. */
export interface DialogButtonRecord {
    instance: ButtonComponent;
    config: DialogButton;
}
/** What a dialog feature needs from the component it is handed. */
export interface DialogFeatureComponent {
    element: HTMLElement;
    config: DialogConfig & Record<string, unknown>;
    getClass: (name: string) => string;
    on: (event: string, handler: EventCallback) => unknown;
    off: (event: string, handler: EventCallback) => unknown;
    emit: (event: string, data?: unknown) => unknown;
    _buttons?: DialogButtonRecord[];
}
/** A dialog that has been through withStructure. */
export interface DialogStructured extends DialogFeatureComponent {
    overlay: HTMLElement;
    structure: DialogStructure;
}
export interface DialogComponent {
    /** The dialog's root DOM element */
    element: HTMLElement;
    /** The dialog's overlay/backdrop element */
    overlay: HTMLElement;
    /** Opens the dialog. */
    open: () => DialogComponent;
    /** Closes the dialog. */
    close: () => DialogComponent;
    /**
 * Toggles dialog open/closed state
 * @param open
 */
    toggle: (open?: boolean) => DialogComponent;
    /** Checks if dialog is currently open. */
    isOpen: () => boolean;
    /**
 * Sets dialog title text
 * @param title
 */
    setTitle: (title: string) => DialogComponent;
    /** Gets dialog current title text */
    getTitle: () => string;
    /**
 * Sets dialog subtitle text
 * @param subtitle
 */
    setSubtitle: (subtitle: string) => DialogComponent;
    /** Gets dialog current subtitle text */
    getSubtitle: () => string;
    /**
 * Sets dialog content
 * @param content
 */
    setContent: (content: string) => DialogComponent;
    /** Gets dialog content */
    getContent: () => string;
    /**
 * Adds a button to the dialog footer
 * @param button
 */
    addButton: (button: DialogButton) => DialogComponent;
    /**
 * Removes a button by index or text
 * @param indexOrText
 */
    removeButton: (indexOrText: number | string) => DialogComponent;
    /** Gets all footer buttons */
    getButtons: () => DialogButton[];
    /**
 * Sets footer button alignment
 * @param alignment
 */
    setFooterAlignment: (alignment: DialogFooterAlignment | string) => DialogComponent;
    /**
 * Sets dialog size
 * @param size
 */
    setSize: (size: DialogSize | string) => DialogComponent;
    /**
 * Adds an event listener to the dialog
 * @param event
 * @param handler
 */
    on: (event: DialogEventType | string, handler: (event: DialogEvent) => void) => DialogComponent;
    /**
 * Removes an event listener from the dialog
 * @param event
 * @param handler
 */
    off: (event: DialogEventType | string, handler: (event: DialogEvent) => void) => DialogComponent;
    /** Gets dialog header element */
    getHeaderElement: () => HTMLElement | null;
    /** Gets dialog content element */
    getContentElement: () => HTMLElement | null;
    /** Gets dialog footer element */
    getFooterElement: () => HTMLElement | null;
    /**
 * Shows or hides the divider between header and content
 * @param show
 */
    toggleDivider: (show: boolean) => DialogComponent;
    /** Checks if the dialog has a divider visible */
    hasDivider: () => boolean;
    /**
 * Creates a confirmation dialog with Yes/No buttons
 * @param options
 */
    confirm: (options?: DialogConfirmOptions) => Promise<boolean>;
    /** Destroys the dialog and removes it from DOM */
    destroy: () => void;
}
/** Options for confirmation dialog Used with the dialog.confirm() method to create a simple confirmation dialog with customizable options. */
export interface DialogConfirmOptions {
    /**
 * Confirmation dialog title
 * @default "Confirm"
 */
    title?: string;
    /** Confirmation message/question to display */
    message: string;
    /**
 * Confirm button text
 * @default "Yes"
 */
    confirmText?: string;
    /**
 * Cancel button text
 * @default "No"
 */
    cancelText?: string;
    /**
 * Confirm button variant
 * @default "filled"
 */
    confirmVariant?: string;
    /**
 * Cancel button variant
 * @default "text"
 */
    cancelVariant?: string;
    /**
 * Dialog size for the confirmation dialog
 * @default "small"
 */
    size?: DialogSize | string;
}
/** Registers DialogConfig with the global defaults map, so `setComponentDefaults("dialog", ...)` is typed without core importing anything from this component. */
declare module "../../core/config/global" {
    interface ComponentConfigMap {
        dialog?: Partial<DialogConfig>;
    }
}
