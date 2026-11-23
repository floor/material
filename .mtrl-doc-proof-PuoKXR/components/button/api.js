import { addClass } from "../../core/index.js";
import { setHTML } from "../../core/dom/html.js";
const getButtonClass = (component) => {
    const name = component.componentName || "button";
    return component.getClass(name);
};
export const withAPI = ({ disabled, lifecycle }) => (component) => {
    const textAPI = {
        setText: (content) => {
            component.text.setText(content);
            return textAPI;
        },
        getText: () => component.text.getText(),
        getElement: () => component.text.getElement(),
    };
    const iconAPI = {
        setIcon: (html) => {
            component.icon.setIcon(html);
            return iconAPI;
        },
        getIcon: () => component.icon.getIcon(),
        getElement: () => component.icon.getElement(),
    };
    const buttonComponent = {
        element: component.element,
        text: textAPI,
        icon: iconAPI,
        disabled,
        lifecycle,
        getClass: component.getClass,
        get progress() { return component.progress; },
        on: (event, handler) => {
            if (component.on) {
                component.on(event, handler);
            }
            return buttonComponent;
        },
        off: (event, handler) => {
            if (component.off) {
                component.off(event, handler);
            }
            return buttonComponent;
        },
        addClass: (...classes) => {
            if (component.addClass) {
                component.addClass(...classes);
            }
            else {
                addClass(component.element, ...classes);
            }
            return buttonComponent;
        },
        getValue: () => component.element.value,
        setValue(value) {
            component.element.value = value;
            return buttonComponent;
        },
        enable() {
            disabled.enable();
            return buttonComponent;
        },
        isDisabled() {
            return disabled.isDisabled();
        },
        disable() {
            disabled.disable();
            return buttonComponent;
        },
        setText(content) {
            component.text.setText(content);
            return buttonComponent;
        },
        getText() {
            return component.text.getText();
        },
        hasIcon() {
            const iconElement = component.icon.getElement();
            return !!(iconElement?.innerHTML.trim() && iconElement.parentNode);
        },
        setIcon(icon) {
            const buttonClass = getButtonClass(component);
            if (!icon) {
                const iconElement = component.icon.getElement();
                if (iconElement && iconElement.parentNode) {
                    iconElement.parentNode.removeChild(iconElement);
                    component.icon.getElement = () => null;
                    component.icon.getIcon = () => "";
                }
                component.element.classList.remove(`${buttonClass}--icon`);
            }
            else if (!buttonComponent.hasIcon()) {
                const newIconElement = document.createElement("span");
                newIconElement.className = `${component.getClass("button__icon")}`;
                setHTML(newIconElement, icon);
                component.element.insertBefore(newIconElement, component.element.firstChild);
                component.icon.getElement = () => newIconElement;
                component.icon.getIcon = () => icon;
                component.element.classList.add(`${buttonClass}--icon`);
            }
            else {
                const iconElement = component.icon.getElement();
                if (iconElement) {
                    setHTML(iconElement, icon);
                }
            }
            return buttonComponent;
        },
        getIcon() {
            return buttonComponent.hasIcon() ? component.icon.getIcon() : "";
        },
        setVariant(variant) {
            const buttonClass = getButtonClass(component);
            for (const variant of ["filled", "tonal", "outlined", "elevated", "text"]) {
                component.element.classList.remove(`${buttonClass}--${variant}`);
            }
            component.element.classList.add(`${buttonClass}--${variant}`);
            return buttonComponent;
        },
        getVariant() {
            const buttonClass = getButtonClass(component);
            return ["filled", "tonal", "outlined", "elevated", "text"].find(value => component.element.classList.contains(`${buttonClass}--${value}`)) || "filled";
        },
        getSize() {
            const buttonClass = getButtonClass(component);
            return ["xs", "s", "m", "l", "xl"].find(value => component.element.classList.contains(`${buttonClass}--${value}`)) || "s";
        },
        setSize(size) {
            const buttonClass = getButtonClass(component);
            for (const size of ["xs", "s", "m", "l", "xl"]) {
                component.element.classList.remove(`${buttonClass}--${size}`);
            }
            component.element.classList.add(`${buttonClass}--${size}`);
            return buttonComponent;
        },
        getShape() {
            const buttonClass = getButtonClass(component);
            return ["round", "square"].find(value => component.element.classList.contains(`${buttonClass}--${value}`)) || "round";
        },
        setShape(shape) {
            const buttonClass = getButtonClass(component);
            for (const shape of ["round", "square"]) {
                component.element.classList.remove(`${buttonClass}--${shape}`);
            }
            component.element.classList.add(`${buttonClass}--${shape}`);
            return buttonComponent;
        },
        setActive(active) {
            if (active) {
                component.element.classList.add(`${component.getClass("button")}--active`);
            }
            else {
                component.element.classList.remove(`${component.getClass("button")}--active`);
            }
            return buttonComponent;
        },
        setSelected(selected) {
            component.toggle?.setSelected(selected);
            return buttonComponent;
        },
        isSelected: () => component.toggle?.isSelected() ?? false,
        setAriaLabel(label) {
            component.element.setAttribute("aria-label", label);
            return buttonComponent;
        },
        destroy() {
            lifecycle.destroy();
        },
    };
    if (component.showProgress) {
        buttonComponent.showProgress = async () => {
            await component.showProgress();
            return buttonComponent;
        };
    }
    if (component.showProgressSync) {
        buttonComponent.showProgressSync = () => {
            component.showProgressSync();
            return buttonComponent;
        };
    }
    if (component.hideProgress) {
        buttonComponent.hideProgress = async () => {
            await component.hideProgress();
            return buttonComponent;
        };
    }
    if (component.hideProgressSync) {
        buttonComponent.hideProgressSync = () => {
            component.hideProgressSync();
            return buttonComponent;
        };
    }
    if (component.setProgress) {
        buttonComponent.setProgress = async (value) => {
            await component.setProgress(value);
            return buttonComponent;
        };
    }
    if (component.setProgressSync) {
        buttonComponent.setProgressSync = (value) => {
            component.setProgressSync(value);
            return buttonComponent;
        };
    }
    if (component.setIndeterminate) {
        buttonComponent.setIndeterminate = async (indeterminate) => {
            await component.setIndeterminate(indeterminate);
            return buttonComponent;
        };
    }
    if (component.setIndeterminateSync) {
        buttonComponent.setIndeterminateSync = (indeterminate) => {
            component.setIndeterminateSync(indeterminate);
            return buttonComponent;
        };
    }
    if (component.setLoading) {
        buttonComponent.setLoading = async (loading, text) => {
            await component.setLoading(loading, text);
            return buttonComponent;
        };
    }
    if (component.setLoadingSync) {
        buttonComponent.setLoadingSync = (loading, text) => {
            component.setLoadingSync(loading, text);
            return buttonComponent;
        };
    }
    return buttonComponent;
};
