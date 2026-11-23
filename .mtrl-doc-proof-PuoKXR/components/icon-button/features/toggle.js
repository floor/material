import { getCleanup } from "../../../core/compose/cleanup.js";
export const withToggle = (config) => (component) => {
    if (!config.toggle) {
        return {
            ...component,
            toggleState: {
                select: function () {
                    return this;
                },
                deselect: function () {
                    return this;
                },
                toggle: function () {
                    return this;
                },
                isSelected: () => false,
                isToggle: () => false,
                setIcon: function () {
                    return this;
                },
                setSelectedIcon: function () {
                    return this;
                },
                getSelectedIcon: () => "",
            },
        };
    }
    const prefix = config.prefix || "mtrl";
    const componentName = config.componentName || "icon-button";
    const selectedClass = `${prefix}-${componentName}--selected`;
    let isSelected = config.selected || false;
    let unselectedIcon = config.icon || "";
    let selectedIcon = config.selectedIcon || "";
    const updateIcon = () => {
        if (!component.icon)
            return;
        const iconToShow = isSelected && selectedIcon ? selectedIcon : unselectedIcon;
        if (iconToShow) {
            component.icon.setIcon(iconToShow);
        }
    };
    const updateAriaPressed = () => {
        component.element.setAttribute("aria-pressed", String(isSelected));
    };
    const toggleState = {
        select() {
            if (!isSelected) {
                isSelected = true;
                component.element.classList.add(selectedClass);
                updateIcon();
                updateAriaPressed();
            }
            return this;
        },
        deselect() {
            if (isSelected) {
                isSelected = false;
                component.element.classList.remove(selectedClass);
                updateIcon();
                updateAriaPressed();
            }
            return this;
        },
        toggle() {
            if (isSelected) {
                this.deselect();
            }
            else {
                this.select();
            }
            return this;
        },
        isSelected() {
            return isSelected;
        },
        isToggle() {
            return true;
        },
        setIcon(html) {
            unselectedIcon = html;
            if (!isSelected) {
                updateIcon();
            }
            return this;
        },
        setSelectedIcon(html) {
            selectedIcon = html;
            if (isSelected) {
                updateIcon();
            }
            return this;
        },
        getSelectedIcon() {
            return selectedIcon;
        },
    };
    if (isSelected) {
        component.element.classList.add(selectedClass);
        updateAriaPressed();
        updateIcon();
    }
    else {
        updateAriaPressed();
    }
    const toggleOnClick = config.toggleOnClick !== false;
    const handleClick = () => {
        toggleState.toggle();
        const value = component.element.value;
        component.emit?.("change", { selected: isSelected, value });
    };
    if (toggleOnClick) {
        component.element.addEventListener("click", handleClick);
        getCleanup(component).add(() => component.element.removeEventListener("click", handleClick));
    }
    return {
        ...component,
        toggleState,
    };
};
