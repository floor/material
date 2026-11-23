/** Canvas resize utilities */
/**
 * Observes an element for the two things that change a canvas backing store: its width, and the devicePixelRatio.
 * @param element
 * @param canvas
 * @param onResize
 */
export declare const observeCanvasResize: (element: HTMLElement, canvas: HTMLCanvasElement | null | undefined, onResize: () => void) => (() => void);
