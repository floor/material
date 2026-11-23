import { getCleanup } from "../../../core/compose/cleanup.js";
import createChip from "../chip/chip.js";
import { CHIPS_EVENTS } from "../constants.js";
import { activeElementOf } from "../../../core/dom/focus.js";
export const withController = (config) => (component) => {
    const eventListeners = {
        change: [],
        add: [],
        remove: [],
    };
    let focusedChipIndex = -1;
    let keyboardEnabled = true;
    const dispatchEvent = (eventName, ...args) => {
        if (eventListeners[eventName]) {
            eventListeners[eventName].forEach((handler) => handler(...args));
        }
    };
    const selectionValue = (values) => {
        const selected = values.filter((value) => value !== null);
        return config.multiSelect ? selected : (selected[0] ?? null);
    };
    const changeEvent = (values, changed) => {
        return { value: selectionValue(values), selected: values, changed };
    };
    const currentValue = () => selectionValue(getSelectedValues());
    const selectSingle = (selectedChip) => {
        if (config.multiSelect)
            return;
        component.chipInstances.forEach((chip) => {
            if (chip !== selectedChip && chip.isSelected())
                chip.setSelected(false);
        });
    };
    const handleSelection = (selectedChip) => {
        if (selectedChip.isSelected())
            selectSingle(selectedChip);
        if (config.selectionRequired && !selectedChip.isSelected() && getSelectedChips().length === 0) {
            selectedChip.setSelected(true);
            return true;
        }
        const selectedChips = component.chipInstances.filter((chip) => chip.isSelected());
        const selectedValues = selectedChips.map((chip) => chip.getValue());
        const changedValue = selectedChip ? selectedChip.getValue() : null;
        dispatchEvent(CHIPS_EVENTS.CHANGE, changeEvent(selectedValues, changedValue));
    };
    const targets = () => component.chipInstances
        .filter((chip) => !chip.isDisabled())
        .flatMap((chip) => chip.element.hasAttribute("tabindex")
        ? [chip.element]
        : Array.from(chip.element.querySelectorAll(":scope > button")));
    let current = null;
    const syncTabStop = () => {
        const list = targets();
        if (!current || !list.includes(current))
            current = list[0] ?? null;
        for (const chip of component.chipInstances) {
            if (chip.element.hasAttribute("tabindex"))
                chip.element.tabIndex = -1;
            chip.element.querySelectorAll(":scope > button").forEach((button) => { button.tabIndex = -1; });
        }
        if (current)
            current.tabIndex = 0;
    };
    const handleKeyboardNavigation = (event) => {
        if (!keyboardEnabled)
            return;
        const list = targets();
        if (list.length === 0)
            return;
        const isVertical = !!(component.layout && component.layout.isVertical());
        const rtl = component.element.matches(":dir(rtl)");
        const back = isVertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
        const forward = isVertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
        const from = list.indexOf(event.target);
        let next;
        if (event.key === back)
            next = Math.max(0, from - 1);
        else if (event.key === forward)
            next = Math.min(list.length - 1, from + 1);
        else if (event.key === "Home")
            next = 0;
        else if (event.key === "End")
            next = list.length - 1;
        else
            return;
        event.preventDefault();
        event.stopPropagation();
        if (from === -1)
            next = 0;
        current = list[next];
        syncTabStop();
        current.focus();
        const owner = component.chipInstances.findIndex((chip) => chip.element.contains(current));
        if (owner >= 0) {
            focusedChipIndex = owner;
            if (component.layout && component.layout.isScrollable())
                scrollToChip(owner);
        }
    };
    const scrollToChip = (chipOrIndex) => {
        const isScrollable = component.layout && component.layout.isScrollable();
        if (!isScrollable)
            return;
        const index = typeof chipOrIndex === "number"
            ? chipOrIndex
            : component.chipInstances.indexOf(chipOrIndex);
        if (index >= 0 && index < component.chipInstances.length) {
            const chipElement = component.chipInstances[index].element;
            const container = component.chipContainer || component.element;
            const containerRect = container.getBoundingClientRect();
            const chipRect = chipElement.getBoundingClientRect();
            const isVertical = component.layout && component.layout.isVertical();
            if (isVertical) {
                const scrollTop = container.scrollTop + chipRect.top - containerRect.top -
                    containerRect.height / 2 +
                    chipRect.height / 2;
                container.scrollTo({
                    top: scrollTop,
                });
            }
            else {
                const scrollLeft = container.scrollLeft + chipRect.left - containerRect.left -
                    containerRect.width / 2 +
                    chipRect.width / 2;
                container.scrollTo({
                    left: scrollLeft,
                });
            }
        }
    };
    const unlist = (index) => {
        const chips = component.chipInstances;
        const chip = chips[index];
        const hadFocus = chip.element.contains(activeElementOf(chip.element));
        chip.element.removeEventListener("keydown", handleKeyboardNavigation);
        chips.splice(index, 1);
        if (index === focusedChipIndex)
            focusedChipIndex = -1;
        else if (index < focusedChipIndex)
            focusedChipIndex--;
        syncTabStop();
        if (!hadFocus)
            return;
        let next = Math.min(index, chips.length - 1);
        while (next >= 0 && chips[next].isDisabled())
            next--;
        if (next < 0)
            next = chips.findIndex(candidate => !candidate.isDisabled());
        if (next >= 0) {
            focusedChipIndex = next;
            chips[next].focus();
        }
    };
    let tearingDown = false;
    const watchChipDestroy = (chip) => {
        const destroy = chip.destroy.bind(chip);
        chip.destroy = () => {
            const index = tearingDown ? -1 : component.chipInstances.indexOf(chip);
            if (index >= 0)
                unlist(index);
            destroy();
        };
    };
    const addChip = (chipConfig) => {
        const chipInstance = createChip({
            ...chipConfig,
            managedSelection: true,
            onSelected: selectSingle,
            cell: true,
            onRemoved: removeChip,
        });
        const container = component.chipContainer || component.element;
        const fragment = document.createDocumentFragment();
        fragment.appendChild(chipInstance.element);
        container.appendChild(fragment);
        component.chipInstances.push(chipInstance);
        if (chipInstance.isSelected())
            selectSingle(chipInstance);
        chipInstance.on("click", () => {
            if (!chipInstance.isDisabled() && ["filter", "input"].includes(chipInstance.getType())) {
                chipInstance.toggleSelected();
                if (!handleSelection(chipInstance))
                    chipConfig.onSelect?.(chipInstance);
                focusedChipIndex = component.chipInstances.indexOf(chipInstance);
            }
        });
        chipInstance.on("focus", () => {
            focusedChipIndex = component.chipInstances.indexOf(chipInstance);
        });
        chipInstance.element.addEventListener("keydown", handleKeyboardNavigation);
        syncTabStop();
        watchChipDestroy(chipInstance);
        dispatchEvent(CHIPS_EVENTS.ADD, { value: currentValue(), chip: chipInstance });
        return chipInstance;
    };
    const removeChip = (chipOrIndex) => {
        const index = typeof chipOrIndex === "number"
            ? chipOrIndex
            : component.chipInstances.indexOf(chipOrIndex);
        if (index >= 0 && index < component.chipInstances.length) {
            const chip = component.chipInstances[index];
            const chipValue = chip.getValue();
            unlist(index);
            chip.destroy();
            dispatchEvent(CHIPS_EVENTS.REMOVE, { value: currentValue(), chip, chipValue });
        }
    };
    const getChips = () => {
        return [...component.chipInstances];
    };
    const getSelectedChips = () => {
        return component.chipInstances.filter((chip) => chip.isSelected());
    };
    const getSelectedValues = () => {
        return getSelectedChips().map((chip) => chip.getValue());
    };
    const selectByValue = (values, triggerEvent = false, exclusive = !config.multiSelect) => {
        const valueArray = Array.isArray(values) ? values : [values];
        let selectionChanged = false;
        if (exclusive) {
            component.chipInstances.forEach((chip) => {
                const chipValue = chip.getValue();
                const shouldSelect = chipValue !== null && valueArray.includes(chipValue);
                if (!shouldSelect && chip.isSelected()) {
                    chip.setSelected(false);
                    selectionChanged = true;
                }
            });
        }
        component.chipInstances.forEach((chip) => {
            const chipValue = chip.getValue();
            const shouldSelect = chipValue !== null && valueArray.includes(chipValue);
            if (shouldSelect && !chip.isSelected()) {
                chip.setSelected(true);
                selectionChanged = true;
            }
        });
        if (selectionChanged && triggerEvent) {
            const selectedValues = getSelectedValues();
            dispatchEvent(CHIPS_EVENTS.CHANGE, changeEvent(selectedValues, null));
        }
    };
    const clearSelection = (triggerEvent = false) => {
        const selectedValues = getSelectedValues();
        const hadSelectedChips = selectedValues.length > 0;
        component.chipInstances.forEach((chip) => {
            chip.setSelected(false);
        });
        if (hadSelectedChips && triggerEvent) {
            dispatchEvent(CHIPS_EVENTS.CHANGE, changeEvent([], null));
        }
    };
    const enableKeyboardNavigation = () => {
        keyboardEnabled = true;
        component.chipInstances.forEach((chip) => {
            chip.element.addEventListener("keydown", handleKeyboardNavigation);
        });
    };
    const disableKeyboardNavigation = () => {
        keyboardEnabled = false;
        component.chipInstances.forEach((chip) => {
            chip.element.removeEventListener("keydown", handleKeyboardNavigation);
        });
    };
    enableKeyboardNavigation();
    const trackFocus = (event) => {
        const target = event.target;
        if (targets().includes(target)) {
            current = target;
            syncTabStop();
        }
    };
    if (component.element) {
        component.element.addEventListener("keydown", handleKeyboardNavigation);
        component.element.addEventListener("focusin", trackFocus);
    }
    getCleanup(component).add(() => {
        tearingDown = true;
        component.element.removeEventListener("keydown", handleKeyboardNavigation);
        component.element.removeEventListener("focusin", trackFocus);
        component.chipInstances.forEach(chip => {
            chip.element.removeEventListener("keydown", handleKeyboardNavigation);
            chip.destroy();
        });
        component.chipInstances.length = 0;
        Object.keys(eventListeners).forEach(event => { eventListeners[event].length = 0; });
    });
    return {
        ...component,
        chips: {
            addChip,
            removeChip,
            getChips,
            getSelectedChips,
            getSelectedValues,
            selectByValue,
            clearSelection,
            scrollToChip,
        },
        keyboard: {
            enable: enableKeyboardNavigation,
            disable: disableKeyboardNavigation,
        },
        on(event, handler) {
            if (!eventListeners[event]) {
                eventListeners[event] = [];
            }
            eventListeners[event].push(handler);
            return this;
        },
        off(event, handler) {
            if (eventListeners[event]) {
                const index = eventListeners[event].indexOf(handler);
                if (index !== -1) {
                    eventListeners[event].splice(index, 1);
                }
            }
            return this;
        },
    };
};
