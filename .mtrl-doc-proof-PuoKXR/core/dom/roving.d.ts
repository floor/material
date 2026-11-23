/** Whether the arrow keys, Home and End belong to an element: a text input, a textarea or editable content, where they move the caret. */
export declare const isTextEditable: (element: EventTarget | null | undefined) => boolean;
export interface RovingOptions {
    /** The composite: it receives the key and focus listeners. */
    container: HTMLElement;
    /** The focus targets in order. */
    targets: () => HTMLElement[];
    /** Whether Up and Down move focus instead of Left and Right. */
    vertical?: () => boolean;
}
export interface Roving {
    /** Puts the one tab stop back on the current target, or the first enabled one. */
    sync(): void;
    /** Removes the listeners and disabled-state observer. */
    destroy(): void;
}
/** A roving tab index over a composite's focus targets (the WAI-ARIA toolbar pattern): one tab stop, kept on the target focused last; the arrow keys along the layout, Left and Right following the reading direction; Home and End to the ends. */
export declare const createRoving: ({ container, targets, vertical }: RovingOptions) => Roving;
