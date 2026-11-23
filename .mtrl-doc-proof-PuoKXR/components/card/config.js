import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { createCardHeader, createCardContent, createCardMedia, createCardActions, } from "./content.js";
import { CARD_VARIANTS, CARD_ELEVATIONS } from "./constants.js";
import { NESTED_ACTION_SELECTOR } from "./content.js";
export const defaultConfig = {
    variant: CARD_VARIANTS.ELEVATED,
    interactive: false,
    fullWidth: false,
    clickable: false,
    draggable: false,
};
export const processInlineConfig = (config) => {
    const processedConfig = { ...config };
    if (config.header) {
        processedConfig.headerConfig = config.header;
    }
    if (config.content) {
        processedConfig.contentConfig = config.content;
    }
    if (config.media) {
        processedConfig.mediaConfig = config.media;
    }
    if (config.actions) {
        processedConfig.actionsConfig = config.actions;
    }
    return processedConfig;
};
export const applyInlineConfiguration = (card, config) => {
    if (config.mediaConfig &&
        (!config.mediaConfig.position || config.mediaConfig.position === "top")) {
        const mediaElement = createCardMedia({
            ...config.mediaConfig,
            position: undefined,
        });
        card.addMedia(mediaElement, "top");
    }
    if (config.headerConfig) {
        const headerElement = createCardHeader(config.headerConfig);
        card.setHeader(headerElement);
    }
    if (config.contentConfig) {
        const contentElement = createCardContent(config.contentConfig);
        card.addContent(contentElement);
    }
    if (config.mediaConfig && config.mediaConfig.position === "bottom") {
        const mediaElement = createCardMedia({
            ...config.mediaConfig,
            position: undefined,
        });
        card.addMedia(mediaElement, "bottom");
    }
    if (config.actionsConfig) {
        const actionsElement = createCardActions(config.actionsConfig);
        card.setActions(actionsElement);
    }
    if (Array.isArray(config.buttons) && config.buttons.length > 0) {
        import("../button/index.js")
            .then(({ default: createButton }) => {
            const actionButtons = config.buttons.map((buttonConfig) => createButton(buttonConfig).element);
            const actionsElement = createCardActions({
                actions: actionButtons,
                align: config.actionsConfig?.align || "end",
            });
            card.setActions(actionsElement);
        })
            .catch((error) => {
            console.error("Error processing buttons:", error);
        });
    }
};
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, "card");
export const getElementConfig = (config) => {
    const isInteractive = config.interactive || config.clickable;
    const forward = !!isInteractive;
    const defaultRole = config.clickable ? "button" : "article";
    const ariaAttributes = {};
    if (config.aria) {
        Object.entries(config.aria).forEach(([key, value]) => {
            if (value !== undefined) {
                const attrName = key === "role" || key.startsWith("aria-") ? key : `aria-${key}`;
                ariaAttributes[attrName] = value;
            }
        });
    }
    if (!ariaAttributes["role"] && !config.aria?.role) {
        ariaAttributes["role"] = defaultRole;
    }
    if (config.clickable && !ariaAttributes["tabindex"]) {
        ariaAttributes["tabindex"] = "0";
    }
    return createElementConfig(config, {
        tag: "div",
        className: [
            config.class,
            config.fullWidth ? `${config.prefix}-card--full-width` : null,
            isInteractive ? `${config.prefix}-card--interactive` : null,
        ],
        attributes: ariaAttributes,
        forwardEvents: {
            click: (ctx, event) => (config.clickable && !(config.promoteChildActions &&
                (event.target.closest?.(NESTED_ACTION_SELECTOR) || ctx.element) !== ctx.element)),
            mouseenter: forward,
            mouseleave: forward,
            keydown: forward,
            focus: forward,
            blur: forward,
        },
        interactive: isInteractive,
    });
};
export const getApiConfig = (comp) => ({
    lifecycle: {
        destroy: () => comp.lifecycle?.destroy?.(),
    },
});
export const CARD_ELEVATION_LEVELS = CARD_ELEVATIONS;
export const withInteractiveBehavior = (comp) => {
    const config = comp.config;
    const isInteractive = config.interactive || config.clickable;
    if (isInteractive) {
        comp.element.addEventListener("keydown", (e) => {
            if ((e.key === "Enter" || e.key === " ") && config.clickable && !(config.promoteChildActions && e.target !== comp.element)) {
                e.preventDefault();
                comp.element.click();
            }
        });
        comp.element.addEventListener("focus", () => {
            comp.element.classList.add(`${comp.getClass("card")}--focused`);
        });
        comp.element.addEventListener("blur", () => {
            comp.element.classList.remove(`${comp.getClass("card")}--focused`);
        });
    }
    if (config.draggable) {
        comp.element.setAttribute("draggable", "true");
        comp.element.addEventListener("dragstart", (e) => {
            comp.element.classList.add(`${comp.getClass("card")}--dragging`);
            comp.emit?.("dragstart", { event: e });
            if (e.dataTransfer) {
                const cardTitle = comp.element.querySelector(`.${comp.getClass("card")}__header-title`)
                    ?.textContent || "Card";
                e.dataTransfer.setData("text/plain", cardTitle);
            }
        });
        comp.element.addEventListener("dragend", (e) => {
            comp.element.classList.remove(`${comp.getClass("card")}--dragging`);
            comp.emit?.("dragend", { event: e });
        });
    }
    return comp;
};
export default defaultConfig;
