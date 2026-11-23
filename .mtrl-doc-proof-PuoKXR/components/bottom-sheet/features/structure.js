import { BOTTOM_SHEET_CLASSES, BOTTOM_SHEET_VARIANTS } from "../constants.js";
import { PREFIX } from "../../../core/config.js";
import { setHTML } from "../../../core/dom/html.js";
export const withStructure = (config) => (component) => {
    const { element, getClass } = component;
    const isModal = config.variant === BOTTOM_SHEET_VARIANTS.MODAL;
    element.classList.add(getClass(BOTTOM_SHEET_CLASSES.ROOT));
    element.classList.add(`${getClass(BOTTOM_SHEET_CLASSES.ROOT)}--${config.variant}`);
    let scrim = null;
    if (isModal && config.layer !== "top") {
        scrim = document.createElement("div");
        scrim.className = getClass(BOTTOM_SHEET_CLASSES.SCRIM);
        element.appendChild(scrim);
    }
    const isTopDialog = element.localName === "dialog";
    const container = document.createElement("div");
    container.className = getClass(BOTTOM_SHEET_CLASSES.CONTAINER);
    if (!isTopDialog) {
        container.setAttribute("role", isModal ? "dialog" : "region");
        if (isModal)
            container.setAttribute("aria-modal", "true");
    }
    const surface = isTopDialog ? element : container;
    container.tabIndex = -1;
    if (config.maxWidth) {
        container.style.maxWidth = `${config.maxWidth}px`;
    }
    if (config.peekHeight) {
        container.style.setProperty(`--${PREFIX}-bottom-sheet-peek-height`, `${config.peekHeight}px`);
    }
    let handle = null;
    if (config.dragHandle) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = getClass(BOTTOM_SHEET_CLASSES.HANDLE);
        handle = button;
        container.appendChild(handle);
    }
    let title = null;
    if (config.title) {
        const header = document.createElement("div");
        header.className = getClass(BOTTOM_SHEET_CLASSES.HEADER);
        title = document.createElement("h2");
        title.className = getClass(BOTTOM_SHEET_CLASSES.TITLE);
        title.textContent = config.title;
        title.id = `${getClass(BOTTOM_SHEET_CLASSES.TITLE)}-${Math.random()
            .toString(36)
            .slice(2, 9)}`;
        surface.setAttribute("aria-labelledby", title.id);
        header.appendChild(title);
        container.appendChild(header);
    }
    else if (config.ariaLabel) {
        surface.setAttribute("aria-label", config.ariaLabel);
    }
    const content = document.createElement("div");
    content.className = getClass(BOTTOM_SHEET_CLASSES.CONTENT);
    if (config.content instanceof HTMLElement) {
        content.appendChild(config.content);
    }
    else if (typeof config.content === "string") {
        setHTML(content, config.content);
    }
    container.appendChild(content);
    element.appendChild(container);
    (config.container || document.body).appendChild(element);
    return {
        ...component,
        structure: {
            scrim,
            container,
            handle,
            title,
            content,
            setContent(next) {
                content.replaceChildren();
                if (next instanceof HTMLElement)
                    content.appendChild(next);
                else
                    setHTML(content, next);
            },
            setTitle(next) {
                if (title) {
                    title.textContent = next;
                    return;
                }
                const header = document.createElement("div");
                header.className = getClass(BOTTOM_SHEET_CLASSES.HEADER);
                title = document.createElement("h2");
                title.className = getClass(BOTTOM_SHEET_CLASSES.TITLE);
                title.textContent = next;
                title.id = `${getClass(BOTTOM_SHEET_CLASSES.TITLE)}-${Math.random()
                    .toString(36)
                    .slice(2, 9)}`;
                surface.removeAttribute("aria-label");
                surface.setAttribute("aria-labelledby", title.id);
                header.appendChild(title);
                container.insertBefore(header, content);
            },
        },
    };
};
