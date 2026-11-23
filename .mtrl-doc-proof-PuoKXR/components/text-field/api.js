import { warnDev } from "../../core/utils/warn.js";
export const withAPI = ({ disabled, lifecycle }) => (component) => {
    const element = component.element;
    const classes = element.classList;
    const fieldClass = component.getClass("text-field");
    const variantClass = (variant) => `${fieldClass}--${variant}`;
    const schedulePlacement = () => {
        if (component.updateElementPositions)
            component.schedulePositionUpdate?.();
    };
    const setTrailingDisabled = (off) => {
        const icon = component.trailingIcon;
        if (icon?.tagName === "BUTTON")
            icon.disabled = off;
    };
    return {
        element: element,
        field: component.field ?? element,
        input: component.input,
        getValue: component.getValue || (() => ""),
        setValue(value) {
            component.setValue?.(value);
            return this;
        },
        setAttribute(name, value) {
            component.setAttribute?.(name, value);
            return this;
        },
        getAttribute(name) {
            return component.getAttribute?.(name) || null;
        },
        removeAttribute(name) {
            component.removeAttribute?.(name);
            return this;
        },
        setVariant(variant) {
            classes.remove(variantClass("filled"), variantClass("outlined"));
            classes.add(variantClass(variant));
            schedulePlacement();
            return this;
        },
        getVariant() {
            if (classes.contains(variantClass("outlined"))) {
                return "outlined";
            }
            return "filled";
        },
        setLabel(text) {
            component.label?.setText(text);
            schedulePlacement();
            return this;
        },
        getLabel() {
            return component.label?.getText() || "";
        },
        get leadingIcon() {
            return component.leadingIcon ?? null;
        },
        setLeadingIcon(html) {
            if (component.setLeadingIcon) {
                component.setLeadingIcon(html);
                schedulePlacement();
            }
            return this;
        },
        removeLeadingIcon() {
            if (component.removeLeadingIcon) {
                component.removeLeadingIcon();
                schedulePlacement();
            }
            return this;
        },
        get trailingIcon() {
            return component.trailingIcon ?? null;
        },
        setTrailingIcon(html, label) {
            if (component.setTrailingIcon) {
                component.setTrailingIcon(html, label);
                schedulePlacement();
            }
            return this;
        },
        removeTrailingIcon() {
            if (component.removeTrailingIcon) {
                component.removeTrailingIcon();
                schedulePlacement();
            }
            return this;
        },
        get supportingTextElement() {
            return element.querySelector(`.${component.getClass("text-field__helper")}`);
        },
        setSupportingText(text, isError) {
            component.setSupportingText?.(text, isError);
            return this;
        },
        removeSupportingText() {
            component.removeSupportingText?.();
            return this;
        },
        get prefixTextElement() {
            return component.prefixTextElement ?? null;
        },
        setPrefixText(text) {
            if (component.setPrefixText) {
                component.setPrefixText(text);
                schedulePlacement();
            }
            return this;
        },
        removePrefixText() {
            if (component.removePrefixText) {
                component.removePrefixText();
                schedulePlacement();
            }
            return this;
        },
        get suffixTextElement() {
            return component.suffixTextElement ?? null;
        },
        setSuffixText(text) {
            if (component.setSuffixText) {
                component.setSuffixText(text);
                schedulePlacement();
            }
            return this;
        },
        removeSuffixText() {
            if (component.removeSuffixText) {
                component.removeSuffixText();
                schedulePlacement();
            }
            return this;
        },
        updatePositions() {
            if (component.input) {
                const hasValue = component.input.value;
                let isAutofilled = false;
                try {
                    isAutofilled = component.input.matches?.(":-webkit-autofill") || false;
                }
                catch {
                }
                classes.toggle(`${fieldClass}--empty`, !(hasValue || isAutofilled));
            }
            component.updateElementPositions?.();
            return this;
        },
        setError(error, message) {
            component.setError?.(error, message);
            return this;
        },
        isError() {
            return component.isError?.() || false;
        },
        setDensity(density) {
            component.density?.set?.(density);
            component.schedulePositionUpdate?.();
            return this;
        },
        getDensity() {
            return component.density?.current || "default";
        },
        on(event, handler) {
            component.on?.(event, handler);
            if (event === "trailing" && /*#__PURE__*/ (() => {
                try {
                    return process.env.NODE_ENV !== "production";
                }
                catch {
                    return false;
                }
            })() && process.env.NODE_ENV !== "production") {
                const host = handler.__h;
                if (host)
                    element.__h = host;
                else if (component.trailingIcon?.tagName === "SPAN")
                    checkTrailingLabel(element.__h ?? element);
            }
            return this;
        },
        off(event, handler) {
            component.off?.(event, handler);
            return this;
        },
        enable() {
            disabled.enable();
            setTrailingDisabled(false);
            return this;
        },
        isDisabled() {
            return disabled.isDisabled();
        },
        disable() {
            disabled.disable();
            setTrailingDisabled(true);
            return this;
        },
        setRequired(required) {
            component.setRequired?.(required);
            component.schedulePositionUpdate?.();
            return this;
        },
        isRequired() {
            return component.isRequired?.() ?? Boolean(component.input?.required);
        },
        destroy() {
            lifecycle.destroy();
        },
    };
};
const warned = /*#__PURE__*/ new WeakSet();
export const checkTrailingLabel = (element) => {
    if (!warned.has(element)) {
        warned.add(element);
        warnDev('text-field', 'Set trailingIconLabel/trailing-icon-label');
    }
};
