export const withHeadline = (config) => (component) => {
    let headlineElement = null;
    let headlineText = config.headline || "";
    if (headlineText) {
        headlineElement = document.createElement("div");
        headlineElement.className = component.getClass("drawer__headline");
        headlineElement.textContent = headlineText;
    }
    const setHeadline = (text) => {
        headlineText = text;
        if (!config.ariaLabel)
            component.element.setAttribute("aria-label", text || "Navigation");
        if (text) {
            if (!headlineElement) {
                headlineElement = document.createElement("div");
                headlineElement.className = component.getClass("drawer__headline");
            }
            headlineElement.textContent = text;
            component.element.querySelector(`.${component.getClass("drawer__sheet")}`)?.prepend(headlineElement);
        }
        else if (headlineElement && headlineElement.parentNode) {
            headlineElement.parentNode.removeChild(headlineElement);
            headlineElement = null;
        }
    };
    const getHeadline = () => headlineText;
    return {
        ...component,
        headlineElement,
        drawerHeadline: {
            setHeadline,
            getHeadline,
            getElement: () => headlineElement,
        },
    };
};
