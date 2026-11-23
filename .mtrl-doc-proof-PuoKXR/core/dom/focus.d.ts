/**
 * The focused element as seen from a node's own root: the shadow root it lives in, or the document.
 * @param node
 */
export declare const activeElementOf: (node: Node) => Element | null;
/** The element that really has focus, looked for through open shadow roots: where focus goes back to after an overlay closes, when the overlay may sit in another root than whatever opened it. */
export declare const deepActiveElement: () => Element | null;
/** The tab stops in a container, in the order Tab reaches them: through slots to what is assigned to them and into shadow roots, which is where the content of a web component sits. */
export declare const tabStops: (container: Element) => HTMLElement[];
/**
 * Keeps Tab inside a modal: from its last tab stop to its first, and Shift+Tab from the first (or the modal itself) to the last.
 * @param container
 * @param event
 */
export declare const wrapTab: (container: HTMLElement, event: KeyboardEvent) => void;
