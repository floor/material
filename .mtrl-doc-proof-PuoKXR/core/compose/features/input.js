import { omitsAttribute } from "../../utils/attributes.js";
function hasEmit(component) {
    return "emit" in component && typeof component.emit === "function";
}
export const withInput = (config = {}) => (component) => {
    const input = document.createElement("input");
    const name = component.componentName || "component";
    input.type = "checkbox";
    input.className = `${component.getClass(name)}__input`;
    input.style.position = "absolute";
    input.style.opacity = "0";
    input.style.cursor = "pointer";
    component.element.setAttribute("role", "presentation");
    input.setAttribute("role", name);
    const attributes = {
        name: config.name,
        checked: config.checked,
        required: config.required,
        disabled: config.disabled,
        value: config.value || "on",
        "aria-label": config.ariaLabel || (typeof config.label === "string" ? config.label : undefined),
    };
    Object.entries(attributes).forEach(([key, value]) => {
        if (value !== null && value !== undefined && !omitsAttribute(key, value)) {
            if (key === "disabled" && value === true) {
                input.disabled = true;
                input.setAttribute("disabled", "true");
            }
            else if (value === true) {
                input.setAttribute(key, key);
            }
            else {
                input.setAttribute(key, String(value));
            }
        }
    });
    input.addEventListener("change", (event) => {
        if (hasEmit(component)) {
            component.emit("change", {
                checked: input.checked,
                value: input.checked,
                valueAttribute: input.value,
                nativeEvent: event,
            });
        }
    });
    input.addEventListener("keydown", (event) => {
        if (event.key === " " || (event.key === "Enter" && config.enterToggles !== false)) {
            event.preventDefault();
            input.click();
        }
    });
    component.element.appendChild(input);
    return {
        ...component,
        input,
        getValue: () => input.checked,
        setValue(value) {
            input.checked = value;
            return this;
        },
        getValueAttribute: () => input.value,
        setValueAttribute(value) {
            input.value = value;
            return this;
        },
    };
};
