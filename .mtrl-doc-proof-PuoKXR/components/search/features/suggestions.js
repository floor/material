import { SEARCH_CLASSES, SEARCH_KEYS, SEARCH_ICONS } from "../constants.js";
import { createElement } from "../../../core/dom/create.js";
import { decorativeIconsOn } from "../../../core/compose/features/icon-opt-in.js";
export const withSuggestions = () => (component) => {
    let highlightedIndex = -1;
    const currentSuggestions = [];
    const getClass = (className) => {
        return component.getClass ? component.getClass(className) : className;
    };
    const getSuggestions = () => {
        if (component.input?.getSuggestions) {
            return component.input.getSuggestions();
        }
        return currentSuggestions;
    };
    const highlightMatch = (text, query) => {
        if (!query)
            return [document.createTextNode(text)];
        const matchIndex = text.toLowerCase().indexOf(query.toLowerCase());
        if (matchIndex === -1)
            return [document.createTextNode(text)];
        const strong = document.createElement("strong");
        strong.textContent = text.slice(matchIndex, matchIndex + query.length);
        return [
            document.createTextNode(text.slice(0, matchIndex)),
            strong,
            document.createTextNode(text.slice(matchIndex + query.length)),
        ];
    };
    const createSuggestionItem = (suggestion, index, query) => {
        const isHighlighted = index === highlightedIndex;
        const itemClasses = [getClass(SEARCH_CLASSES.SUGGESTION_ITEM)];
        if (isHighlighted) {
            itemClasses.push(getClass(SEARCH_CLASSES.SUGGESTION_ITEM_SELECTED));
        }
        const listId = component.structure?.suggestionsList?.id;
        const item = createElement({
            tag: "li",
            className: itemClasses.join(" "),
            attributes: {
                ...(listId && { id: `${listId}-${index}` }),
                role: "option",
                "aria-selected": isHighlighted ? "true" : "false",
                "data-index": String(index),
                "data-value": suggestion.value ?? suggestion.text,
                tabindex: "-1",
            },
        });
        const iconAttributes = decorativeIconsOn() && suggestion.text.trim() ? { "aria-hidden": "true" } : undefined;
        if (suggestion.icon) {
            createElement({
                tag: "span",
                className: getClass(SEARCH_CLASSES.SUGGESTION_ICON),
                container: item,
                attributes: iconAttributes,
                html: suggestion.icon,
            });
        }
        else {
            createElement({
                tag: "span",
                className: getClass(SEARCH_CLASSES.SUGGESTION_ICON),
                container: item,
                attributes: iconAttributes,
                html: SEARCH_ICONS.HISTORY,
            });
        }
        const label = createElement({
            tag: "span",
            className: getClass(SEARCH_CLASSES.SUGGESTION_TEXT),
            container: item,
        });
        label.append(...highlightMatch(suggestion.text, query));
        if (suggestion.supportingText) {
            item.classList.add(getClass(`${SEARCH_CLASSES.SUGGESTION_ITEM}--two-line`));
            const supporting = createElement({ tag: "span", className: getClass(SEARCH_CLASSES.SUGGESTION_SUPPORTING), container: label });
            supporting.textContent = suggestion.supportingText;
        }
        return item;
    };
    const createDivider = () => {
        return createElement({
            tag: "li",
            className: getClass(SEARCH_CLASSES.SUGGESTION_DIVIDER),
            attributes: {
                role: "separator",
                "aria-hidden": "true",
            },
        });
    };
    const renderSuggestions = () => {
        const suggestionsList = component.structure?.suggestionsList;
        if (!suggestionsList)
            return;
        const suggestions = getSuggestions();
        const query = component.input?.getValue?.() || "";
        suggestionsList.replaceChildren();
        highlightedIndex = -1;
        component.structure?.input.removeAttribute("aria-activedescendant");
        const status = component.structure?.status;
        const count = suggestions.length;
        if (status)
            status.textContent = count && component.states?.isExpanded() ? `${count} suggestion${count === 1 ? "" : "s"}` : "";
        if (suggestions.length === 0) {
            return;
        }
        let currentGroup;
        suggestions.forEach((suggestion, index) => {
            if (suggestion.group && suggestion.group !== currentGroup) {
                if (currentGroup !== undefined) {
                    suggestionsList.appendChild(createDivider());
                }
                currentGroup = suggestion.group;
            }
            const item = createSuggestionItem(suggestion, index, query);
            item.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectSuggestion(index);
            });
            suggestionsList.appendChild(item);
        });
    };
    const clearRenderedSuggestions = () => {
        const suggestionsList = component.structure?.suggestionsList;
        if (suggestionsList) {
            suggestionsList.replaceChildren();
        }
        highlightedIndex = -1;
        component.structure?.input.removeAttribute("aria-activedescendant");
        if (component.structure?.status)
            component.structure.status.textContent = "";
    };
    const setHighlightedIndex = (index) => {
        const suggestionsList = component.structure?.suggestionsList;
        if (!suggestionsList)
            return;
        const suggestions = getSuggestions();
        if (index < -1)
            index = suggestions.length - 1;
        if (index >= suggestions.length)
            index = -1;
        if (highlightedIndex >= 0) {
            const previousItem = suggestionsList.querySelector(`[data-index="${highlightedIndex}"]`);
            if (previousItem) {
                previousItem.classList.remove(getClass(SEARCH_CLASSES.SUGGESTION_ITEM_SELECTED));
                previousItem.setAttribute("aria-selected", "false");
            }
        }
        highlightedIndex = index;
        const input = component.structure?.input;
        const newItem = highlightedIndex >= 0 ? suggestionsList.querySelector(`[data-index="${highlightedIndex}"]`) : null;
        if (newItem?.id)
            input?.setAttribute("aria-activedescendant", newItem.id);
        else
            input?.removeAttribute("aria-activedescendant");
        if (highlightedIndex >= 0) {
            if (newItem) {
                newItem.classList.add(getClass(SEARCH_CLASSES.SUGGESTION_ITEM_SELECTED));
                newItem.setAttribute("aria-selected", "true");
                newItem.scrollIntoView({ block: "nearest" });
            }
        }
    };
    const highlightNext = () => {
        setHighlightedIndex(highlightedIndex + 1);
    };
    const highlightPrevious = () => {
        setHighlightedIndex(highlightedIndex - 1);
    };
    const selectSuggestion = (index) => {
        const suggestions = getSuggestions();
        if (index < 0 || index >= suggestions.length)
            return;
        const suggestion = suggestions[index];
        if (component.input?.selectSuggestion) {
            component.input.selectSuggestion(suggestion);
        }
        if (component.states?.collapse) {
            component.states.collapse();
        }
    };
    const selectHighlighted = () => {
        if (highlightedIndex >= 0) {
            selectSuggestion(highlightedIndex);
            return true;
        }
        return false;
    };
    const setupKeyboardNavigation = () => {
        const input = component.structure?.input;
        if (!input)
            return;
        input.addEventListener("keydown", (e) => {
            const suggestions = getSuggestions();
            const isExpanded = component.states?.isExpanded?.() || false;
            if (!isExpanded || suggestions.length === 0)
                return;
            switch (e.key) {
                case SEARCH_KEYS.ARROW_DOWN:
                    e.preventDefault();
                    highlightNext();
                    break;
                case SEARCH_KEYS.ARROW_UP:
                    e.preventDefault();
                    highlightPrevious();
                    break;
                case SEARCH_KEYS.ENTER:
                    if (highlightedIndex >= 0) {
                        e.preventDefault();
                        selectHighlighted();
                    }
                    break;
                case SEARCH_KEYS.TAB:
                    if (highlightedIndex >= 0) {
                        selectHighlighted();
                    }
                    break;
                case SEARCH_KEYS.ESCAPE:
                    highlightedIndex = -1;
                    break;
            }
        });
    };
    if (getSuggestions().length > 0)
        renderSuggestions();
    setTimeout(setupKeyboardNavigation, 0);
    component.on?.("expand", () => renderSuggestions());
    return {
        ...component,
        suggestions: {
            render: renderSuggestions,
            clear: clearRenderedSuggestions,
            setHighlightedIndex,
            getHighlightedIndex: () => highlightedIndex,
            highlightNext,
            highlightPrevious,
            select: selectSuggestion,
            selectHighlighted,
        },
    };
};
