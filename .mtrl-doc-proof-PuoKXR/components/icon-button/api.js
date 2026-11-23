export const withAPI = ({ disabled, lifecycle, toggleState }) => (component) => {
    const compName = component.componentName || "icon-button";
    const baseClass = component.getClass(compName);
    const iconAPI = {
        setIcon: (html) => {
            component.icon.setIcon(html);
            return iconAPI;
        },
        getIcon: () => component.icon.getIcon(),
        getElement: () => component.icon.getElement(),
    };
    const iconButtonComponent = {
        element: component.element,
        icon: iconAPI,
        disabled: {
            enable: () => disabled.enable(),
            disable: () => disabled.disable(),
            isDisabled: () => disabled.isDisabled(),
        },
        lifecycle: {
            destroy: () => lifecycle.destroy(),
        },
        getClass: component.getClass,
        getValue: () => component.element.value,
        setValue(value) {
            component.element.value = value;
            return iconButtonComponent;
        },
        getVariant() {
            const variants = [
                "filled",
                "tonal",
                "outlined",
                "standard",
            ];
            for (const variant of variants) {
                if (component.element.classList.contains(`${baseClass}--${variant}`)) {
                    return variant;
                }
            }
            return "standard";
        },
        setVariant(variant) {
            const variants = ["filled", "tonal", "outlined", "standard"];
            variants.forEach((v) => {
                component.element.classList.remove(`${baseClass}--${v}`);
            });
            component.element.classList.add(`${baseClass}--${variant}`);
            return iconButtonComponent;
        },
        getSize() {
            const sizes = ["xs", "s", "m", "l", "xl"];
            for (const size of sizes) {
                if (component.element.classList.contains(`${baseClass}--${size}`)) {
                    return size;
                }
            }
            return "s";
        },
        setSize(size) {
            const sizes = ["xs", "s", "m", "l", "xl"];
            sizes.forEach((s) => {
                component.element.classList.remove(`${baseClass}--${s}`);
            });
            if (size !== "s") {
                component.element.classList.add(`${baseClass}--${size}`);
            }
            return iconButtonComponent;
        },
        getShape() {
            const shapes = ["round", "square"];
            for (const shape of shapes) {
                if (component.element.classList.contains(`${baseClass}--${shape}`)) {
                    return shape;
                }
            }
            return "round";
        },
        setShape(shape) {
            const shapes = ["round", "square"];
            shapes.forEach((s) => {
                component.element.classList.remove(`${baseClass}--${s}`);
            });
            if (shape !== "round") {
                component.element.classList.add(`${baseClass}--${shape}`);
            }
            return iconButtonComponent;
        },
        getWidth() {
            const widths = ["narrow", "default", "wide"];
            for (const width of widths) {
                if (component.element.classList.contains(`${baseClass}--${width}`)) {
                    return width;
                }
            }
            return "default";
        },
        setWidth(width) {
            const widths = ["narrow", "default", "wide"];
            widths.forEach((w) => {
                component.element.classList.remove(`${baseClass}--${w}`);
            });
            if (width !== "default") {
                component.element.classList.add(`${baseClass}--${width}`);
            }
            return iconButtonComponent;
        },
        enable() {
            disabled.enable();
            return iconButtonComponent;
        },
        isDisabled() {
            return disabled.isDisabled();
        },
        disable() {
            disabled.disable();
            return iconButtonComponent;
        },
        setIcon(icon) {
            if (toggleState?.isToggle() && !toggleState.isSelected()) {
                toggleState.setIcon(icon);
            }
            component.icon.setIcon(icon);
            return iconButtonComponent;
        },
        getIcon() {
            return component.icon.getIcon();
        },
        setSelectedIcon(icon) {
            if (toggleState) {
                toggleState.setSelectedIcon(icon);
            }
            return iconButtonComponent;
        },
        getSelectedIcon() {
            return toggleState?.getSelectedIcon() || "";
        },
        isToggle() {
            return toggleState?.isToggle() || false;
        },
        select() {
            if (toggleState) {
                toggleState.select();
            }
            return iconButtonComponent;
        },
        deselect() {
            if (toggleState) {
                toggleState.deselect();
            }
            return iconButtonComponent;
        },
        toggleSelected() {
            if (toggleState) {
                toggleState.toggle();
            }
            return iconButtonComponent;
        },
        isSelected() {
            return toggleState?.isSelected() || false;
        },
        setAriaLabel(label) {
            component.element.setAttribute("aria-label", label);
            return iconButtonComponent;
        },
        destroy() {
            lifecycle.destroy();
        },
        on(event, handler) {
            component.on(event, handler);
            return iconButtonComponent;
        },
        off(event, handler) {
            component.off(event, handler);
            return iconButtonComponent;
        },
        addClass(...classes) {
            if (component.addClass) {
                component.addClass(...classes);
            }
            else {
                classes.forEach((cls) => component.element.classList.add(cls));
            }
            return iconButtonComponent;
        },
        removeClass(...classes) {
            if (component.removeClass) {
                component.removeClass(...classes);
            }
            else {
                classes.forEach((cls) => component.element.classList.remove(cls));
            }
            return iconButtonComponent;
        },
    };
    return iconButtonComponent;
};
