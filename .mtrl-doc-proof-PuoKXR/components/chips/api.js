export const withAPI = (options) => (component) => {
    return {
        ...component,
        element: component.element,
        addChip(chipConfig) {
            if (options.chips && typeof options.chips.addChip === "function") {
                options.chips.addChip(chipConfig);
            }
            return this;
        },
        removeChip(chipOrIndex) {
            if (options.chips && typeof options.chips.removeChip === "function") {
                options.chips.removeChip(chipOrIndex);
            }
            return this;
        },
        getChips() {
            if (options.chips && typeof options.chips.getChips === "function") {
                return options.chips.getChips();
            }
            return [];
        },
        getSelectedChips() {
            if (options.chips &&
                typeof options.chips.getSelectedChips === "function") {
                return options.chips.getSelectedChips();
            }
            return [];
        },
        getSelectedValues() {
            if (options.chips &&
                typeof options.chips.getSelectedValues === "function") {
                return options.chips.getSelectedValues();
            }
            return [];
        },
        getValue() {
            if (options.chips &&
                typeof options.chips.getSelectedValues === "function") {
                const values = options.chips
                    .getSelectedValues()
                    .filter((value) => value !== null);
                if (!options.config?.multiSelect) {
                    return values.length > 0 ? values[0] : null;
                }
                return values;
            }
            return options.config?.multiSelect ? [] : null;
        },
        setValue(values) {
            if (options.chips &&
                typeof options.chips.selectByValue === "function") {
                if (options.chips.clearSelection) {
                    options.chips.clearSelection();
                }
                let valueArray = [];
                if (values) {
                    if (Array.isArray(values)) {
                        valueArray = values.filter((v) => v != null && v !== "");
                    }
                    else if (typeof values === "string" && values !== "") {
                        valueArray = [values];
                    }
                }
                if (valueArray.length > 0) {
                    options.chips.selectByValue(valueArray, false);
                }
            }
            return this;
        },
        selectByValue(values, triggerEvent = false) {
            if (options.chips &&
                typeof options.chips.selectByValue === "function") {
                options.chips.selectByValue(values, triggerEvent);
            }
            return this;
        },
        clearSelection() {
            if (options.chips &&
                typeof options.chips.clearSelection === "function") {
                options.chips.clearSelection();
            }
            return this;
        },
        setScrollable(isScrollable) {
            if (options.layout &&
                typeof options.layout.setScrollable === "function") {
                options.layout.setScrollable(isScrollable);
            }
            return this;
        },
        setVertical(isVertical) {
            if (options.layout &&
                typeof options.layout.setVertical === "function") {
                options.layout.setVertical(isVertical);
            }
            return this;
        },
        setLabel(text) {
            if (options.label && typeof options.label.setText === "function") {
                options.label.setText(text);
            }
            return this;
        },
        getLabel() {
            if (options.label && typeof options.label.getText === "function") {
                return options.label.getText();
            }
            return "";
        },
        setLabelPosition(position) {
            if (options.label && typeof options.label.setPosition === "function") {
                options.label.setPosition(position);
            }
            return this;
        },
        getLabelPosition() {
            if (options.label && typeof options.label.getPosition === "function") {
                return options.label.getPosition();
            }
            return "start";
        },
        scrollToChip(chipOrIndex) {
            if (options.chips && typeof options.chips.scrollToChip === "function") {
                options.chips.scrollToChip(chipOrIndex);
            }
            return this;
        },
        enableKeyboardNavigation() {
            if (options.keyboard &&
                typeof options.keyboard.enableKeyboardNavigation === "function") {
                options.keyboard.enableKeyboardNavigation();
            }
            return this;
        },
        keyboard: {
            enable: () => options.keyboard?.enableKeyboardNavigation?.(),
            disable: () => options.keyboard?.disableKeyboardNavigation?.(),
        },
        on(event, handler) {
            if (options.events && typeof options.events.on === "function") {
                options.events.on(event, handler);
            }
            return this;
        },
        off(event, handler) {
            if (options.events && typeof options.events.off === "function") {
                options.events.off(event, handler);
            }
            return this;
        },
        destroy() {
            if (options.lifecycle &&
                typeof options.lifecycle.destroy === "function") {
                options.lifecycle.destroy();
            }
        },
    };
};
