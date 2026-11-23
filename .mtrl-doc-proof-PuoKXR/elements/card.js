import createCard from "../components/card/index.js";
import { createCardActions, createCardContent, createCardHeader, createCardMedia } from "../components/card/content.js";
import { PREFIX } from "../core/config.js";
import { defineElement } from "./define.js";
const REGIONS = ["media", "avatar", "headline", "subhead", "header-action", "content", "actions"];
const builtRegions = new WeakMap();
const hasText = (node) => node.nodeType === 3 && (node.textContent ?? "").trim() !== "";
const regionsOf = (host) => REGIONS.filter((region) => {
    if (region === "content") {
        return Array.from(host.childNodes).some((node) => hasText(node) || (node.nodeType === 1 && !node.hasAttribute("slot")));
    }
    if ((region === "headline" || region === "subhead") && host.getAttribute(region))
        return true;
    return Array.from(host.children).some((child) => child.getAttribute("slot") === region);
});
const readCard = (host) => ({ regions: regionsOf(host) });
const slot = (name, fallback) => {
    const element = document.createElement("slot");
    if (name)
        element.name = name;
    if (fallback)
        element.textContent = fallback;
    return element;
};
const header = (config, regions) => {
    const has = (region) => regions.includes(region);
    const avatar = document.createElement("div");
    avatar.className = `${PREFIX}-card__header-avatar`;
    avatar.append(slot("avatar"));
    const action = document.createElement("div");
    action.className = `${PREFIX}-card__header-action`;
    action.append(slot("header-action"));
    const element = createCardHeader({
        title: has("headline") ? " " : undefined,
        subtitle: has("subhead") ? " " : undefined,
        avatar: has("avatar") ? avatar : undefined,
        action: has("header-action") ? action : undefined,
    });
    element.querySelector(`.${PREFIX}-card__header-title`)?.replaceChildren(slot("headline", config.headline));
    element.querySelector(`.${PREFIX}-card__header-subtitle`)?.replaceChildren(slot("subhead", config.subhead));
    return element;
};
const create = (config) => {
    const { regions = [], headline, subhead, ariaLabel, actionsAlign = "end", ...rest } = config;
    const card = createCard({ ...rest, aria: ariaLabel ? { label: ariaLabel } : undefined });
    const has = (region) => regions.includes(region);
    if (has("media"))
        card.addMedia(createCardMedia({ element: slot("media") }));
    if (has("avatar") || has("headline") || has("subhead") || has("header-action")) {
        card.setHeader(header({ headline, subhead }, regions));
    }
    if (has("content"))
        card.addContent(createCardContent({ children: [slot()] }));
    if (has("actions")) {
        const actions = createCardActions({ align: actionsAlign });
        actions.append(slot("actions"));
        card.setActions(actions);
    }
    builtRegions.set(card, regions.join(" "));
    return card;
};
const updateCard = (host, component) => regionsOf(host).join(" ") === builtRegions.get(component);
const setDisabled = (component, disabled) => {
    const { element } = component;
    element.classList.toggle(`${component.getClass("card")}--state-disabled`, disabled);
    if (disabled)
        element.setAttribute("aria-disabled", "true");
    else
        element.removeAttribute("aria-disabled");
    if (component.config.clickable || component.config.interactive) {
        if (disabled)
            element.removeAttribute("tabindex");
        else if (!(component.config.promoteChildActions && element.getAttribute("role") === "article")) {
            element.setAttribute("tabindex", "0");
        }
    }
};
const setAriaLabel = (component, label) => {
    const { element } = component;
    if (label !== null) {
        element.setAttribute("aria-label", label);
        element.removeAttribute("aria-labelledby");
        return;
    }
    element.removeAttribute("aria-label");
    const title = element.querySelector(`.${component.getClass("card")}__header-title`);
    if (title?.id)
        element.setAttribute("aria-labelledby", title.id);
};
const cardSpec = {
    name: "card",
    slots: ["avatar", "header-action", "headline", "subhead", "media", "actions"],
    create: (config) => create(config),
    styles: ["card"],
    hostStyles: ":host{display:block}:host([disabled]){pointer-events:none}",
    attributes: {
        variant: { type: "string", config: "variant" },
        clickable: { type: "boolean", config: "clickable" },
        "promote-child-actions": { type: "boolean", config: "promoteChildActions" },
        "full-width": {
            type: "boolean",
            config: "fullWidth",
            update: (c, v) => void c.element.classList.toggle(`${c.getClass("card")}--full-width`, !!v),
        },
        headline: { type: "string", config: "headline" },
        subhead: { type: "string", config: "subhead" },
        "actions-align": { type: "string", config: "actionsAlign" },
        disabled: { type: "boolean", update: (c, v) => setDisabled(c, !!v) },
        "aria-label": { type: "string", config: "ariaLabel", update: (c, v) => setAriaLabel(c, v === null ? null : String(v)) },
    },
    config: readCard,
    setup: (host, c) => setDisabled(c, host.hasAttribute("disabled")),
    observeChildren: updateCard,
};
export const cardElement = defineElement(cardSpec);
export const defineCard = (options) => cardElement.define(options);
