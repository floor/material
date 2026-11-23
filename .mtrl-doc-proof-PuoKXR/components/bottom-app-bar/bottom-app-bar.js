import { processClassNames } from "../../core/config/component.js";
import { createBase, withElement, withEvents, withLifecycle, } from "../../core/compose/index.js";
import { createConfig } from "./config.js";
export const createBottomAppBar = (config = {}) => {
    const componentConfig = createConfig(config);
    const component = createBase(componentConfig);
    const actionsContainer = document.createElement("div");
    actionsContainer.className = `${component.getClass("bottom-app-bar")}__actions`;
    const fabContainer = document.createElement("div");
    fabContainer.className = `${component.getClass("bottom-app-bar")}__fab-container`;
    const enhancedComponent = withElement({
        tag: componentConfig.tag,
        componentName: "bottom-app-bar",
        className: [
            componentConfig.hasFab
                ? `${component.getClass("bottom-app-bar")}--with-fab`
                : "",
            componentConfig.fabPosition === "center"
                ? `${component.getClass("bottom-app-bar")}--fab-center`
                : "",
            processClassNames(componentConfig.className || ""),
        ].filter((name) => Boolean(name)),
        attributes: {
            role: "toolbar",
            "aria-label": "Bottom app bar",
        },
        interactive: true,
    })(component);
    const withEventsComponent = withEvents()(enhancedComponent);
    const withLifecycleComponent = withLifecycle()(withEventsComponent);
    withLifecycleComponent.element.appendChild(actionsContainer);
    withLifecycleComponent.element.appendChild(fabContainer);
    let isVisible = true;
    let prevScrollY = window.scrollY;
    if (componentConfig.autoHide) {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > prevScrollY + 10) {
                if (isVisible) {
                    bottomBar.hide();
                }
            }
            else if (currentScrollY < prevScrollY - 10) {
                if (!isVisible) {
                    bottomBar.show();
                }
            }
            prevScrollY = currentScrollY;
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        const originalDestroy = withLifecycleComponent.lifecycle.destroy;
        withLifecycleComponent.lifecycle.destroy = () => {
            window.removeEventListener("scroll", handleScroll);
            originalDestroy();
        };
    }
    const bottomBar = {
        ...withLifecycleComponent,
        addClass(...classes) {
            withLifecycleComponent.addClass(...classes);
            return this;
        },
        destroy() {
            withLifecycleComponent.lifecycle.destroy();
        },
        addAction(button) {
            actionsContainer.appendChild(button);
            return this;
        },
        addFab(fab) {
            fabContainer.replaceChildren();
            fabContainer.appendChild(fab);
            this.element.classList.add(`${component.getClass("bottom-app-bar")}--with-fab`);
            return this;
        },
        show() {
            this.element.classList.remove(`${component.getClass("bottom-app-bar")}--hidden`);
            const changed = !isVisible;
            isVisible = true;
            if (changed)
                componentConfig.onVisibilityChange?.(true);
            return this;
        },
        hide() {
            this.element.classList.add(`${component.getClass("bottom-app-bar")}--hidden`);
            const changed = isVisible;
            isVisible = false;
            if (changed)
                componentConfig.onVisibilityChange?.(false);
            return this;
        },
        isVisible() {
            return isVisible;
        },
        getActionsContainer() {
            return actionsContainer;
        },
    };
    if (componentConfig.autoHide && componentConfig.transitionDuration) {
        bottomBar.element.style.transition = `transform ${componentConfig.transitionDuration}ms ease-in-out`;
    }
    return bottomBar;
};
