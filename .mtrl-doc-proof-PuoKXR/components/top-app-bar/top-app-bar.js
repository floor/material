import { processClassNames } from "../../core/config/component.js";
import { createBase, withElement, withEvents, withLifecycle, } from "../../core/compose/index.js";
import { createConfig } from "./config.js";
import { TOP_APP_BAR_DEFAULTS } from "./constants.js";
export const createTopAppBar = (config = {}) => {
    const componentConfig = createConfig(config);
    const component = createBase(componentConfig);
    const createContainers = () => {
        const leadingContainer = document.createElement("div");
        leadingContainer.className = `${component.getClass("top-app-bar")}__leading`;
        const headlineElement = document.createElement("h1");
        headlineElement.className = `${component.getClass("top-app-bar")}__headline`;
        if (componentConfig.title) {
            headlineElement.textContent = componentConfig.title;
        }
        const trailingContainer = document.createElement("div");
        trailingContainer.className = `${component.getClass("top-app-bar")}__trailing`;
        return { leadingContainer, headlineElement, trailingContainer };
    };
    const { leadingContainer, headlineElement, trailingContainer } = createContainers();
    const getInitialClasses = () => {
        const classes = [processClassNames(componentConfig.className || "")];
        if (componentConfig.type !== "small") {
            classes.push(`${component.getClass("top-app-bar")}--${componentConfig.type}`);
        }
        if (componentConfig.compressible &&
            (componentConfig.type === "medium" || componentConfig.type === "large")) {
            classes.push(`${component.getClass("top-app-bar")}--compressible`);
        }
        return classes.filter((name) => Boolean(name));
    };
    const enhancedComponent = withElement({
        tag: componentConfig.tag,
        componentName: "top-app-bar",
        className: getInitialClasses(),
        attributes: {
            role: "banner",
            "aria-label": "Top app bar",
        },
        interactive: true,
    })(component);
    const withEventsComponent = withEvents()(enhancedComponent);
    const withLifecycleComponent = withLifecycle()(withEventsComponent);
    const setupDomStructure = () => {
        if (componentConfig.type === "medium" || componentConfig.type === "large") {
            const topRow = document.createElement("div");
            topRow.className = `${component.getClass("top-app-bar")}__row`;
            topRow.appendChild(leadingContainer);
            topRow.appendChild(trailingContainer);
            const bottomRow = document.createElement("div");
            bottomRow.className = `${component.getClass("top-app-bar")}__row`;
            bottomRow.appendChild(headlineElement);
            withLifecycleComponent.element.appendChild(topRow);
            withLifecycleComponent.element.appendChild(bottomRow);
        }
        else {
            withLifecycleComponent.element.appendChild(leadingContainer);
            withLifecycleComponent.element.appendChild(headlineElement);
            withLifecycleComponent.element.appendChild(trailingContainer);
        }
    };
    setupDomStructure();
    let isScrolled = false;
    if (componentConfig.scrollable) {
        const handleScroll = () => {
            const shouldBeScrolled = window.scrollY > (componentConfig.scrollThreshold ?? TOP_APP_BAR_DEFAULTS.SCROLL_THRESHOLD);
            if (isScrolled !== shouldBeScrolled) {
                isScrolled = shouldBeScrolled;
                if (isScrolled) {
                    withLifecycleComponent.element.classList.add(`${component.getClass("top-app-bar")}--scrolled`);
                }
                else {
                    withLifecycleComponent.element.classList.remove(`${component.getClass("top-app-bar")}--scrolled`);
                }
                componentConfig.onScroll?.(isScrolled);
            }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        const originalDestroy = withLifecycleComponent.lifecycle.destroy;
        withLifecycleComponent.lifecycle.destroy = () => {
            window.removeEventListener("scroll", handleScroll);
            originalDestroy();
        };
    }
    const reorganizeDom = (type) => {
        while (withLifecycleComponent.element.firstChild) {
            withLifecycleComponent.element.removeChild(withLifecycleComponent.element.firstChild);
        }
        ["small", "medium", "large", "center"].forEach((t) => {
            withLifecycleComponent.element.classList.remove(`${component.getClass("top-app-bar")}--${t}`);
        });
        if (type !== "small") {
            withLifecycleComponent.element.classList.add(`${component.getClass("top-app-bar")}--${type}`);
        }
        withLifecycleComponent.element.classList.toggle(`${component.getClass("top-app-bar")}--compressible`, componentConfig.compressible && (type === "medium" || type === "large"));
        if (type === "medium" || type === "large") {
            const topRow = document.createElement("div");
            topRow.className = `${component.getClass("top-app-bar")}__row`;
            topRow.appendChild(leadingContainer);
            topRow.appendChild(trailingContainer);
            const bottomRow = document.createElement("div");
            bottomRow.className = `${component.getClass("top-app-bar")}__row`;
            bottomRow.appendChild(headlineElement);
            withLifecycleComponent.element.appendChild(topRow);
            withLifecycleComponent.element.appendChild(bottomRow);
        }
        else {
            withLifecycleComponent.element.appendChild(leadingContainer);
            withLifecycleComponent.element.appendChild(headlineElement);
            withLifecycleComponent.element.appendChild(trailingContainer);
        }
    };
    const topAppBar = {
        ...withLifecycleComponent,
        addClass(...classes) {
            withLifecycleComponent.addClass(...classes);
            return this;
        },
        destroy() {
            withLifecycleComponent.lifecycle.destroy();
        },
        setTitle(title) {
            headlineElement.textContent = title;
            return this;
        },
        getTitle() {
            return headlineElement.textContent || "";
        },
        addLeadingElement(element) {
            leadingContainer.appendChild(element);
            return this;
        },
        addTrailingElement(element) {
            trailingContainer.appendChild(element);
            return this;
        },
        setType(type) {
            componentConfig.type = type;
            reorganizeDom(type);
            return this;
        },
        setScrollState(scrolled) {
            isScrolled = scrolled;
            if (scrolled) {
                this.element.classList.add(`${component.getClass("top-app-bar")}--scrolled`);
            }
            else {
                this.element.classList.remove(`${component.getClass("top-app-bar")}--scrolled`);
            }
            return this;
        },
        getHeadlineElement() {
            return headlineElement;
        },
        getLeadingContainer() {
            return leadingContainer;
        },
        getTrailingContainer() {
            return trailingContainer;
        },
    };
    return topAppBar;
};
export const createAppBar = createTopAppBar;
