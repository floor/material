/** Result interface for background color lookup */
export interface BackgroundResult {
    /** The computed background color value */
    color: string;
    /** The element from which the color was obtained */
    element: HTMLElement | null;
}
/**
 * Gets the computed background color of an element or its ancestors.
 * @param element
 */
export declare const getInheritedBackground: (element: HTMLElement, maxDepth?: number) => BackgroundResult;
export default getInheritedBackground;
