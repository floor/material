import createTabs from "../components/tabs/index.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
const declaredTabs = (host) => {
    const tabTag = host.localName.replace(/tabs$/, "tab");
    const active = host.getAttribute("value");
    const tabs = [];
    for (const child of Array.from(host.children)) {
        if (child.localName !== tabTag)
            continue;
        const text = child.getAttribute("label") ?? (child.textContent ?? "").trim();
        const value = child.getAttribute("value") ?? text;
        const badge = child.getAttribute("badge");
        tabs.push({
            text,
            value,
            icon: child.getAttribute("icon") ?? undefined,
            ariaLabel: child.getAttribute("aria-label") ?? undefined,
            badge: badge ?? undefined,
            disabled: child.hasAttribute("disabled"),
            state: value === active ? "active" : undefined,
        });
    }
    return tabs;
};
const readTabs = (host) => ({ tabs: declaredTabs(host) });
const updateTabs = (host, component) => {
    const declared = declaredTabs(host);
    const values = declared.map((tab) => tab.value ?? "");
    if (new Set(values).size !== values.length)
        return false;
    const current = component.getTabs();
    const existing = new Set(current.map((tab) => tab.getValue()));
    const kept = current.map((tab) => tab.getValue()).filter((value) => values.includes(value));
    const firstNew = values.findIndex((value) => !existing.has(value));
    const declaredKept = (firstNew === -1 ? values : values.slice(0, firstNew)).filter((value) => existing.has(value));
    if (kept.join("\u0000") !== declaredKept.join("\u0000"))
        return false;
    if (firstNew !== -1 && values.slice(firstNew).some((value) => existing.has(value)))
        return false;
    for (const tab of current)
        if (!values.includes(tab.getValue()))
            component.removeTab(tab);
    for (const config of declared) {
        const tab = component.getTabs().find((candidate) => candidate.getValue() === config.value);
        if (!tab) {
            component.addTab({ ...config, state: undefined });
            continue;
        }
        if (tab.getText() !== (config.text ?? ""))
            tab.setText(config.text ?? "");
        if (tab.getIcon() !== (config.icon ?? ""))
            tab.setIcon(config.icon ?? "");
        tab.setAriaLabel(config.ariaLabel);
        if (config.badge !== undefined) {
            if (tab.getBadge() !== String(config.badge))
                tab.setBadge(config.badge);
            else
                tab.showBadge();
        }
        else {
            tab.hideBadge();
        }
        if (config.disabled)
            tab.disable();
        else
            tab.enable();
    }
    return true;
};
const tabsSpec = {
    name: "tabs",
    create: (config) => createTabs(config),
    styles: ["badge", "progress", "button", "tabs"],
    hostStyles: ":host{display:block;contain:layout}" +
        ":host(:dir(rtl)) :is(.mtrl-tab--icon-only,.mtrl-tab--icon-and-text) .mtrl-badge__wrapper .mtrl-badge--top-right{right:calc(100% - 6px);left:auto}" +
        ":host(:dir(rtl)) .mtrl-tab--text-only .mtrl-badge__wrapper .mtrl-badge--top-right{right:calc(100% + 4px);left:auto}",
    attributes: {
        "aria-label": {
            type: "string", config: "ariaLabel",
            update: (c, v) => v === null ? c.element.removeAttribute("aria-label") : c.element.setAttribute("aria-label", String(v)),
        },
        variant: { type: "string", config: "variant" },
        value: { type: "string" },
    },
    properties: {
        value: {
            get: (c) => c.getActiveTab()?.getValue() ?? null,
            set: (c, v) => void (v === null || v === undefined ? undefined : c.setActiveTab(String(v))),
        },
    },
    model: "value",
    events: {
        change: {
            detail: (payload) => ({ value: payload.value }),
        },
    },
    config: readTabs,
    observeChildren: updateTabs,
};
export const tabsElement = defineElement(tabsSpec);
export const tabDeclaration = {
    name: "tab",
    attributes: {
        "aria-label": { type: "string" },
        value: { type: "string" },
        label: { type: "string" },
        icon: { type: "string" },
        badge: { type: "string" },
        disabled: { type: "boolean" },
    },
};
export const defineTabs = (options) => {
    const tabTag = `${options?.prefix ?? DEFAULT_PREFIX}-${tabDeclaration.name}`;
    if (!customElements.get(tabTag))
        customElements.define(tabTag, createDeclarationClass(tabDeclaration.attributes));
    return tabsElement.define(options);
};
