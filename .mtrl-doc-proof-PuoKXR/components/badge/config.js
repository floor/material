import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { BADGE_VARIANTS, BADGE_COLORS, BADGE_POSITIONS, BADGE_MAX_CHARACTERS, } from "./constants.js";
export const defaultConfig = {
    variant: BADGE_VARIANTS.LARGE,
    color: BADGE_COLORS.ERROR,
    position: BADGE_POSITIONS.TOP_RIGHT,
    label: "",
    visible: true,
};
export const smallBadgeLabel = (label) => typeof label === "string" && isNaN(+label)
    ? label.trim() : "New notification";
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, "badge");
export const getElementConfig = (config) => createElementConfig(config, { tag: "span" });
export const getApiConfig = (comp) => ({
    visibility: {
        show: () => comp.visibility.show(),
        hide: () => comp.visibility.hide(),
        toggle: (visible) => comp.visibility.toggle(visible),
        isVisible: () => comp.visibility.isVisible(),
    },
    lifecycle: {
        destroy: () => comp.lifecycle.destroy(),
    },
});
export const isEmptyBadgeLabel = (formattedLabel) => formattedLabel === "" || formattedLabel === "0";
export const isBadgeOverflow = (label, max) => {
    if (max === undefined || label === "" || label === null)
        return false;
    const numeric = Number(label);
    return !Number.isNaN(numeric) && numeric > max;
};
export const formatBadgeLabel = (label, max) => {
    if (label === undefined || label === null || label === "") {
        return "";
    }
    let formattedLabel = String(label);
    const numericLabel = Number(label);
    if (max !== undefined && !isNaN(numericLabel) && numericLabel > max) {
        formattedLabel = `${max}+`;
    }
    if (formattedLabel.length > BADGE_MAX_CHARACTERS) {
        const numericValue = Number(label);
        if (!isNaN(numericValue)) {
            if (numericValue >= 1000) {
                formattedLabel = "999+";
            }
            else {
                formattedLabel =
                    formattedLabel.substring(0, BADGE_MAX_CHARACTERS - 1) + "+";
            }
        }
        else {
            formattedLabel = formattedLabel.substring(0, BADGE_MAX_CHARACTERS);
        }
    }
    return formattedLabel;
};
export default defaultConfig;
