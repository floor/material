export { isObject, byString } from "./object.js";
export { normalizeEvent, hasTouchSupport, TOUCH_CONFIG, PASSIVE_EVENTS } from "./mobile.js";
export { getInheritedBackground } from "./background.js";
export { throttle, debounce, once } from "./performance.js";
export { getThemeColor } from "./theme.js";
export { colorToRGBA } from "./color.js";
export { isSafeUrl, safeUrl, URL_ATTRIBUTES } from "./url.js";
/**
 * Creates a transformer that only runs if a condition is met
 * @param predicate
 * @param transformer
 */
export declare const when: <T, C>(predicate: (obj: T, context: C) => boolean, transformer: (obj: T, context: C) => T) => (obj: T, context: C) => T;
/**
 * Joins class names, filtering out falsy values
 * @param classes
 */
export declare const classNames: (...classes: (string | undefined | null | false)[]) => string;
