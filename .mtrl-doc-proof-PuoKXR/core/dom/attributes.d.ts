/**
 * Set attributes on an element with performance optimizations
 * @param element
 * @param attributes
 */
export declare const setAttributes: <E extends HTMLElement | SVGElement>(element: E, attributes?: object) => E;
/**
 * Remove attributes from an element
 * @param element
 * @param attributes
 */
export declare const removeAttributes: (element: HTMLElement, attributes?: string[]) => HTMLElement;
/**
 * Batch attribute operations for better performance when setting many attributes
 * @param element
 */
export declare const batchAttributes: (element: HTMLElement, operations: Array<{
    action: "set" | "remove";
    key: string;
    value?: unknown;
}>) => HTMLElement;
/**
 * Check if element has attribute
 * @param element
 * @param attribute
 */
export declare const hasAttribute: (element: HTMLElement, attribute: string) => boolean;
/**
 * Get attribute value with default
 * @param element
 * @param attribute
 * @param defaultValue
 */
export declare const getAttribute: (element: HTMLElement, attribute: string, defaultValue?: string) => string;
