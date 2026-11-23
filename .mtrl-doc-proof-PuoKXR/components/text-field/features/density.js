export const withDensity = (config) => (component) => {
    const PREFIX = config.prefix || "mtrl";
    const COMPONENT = config.componentName || "text-field";
    const density = config.density || "default";
    if (density !== "default") {
        component.element.classList.add(`${PREFIX}-${COMPONENT}--density-${density}`);
    }
    component.element.setAttribute("data-density", density);
    if (component.input) {
        applyDensityStyles(component.input, density);
    }
    function applyDensityStyles(element, density) {
        element.setAttribute("data-density", density);
    }
    const setDensity = (newDensity) => {
        ["default", "compact"].forEach((d) => {
            component.element.classList.remove(`${PREFIX}-${COMPONENT}--density-${d}`);
        });
        if (newDensity !== "default") {
            component.element.classList.add(`${PREFIX}-${COMPONENT}--density-${newDensity}`);
        }
        component.element.setAttribute("data-density", newDensity);
        if (component.input) {
            component.input.setAttribute("data-density", newDensity);
        }
        if (component.density) {
            component.density.current = newDensity;
        }
        if (component.updateElementPositions) {
            component.updateElementPositions();
        }
    };
    component.density = {
        current: density,
        set: setDensity,
    };
    return component;
};
