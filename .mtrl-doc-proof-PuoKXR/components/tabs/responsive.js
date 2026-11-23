import { setupResponsiveBehavior } from "./responsive-legacy.js";
export const tabsResponsive = (config = {}) => (tabs) => {
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined')
        return;
    setupResponsiveBehavior(tabs, config);
};
