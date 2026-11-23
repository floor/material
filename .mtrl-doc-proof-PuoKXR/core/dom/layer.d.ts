/** How an element is promoted to the browser's top layer: */
export type TopLayerKind = "popover-auto" | "popover-manual" | "modal";
export interface TopLayerOptions {
    kind: TopLayerKind;
}
type Layered = Omit<HTMLElement, "showPopover"> & Partial<Pick<HTMLDialogElement & HTMLElement, "showModal" | "close" | "open" | "showPopover">>;
/**
 * Whether the browser can show an element of this kind in the top layer: `showPopover` for the popovers, `HTMLDialogElement.prototype.showModal` for a modal.
 * @param kind
 */
export declare const supportsTopLayer: (kind: TopLayerKind) => boolean;
/**
 * Shows an element in the top layer, above everything else on the page whatever its z-index and whatever clips or transforms its ancestors.
 * @param element
 * @param options
 */
export declare const showInTopLayer: (element: Layered, { kind }: TopLayerOptions) => boolean;
/**
 * Takes an element out of the top layer.
 * @param element
 */
export declare const hideFromTopLayer: (element: Layered) => void;
/**
 * Reports the closes the browser makes on its own: a light dismiss or Escape for `popover="auto"` (a `toggle` event to `closed`), Escape or a form for a modal dialog (its `close` event, which follows an uncanceled `cancel`).
 * @param element
 * @param callback
 */
export declare const onTopLayerClose: (element: HTMLElement, callback: () => void) => (() => void);
/** A modal outside the top layer: makes everything but `keep` inert, as showModal() does for a top-layer dialog. */
export declare const inertOutside: (keep: Element) => (() => void);
/** What eventsFrom returns: see there. */
export interface EventsFrom {
    /** Whether the event's dispatch began after the call */
    after: (event: Event) => boolean;
    /** Releases the marker. */
    stop: () => void;
}
/**
 * Tells the events that came after this call from the one that was already on its way: "the event that opened an overlay never dismisses it".
 * @param element
 */
export declare const eventsFrom: (element: HTMLElement) => EventsFrom;
/** A modal's place in the Escape stack: see onModalEscape. */
export interface ModalEscape {
    /** True for the rest of the task the modal opened in, for the one event the marker cannot number: the `cancel` the browser sends the topmost modal `<dialog>` for the key press that opened it, when the page stopped that key press before it reached the window. */
    opening: boolean;
    /** Takes the modal off the stack. */
    stop: () => void;
}
/**
 * Escape for a modal, handled as a key press.
 * @param element
 * @param escape
 * @param d
 */
export declare const onModalEscape: (element: HTMLElement, escape: () => void, d?: (() => unknown) | false) => ModalEscape;
export {};
