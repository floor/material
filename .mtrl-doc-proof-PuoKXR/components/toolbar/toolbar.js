import { processClassNames } from "../../core/config/component.js";
import { pipe } from "../../core/compose/pipe.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { getCleanup } from "../../core/compose/cleanup.js";
import { PREFIX } from "../../core/config.js";
import { createRoving } from "../../core/dom/roving.js";
import createIconButton from "../icon-button/icon-button.js";
import createButton from "../button/index.js";
import { createConfig, resolveColor, OVERFLOW_ICON } from "./config.js";
import { TOOLBAR_EVENTS, TOOLBAR_PLACEMENTS, TOOLBAR_VARIANTS } from "./constants.js";
const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex], [contenteditable="true"]';
const elementOf = (item) => item instanceof HTMLElement ? item : item.element;
const isElementItem = (item) => item instanceof HTMLElement || item.element instanceof HTMLElement;
const createToolbar = (config = {}) => {
    const settings = createConfig(config);
    const { variant, orientation, placement } = settings;
    const block = `${PREFIX}-toolbar`;
    const vertical = orientation === "vertical";
    let color = settings.color;
    const component = pipe(createBase, withEvents(), withElement({
        tag: "div",
        componentName: "toolbar",
        className: [
            `${block}--${variant}`,
            `${block}--${color}`,
            vertical ? `${block}--vertical` : "",
            placement !== TOOLBAR_PLACEMENTS.NONE ? `${block}--${placement}` : "",
            variant === TOOLBAR_VARIANTS.DOCKED ? `${block}--${settings.arrangement}` : "",
            settings.elevated ? `${block}--elevated` : "",
            processClassNames(settings.className || ""),
        ].filter(Boolean),
    }), withLifecycle())(settings);
    const resources = getCleanup(component);
    const root = component.element;
    const bar = document.createElement("div");
    bar.className = `${block}__bar`;
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", settings.ariaLabel || "Toolbar");
    if (vertical)
        bar.setAttribute("aria-orientation", "vertical");
    root.appendChild(bar);
    const created = new Map();
    const targetOf = (element) => element.matches(FOCUSABLE) || element.localName.includes("-")
        ? element
        : element.querySelector(FOCUSABLE);
    const roving = createRoving({
        container: bar,
        vertical: () => vertical,
        targets: () => Array.from(bar.children)
            .flatMap((child) => child.localName === "slot"
            ? child.assignedElements({ flatten: true })
            : [child])
            .map(targetOf)
            .filter((target) => target !== null),
    });
    const onSlotChange = () => roving.sync();
    bar.addEventListener("slotchange", onSlotChange);
    resources.add(() => {
        roving.destroy();
        bar.removeEventListener("slotchange", onSlotChange);
    });
    let overflowButton = null;
    const build = (item) => {
        if (isElementItem(item))
            return elementOf(item);
        const made = typeof item.text === "string"
            ? createButton(item)
            : createIconButton(item);
        created.set(made.element, made);
        return made.element;
    };
    if (settings.overflow) {
        const button = createIconButton({
            icon: settings.overflowIcon || OVERFLOW_ICON,
            ariaLabel: settings.overflowLabel || "More options",
            class: `${block}__overflow`,
        });
        button.element.setAttribute("aria-haspopup", "menu");
        button.element.setAttribute("aria-expanded", "false");
        created.set(button.element, button);
        overflowButton = button.element;
        bar.appendChild(overflowButton);
        const menu = settings.overflow(overflowButton);
        if (typeof menu?.destroy === "function")
            resources.add(() => menu.destroy());
    }
    const add = (item) => {
        const element = build(item);
        bar.insertBefore(element, overflowButton);
        roving.sync();
        return element;
    };
    (settings.items ?? []).forEach(add);
    if (settings.fab) {
        const fab = document.createElement("div");
        fab.className = `${block}__fab`;
        fab.appendChild(elementOf(settings.fab));
        root.classList.add(`${block}--with-fab`);
        if (settings.fabPosition === "start") {
            root.classList.add(`${block}--fab-start`);
            root.insertBefore(fab, bar);
        }
        else {
            root.appendChild(fab);
        }
    }
    let visible = true;
    const setVisible = (next) => {
        if (next === visible)
            return;
        visible = next;
        root.classList.toggle(`${block}--hidden`, !visible);
        if (visible)
            root.removeAttribute("inert");
        else
            root.setAttribute("inert", "");
        component.emit(visible ? TOOLBAR_EVENTS.SHOW : TOOLBAR_EVENTS.HIDE);
    };
    let collapsed = false;
    const setCollapsed = (next) => {
        if (next === collapsed)
            return;
        collapsed = next;
        root.classList.toggle(`${block}--collapsed`, collapsed);
        component.emit(collapsed ? TOOLBAR_EVENTS.COLLAPSE : TOOLBAR_EVENTS.EXPAND);
    };
    if (settings.exit || settings.collapse) {
        const target = settings.scrollTarget ?? window;
        const position = () => target === window ? window.scrollY : target.scrollTop;
        const threshold = settings.scrollThreshold;
        let anchor = position();
        const onScroll = () => {
            const y = position();
            const open = settings.exit ? visible : !collapsed;
            if (y <= 0) {
                if (settings.exit)
                    setVisible(true);
                else
                    setCollapsed(false);
                anchor = 0;
            }
            else if (open ? y - anchor >= threshold : anchor - y >= threshold) {
                if (settings.exit)
                    setVisible(!visible);
                else
                    setCollapsed(!collapsed);
                anchor = y;
            }
            else if (open ? y < anchor : y > anchor) {
                anchor = y;
            }
        };
        target.addEventListener("scroll", onScroll, { passive: true });
        resources.add(() => target.removeEventListener("scroll", onScroll));
    }
    resources.add(() => {
        created.forEach((item) => item.destroy());
        created.clear();
    });
    const toolbar = {
        ...component,
        bar,
        overflowButton,
        addClass(...classes) {
            component.addClass(...classes);
            return this;
        },
        add,
        remove(item) {
            const element = elementOf(item);
            if (element.parentNode !== bar || element === overflowButton)
                return this;
            const made = created.get(element);
            if (made) {
                created.delete(element);
                made.destroy();
            }
            element.remove();
            roving.sync();
            return this;
        },
        getItems() {
            return Array.from(bar.children).filter((element) => element !== overflowButton);
        },
        show() {
            setVisible(true);
            return this;
        },
        hide() {
            setVisible(false);
            return this;
        },
        isVisible() {
            return visible;
        },
        setColor(next) {
            const resolved = resolveColor(next);
            root.classList.replace(`${block}--${color}`, `${block}--${resolved}`);
            color = resolved;
            return this;
        },
        getColor() {
            return color;
        },
        on(event, handler) {
            component.on(event, handler);
            return this;
        },
        off(event, handler) {
            component.off(event, handler);
            return this;
        },
        destroy() {
            component.lifecycle.destroy();
        },
    };
    return toolbar;
};
export default createToolbar;
export { createToolbar };
