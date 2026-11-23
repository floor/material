import { hasLifecycle, hasEmit } from "../utils/type-guards.js";
export const withTextInput = (config = {}) => (component) => {
    const isMultiline = config.multiline || config.type === "multiline";
    const input = document.createElement(isMultiline ? "textarea" : "input");
    input.className = `${component.getClass("text-field")}__input`;
    const attributes = {
        name: config.name,
        required: config.required,
        disabled: config.disabled,
        readonly: config.readonly,
        maxLength: config.maxLength,
        pattern: config.pattern,
        autocomplete: config.autocomplete,
        inputMode: config.inputMode,
        enterKeyHint: config.enterKeyHint,
        value: isMultiline ? undefined : config.value || "",
        placeholder: config.placeholder || " ",
        "aria-label": config.ariaLabel,
    };
    if (!isMultiline) {
        attributes.type = config.type || "text";
    }
    else {
        attributes["data-type"] = "multiline";
    }
    Object.entries(attributes).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            if (typeof value === "boolean") {
                if (value) {
                    input.setAttribute(key, "");
                }
            }
            else {
                input.setAttribute(key, String(value));
            }
        }
    });
    if (isMultiline)
        input.defaultValue = config.value || "";
    const updateInputState = () => {
        const isEmpty = !input.value;
        component.element.classList.toggle(`${component.getClass("text-field")}--empty`, isEmpty);
        return isEmpty;
    };
    const isAutofilled = () => {
        try {
            return input.matches(":autofill");
        }
        catch {
            try {
                return input.matches(":-webkit-autofill");
            }
            catch {
                return false;
            }
        }
    };
    const checkForAutofill = (shouldEmit = true) => {
        const autofilled = isAutofilled();
        if (input.value || autofilled) {
            component.element.classList.remove(`${component.getClass("text-field")}--empty`);
            if (shouldEmit && autofilled && hasEmit(component)) {
                component.emit("input", {
                    value: input.value,
                    isEmpty: false,
                    isAutofilled: true,
                });
            }
        }
    };
    let autofillObserver = null;
    if (typeof MutationObserver !== "undefined") {
        autofillObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "attributes" &&
                    (mutation.attributeName === "value" ||
                        mutation.attributeName === "data-autofilled")) {
                    checkForAutofill(true);
                }
            });
        });
        autofillObserver.observe(input, {
            attributes: true,
            attributeFilter: ["value", "data-autofilled", "autocomplete"],
        });
    }
    input.addEventListener("focus", () => {
        component.element.classList.add(`${component.getClass("text-field")}--focused`);
        if (hasEmit(component)) {
            component.emit("focus", { isEmpty: updateInputState() });
        }
        checkForAutofill(false);
    });
    input.addEventListener("blur", () => {
        component.element.classList.remove(`${component.getClass("text-field")}--focused`);
        if (hasEmit(component)) {
            component.emit("blur", { isEmpty: updateInputState() });
        }
        checkForAutofill(false);
    });
    input.addEventListener("input", () => {
        if (hasEmit(component)) {
            component.emit("input", {
                value: input.value,
                isEmpty: updateInputState(),
                isAutofilled: false,
            });
        }
        else {
            updateInputState();
        }
    });
    input.addEventListener("change", () => {
        const isEmpty = updateInputState();
        checkForAutofill(false);
        if (hasEmit(component)) {
            component.emit("change", {
                value: input.value,
                isEmpty,
                isAutofilled: isAutofilled(),
            });
        }
    });
    const animationTarget = input;
    animationTarget.addEventListener("animationstart", (e) => {
        if (e.animationName === "onAutoFillStart" ||
            e.animationName?.includes("autofill")) {
            checkForAutofill();
        }
    });
    updateInputState();
    if (isMultiline) {
        component.element.classList.add(`${component.getClass("text-field")}--multiline`);
    }
    (component.field ?? component.element).appendChild(input);
    if (hasLifecycle(component)) {
        const originalDestroy = component.lifecycle.destroy;
        component.lifecycle.destroy = () => {
            if (autofillObserver) {
                autofillObserver.disconnect();
            }
            input.remove();
            originalDestroy.call(component.lifecycle);
        };
    }
    return {
        ...component,
        input,
        setValue(value) {
            input.value = value || "";
            updateInputState();
            return this;
        },
        getValue() {
            return input.value;
        },
        setAttribute(name, value) {
            input.setAttribute(name, value);
            return this;
        },
        getAttribute(name) {
            return input.getAttribute(name);
        },
        removeAttribute(name) {
            input.removeAttribute(name);
            return this;
        },
    };
};
