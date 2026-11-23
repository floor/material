import { createDrawerSpec } from "./navigation-drawer.js";
import { createDeclarationClass, defineElement } from "./define.js";
import { DEFAULT_PREFIX } from "./define.js";
const drawerSpec = createDrawerSpec("drawer");
export const drawerElement = defineElement(drawerSpec);
export const drawerItemDeclaration = {
    name: "drawer-item",
    attributes: {
        type: { type: "string" },
        value: { type: "string" },
        label: { type: "string" },
        icon: { type: "string" },
        "selected-icon": { type: "string" },
        badge: { type: "string" },
        href: { type: "string" },
        expanded: { type: "boolean" },
        disabled: { type: "boolean" },
    },
};
export const defineDrawer = (options) => {
    const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${drawerItemDeclaration.name}`;
    if (!customElements.get(itemTag))
        customElements.define(itemTag, createDeclarationClass(drawerItemDeclaration.attributes));
    return drawerElement.define(options);
};
