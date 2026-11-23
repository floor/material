/**
 * Normalize classes to array of unique strings with optimization and caching
 * @param classes
 */
export declare const normalizeClasses: (...classes: (string | string[])[]) => string[];
/**
 * Add prefixed classes to element with optimizations
 * @param element
 * @param classes
 */
export declare const addClass: (element: HTMLElement, ...classes: (string | string[])[]) => HTMLElement;
/**
 * Remove prefixed classes from element with optimizations
 * @param element
 * @param classes
 */
export declare const removeClass: (element: HTMLElement, ...classes: (string | string[])[]) => HTMLElement;
/**
 * Toggle prefixed classes on element with optimizations
 * @param element
 * @param classes
 */
export declare const toggleClass: (element: HTMLElement, ...classes: (string | string[])[]) => HTMLElement;
/**
 * Check if element has all specified prefixed classes with optimizations
 * @param element
 * @param classes
 */
export declare const hasClass: (element: HTMLElement, ...classes: (string | string[])[]) => boolean;
