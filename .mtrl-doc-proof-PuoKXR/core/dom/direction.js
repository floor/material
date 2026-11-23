import { PREFIX } from "../config.js";
const reflectHost = (element) => {
    const rtl = typeof getComputedStyle === "function" && getComputedStyle(element).direction === "rtl";
    element._m = true;
    element.classList.toggle(PREFIX + "-rtl", rtl);
    element.classList.toggle(PREFIX + "-ltr", !rtl && !!element.closest("[dir=rtl]"));
};
const reflectFactory = (element) => {
    const nearest = element.closest("[dir]");
    const dir = nearest?.getAttribute("dir");
    element._m = true;
    element.classList.toggle(PREFIX + "-rtl", dir === "rtl");
    element.classList.toggle(PREFIX + "-ltr", dir === "ltr" && !!nearest?.closest("[dir=rtl]"));
};
const tracked = new Map();
const follow = (element, reflect) => {
    if (typeof MutationObserver !== "function")
        return;
    tracked.set(element, reflect);
    if (element.isConnected)
        reflect(element);
    const owner = element.ownerDocument;
    if (owner._d)
        return;
    owner._d = new MutationObserver(() => {
        tracked.forEach((trackedReflect, trackedElement) => trackedElement.isConnected
            ? trackedReflect(trackedElement)
            : trackedElement._m && tracked.delete(trackedElement));
    });
    owner._d.observe(owner.documentElement, {
        attributes: true,
        attributeFilter: ["dir"],
        childList: true,
        subtree: true,
    });
};
export const trackDirection = (element) => follow(element, reflectHost);
export const trackFactoryDirection = (element) => follow(element, reflectFactory);
