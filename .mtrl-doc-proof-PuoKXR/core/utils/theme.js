import { PREFIX } from "../config.js";
const themeChangeCallbacks = new Set();
let themeObserver = null;
const setupThemeObserver = () => {
    if (themeObserver)
        return;
    themeObserver = new MutationObserver(() => {
        themeChangeCallbacks.forEach(callback => callback());
    });
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-theme-mode'],
        subtree: true,
    });
};
export const onThemeChange = (callback) => {
    if (!themeObserver) {
        setupThemeObserver();
    }
    themeChangeCallbacks.add(callback);
    return () => {
        themeChangeCallbacks.delete(callback);
        if (themeChangeCallbacks.size === 0) {
            themeObserver?.disconnect();
            themeObserver = null;
        }
    };
};
const HEX = /^#([\da-f]{6}|[\da-f]{3})$/i;
const RGB_TRIPLET = /^\d+,\s*\d+,\s*\d+$/;
const hexToTriplet = (value) => {
    if (!HEX.test(value))
        return null;
    const hex = value.slice(1);
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    return [0, 2, 4].map((i) => parseInt(full.substring(i, i + 2), 16)).join(', ');
};
const readVar = (name, element) => {
    const read = (from) => getComputedStyle(from).getPropertyValue(`--${PREFIX}-${name}`).trim();
    return element?.isConnected ? read(element) : read(document.body) || read(document.documentElement);
};
export function getThemeColor(varName, options) {
    if (options?.onThemeChange) {
        onThemeChange(options.onThemeChange);
    }
    const value = readVar(varName, options?.element);
    if (!value && options?.fallback)
        return options.fallback;
    if (!value)
        return '';
    if (typeof options?.alpha === 'number') {
        const triplet = RGB_TRIPLET.test(value) ? value : hexToTriplet(value);
        if (triplet)
            return `rgba(${triplet}, ${options.alpha})`;
    }
    return value;
}
if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
        if (themeObserver) {
            themeObserver.disconnect();
            themeObserver = null;
        }
        themeChangeCallbacks.clear();
    });
}
