import { SEARCH_CLASSES, SEARCH_EVENTS } from "../constants.js";
import { activeElementOf } from "../../../core/dom/focus.js";
const normalizeSuggestions = (suggestions) => {
    if (!suggestions) {
        return [];
    }
    return suggestions.map((item) => {
        if (typeof item === "string") {
            return { text: item, value: item };
        }
        return { ...item, value: item.value ?? item.text };
    });
};
export const withInput = (config, getComponent) => (component) => {
    let currentValue = config.value || "";
    let currentPlaceholder = config.placeholder || "Search";
    let suggestions = normalizeSuggestions(config.suggestions);
    const getClass = (className) => {
        return component.getClass ? component.getClass(className) : className;
    };
    const createEventData = (eventType, originalEvent = null, extra = {}) => {
        const eventData = {
            component: getComponent(),
            value: currentValue,
            originalEvent,
            preventDefault: () => {
                eventData.defaultPrevented = true;
            },
            defaultPrevented: false,
            ...extra,
        };
        return eventData;
    };
    const emitEvent = (eventType, originalEvent = null, extra = {}) => {
        const eventData = createEventData(eventType, originalEvent, extra);
        if (component.emit) {
            component.emit(eventType, eventData);
        }
        return eventData;
    };
    const updateClearButton = (hasValue) => {
        const clearButton = component.structure?.clearButton;
        if (!clearButton)
            return;
        if (hasValue) {
            clearButton.classList.remove(getClass(SEARCH_CLASSES.CLEAR_BUTTON_HIDDEN));
            if (!component.disabled?.isDisabled()) {
                clearButton.tabIndex = 0;
            }
        }
        else {
            clearButton.classList.add(getClass(SEARCH_CLASSES.CLEAR_BUTTON_HIDDEN));
            clearButton.tabIndex = -1;
        }
    };
    const setValue = (value, triggerEvent = true) => {
        const previousValue = currentValue;
        currentValue = value;
        const input = component.structure?.input;
        if (input && input.value !== value) {
            input.value = value;
        }
        updateClearButton(!!value);
        if (component.states?.updatePopulatedState) {
            component.states.updatePopulatedState(!!value);
        }
        if (triggerEvent && value !== previousValue) {
            emitEvent(SEARCH_EVENTS.INPUT);
        }
    };
    const getValue = () => {
        return currentValue;
    };
    const setPlaceholder = (text) => {
        currentPlaceholder = text;
        const input = component.structure?.input;
        if (input) {
            const label = config.ariaLabel || text;
            input.placeholder = text;
            input.setAttribute("aria-label", label);
            const surface = component.structure?.surface;
            if (surface?.hasAttribute("aria-label")) {
                surface.setAttribute("aria-label", label || "Search");
            }
        }
    };
    const getPlaceholder = () => {
        return currentPlaceholder;
    };
    const clear = (triggerEvent = true) => {
        setValue("", triggerEvent);
        const input = component.structure?.input;
        if (input && !component.disabled?.isDisabled()) {
            input.focus();
        }
        if (triggerEvent) {
            emitEvent(SEARCH_EVENTS.CLEAR);
        }
    };
    const submit = () => {
        if (currentValue) {
            emitEvent(SEARCH_EVENTS.SUBMIT);
        }
    };
    const focus = () => {
        const input = component.structure?.input;
        if (input && !component.disabled?.isDisabled()) {
            input.focus();
        }
    };
    const blur = () => {
        const input = component.structure?.input;
        if (input) {
            input.blur();
        }
    };
    const setSuggestions = (newSuggestions) => {
        suggestions = normalizeSuggestions(newSuggestions);
    };
    const getSuggestions = () => {
        return [...suggestions];
    };
    const clearSuggestions = () => {
        suggestions = [];
    };
    const selectSuggestion = (suggestion) => {
        setValue(suggestion.value ?? suggestion.text, false);
        emitEvent(SEARCH_EVENTS.SUGGESTION_SELECT, null, { suggestion });
    };
    const setupEventListeners = () => {
        const input = component.structure?.input;
        const clearButton = component.structure?.clearButton;
        const leadingIcon = component.structure?.leadingIcon;
        if (!input)
            return;
        const reopen = () => {
            if (config.expandOnFocus !== false && !component.states?.isExpanded() && activeElementOf(input) === input)
                component.states?.expand();
        };
        input.addEventListener("input", (e) => {
            const target = e.target;
            setValue(target.value, true);
            reopen();
        });
        input.addEventListener("click", reopen);
        input.addEventListener("focus", (e) => {
            if (component.states?.updateFocusedState) {
                component.states.updateFocusedState(true);
            }
            emitEvent(SEARCH_EVENTS.FOCUS, e);
            if (config.expandOnFocus !== false && component.states?.expand) {
                component.states.expand();
            }
        });
        input.addEventListener("blur", (e) => {
            if (component.states?.updateFocusedState) {
                component.states.updateFocusedState(false);
            }
            emitEvent(SEARCH_EVENTS.BLUR, e);
            if (config.collapseOnBlur !== false && component.states?.collapse) {
                const delay = config.collapseDelay ?? 150;
                setTimeout(() => {
                    const root = component.structure?.surface ?? input;
                    if (!root.contains(activeElementOf(input))) {
                        component.states.collapse();
                    }
                }, delay);
            }
        });
        input.addEventListener("keydown", (e) => {
            switch (e.key) {
                case "Enter":
                    e.preventDefault();
                    if (!input.hasAttribute("aria-activedescendant"))
                        submit();
                    break;
                case "Escape":
                    e.preventDefault();
                    if (currentValue) {
                        clear();
                    }
                    else if (component.states?.isExpanded?.()) {
                        component.states.collapse();
                    }
                    break;
                case "ArrowDown":
                    break;
                case "ArrowUp":
                    break;
            }
        });
        if (clearButton) {
            clearButton.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                clear();
            });
            clearButton.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    clear();
                }
            });
        }
        if (leadingIcon) {
            leadingIcon.addEventListener("click", (e) => {
                e.preventDefault();
                if (component.states?.isExpanded?.()) {
                    component.states.collapse();
                }
                else {
                    component.states?.expand();
                }
            });
            leadingIcon.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (component.states?.isExpanded?.()) {
                        component.states.collapse();
                    }
                    else {
                        component.states?.expand();
                    }
                }
            });
        }
    };
    setTimeout(() => {
        setupEventListeners();
    }, 0);
    return {
        ...component,
        input: {
            setValue,
            getValue,
            setPlaceholder,
            getPlaceholder,
            clear,
            submit,
            focus,
            blur,
            setSuggestions,
            getSuggestions,
            clearSuggestions,
            selectSuggestion,
            emitEvent,
        },
    };
};
