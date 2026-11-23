import { processClassNames } from "../../core/config/component.js";
import { getCleanup } from "../../core/compose/cleanup.js";
import { PREFIX } from "../../core/config.js";
import { createConfig } from "../bottom-app-bar/config.js";
import { createToolbarStructure, createToolbarFab } from "./structure.js";
export function createBottomAppBarToolbar(config = {}) {
    const settings = createConfig(config);
    const block = `${PREFIX}-bottom-app-bar`;
    const { component, bar } = createToolbarStructure(settings, {
        tag: settings.tag,
        componentName: "bottom-app-bar",
        className: [
            `${PREFIX}-toolbar`, `${PREFIX}-toolbar--docked`, `${PREFIX}-toolbar--bottom`, `${PREFIX}-toolbar--standard`,
            `${block}-toolbar`,
            settings.hasFab ? `${block}--with-fab` : "",
            settings.fabPosition === "center" ? `${block}--fab-center` : "",
            processClassNames(settings.className || ""),
        ].filter(Boolean),
        attributes: { role: "toolbar", "aria-label": "Bottom app bar" },
        interactive: true,
    }, `${PREFIX}-toolbar__bar ${block}__actions`, {});
    const root = component.element;
    const fab = createToolbarFab(root, `${PREFIX}-toolbar__fab ${block}__fab-container`);
    const resources = getCleanup(component);
    let visible = true;
    let previous = window.scrollY;
    const setVisible = (next) => {
        root.classList.toggle(`${block}--hidden`, !next);
        const changed = visible !== next;
        visible = next;
        if (changed)
            settings.onVisibilityChange?.(next);
    };
    const api = {
        ...component,
        addClass(...classes) { component.addClass(...classes); return this; },
        addAction(action) { bar.appendChild(action); return this; },
        addFab(element) {
            fab.replaceChildren(element);
            root.classList.add(`${block}--with-fab`);
            return this;
        },
        getActionsContainer() { return bar; },
        show() { setVisible(true); return this; },
        hide() { setVisible(false); return this; },
        isVisible() { return visible; },
        destroy() { component.lifecycle.destroy(); },
    };
    if (settings.autoHide) {
        const scroll = () => {
            const current = window.scrollY;
            if (current > previous + 10 && visible)
                api.hide();
            else if (current < previous - 10 && !visible)
                api.show();
            previous = current;
        };
        window.addEventListener("scroll", scroll, { passive: true });
        resources.add(() => window.removeEventListener("scroll", scroll));
    }
    if (settings.autoHide && settings.transitionDuration) {
        root.style.transition = `transform ${settings.transitionDuration}ms ease-in-out`;
    }
    return api;
}
export default createBottomAppBarToolbar;
