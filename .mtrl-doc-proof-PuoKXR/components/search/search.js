import { pipe } from "../../core/compose/pipe.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { withStructure, withStates, withInput, withSuggestions, } from "./features/index.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createSearch = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        const component = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withStructure(baseConfig), withStates(baseConfig, () => search), withInput(baseConfig, () => search), withSuggestions(), withLifecycle())(baseConfig);
        const apiOptions = getApiConfig(component);
        const search = withAPI(apiOptions)(component);
        if (baseConfig.onInput)
            search.on("input", baseConfig.onInput);
        if (baseConfig.onSubmit)
            search.on("submit", baseConfig.onSubmit);
        if (baseConfig.onClear)
            search.on("clear", baseConfig.onClear);
        if (baseConfig.onSuggestionSelect)
            search.on("suggestionSelect", baseConfig.onSuggestionSelect);
        if (baseConfig.onExpand)
            search.on("expand", baseConfig.onExpand);
        if (baseConfig.onCollapse)
            search.on("collapse", baseConfig.onCollapse);
        if (baseConfig.on && typeof search.on === "function") {
            Object.entries(baseConfig.on).forEach(([event, handler]) => {
                if (typeof handler === "function") {
                    search.on(event, handler);
                }
            });
        }
        return search;
    }
    catch (error) {
        console.error("Search creation error:", error);
        throw new Error(`Failed to create search: ${error.message}`);
    }
};
export default createSearch;
