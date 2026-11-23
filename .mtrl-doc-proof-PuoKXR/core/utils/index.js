export { isObject, byString } from "./object.js";
export { normalizeEvent, hasTouchSupport, TOUCH_CONFIG, PASSIVE_EVENTS } from "./mobile.js";
export { getInheritedBackground } from "./background.js";
export { throttle, debounce, once } from "./performance.js";
export { getThemeColor } from "./theme.js";
export { colorToRGBA } from "./color.js";
export { isSafeUrl, safeUrl, URL_ATTRIBUTES } from "./url.js";
export const when = (predicate, transformer) => (obj, context) => predicate(obj, context) ? transformer(obj, context) : obj;
export const classNames = (...classes) => classes.filter(Boolean).join(' ');
