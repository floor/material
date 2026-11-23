import { SIDE_SHEET_CLASSES, SIDE_SHEET_VARIANTS } from "../constants.js";
import { setHTML } from "../../../core/dom/html.js";
import { getIcon } from "../../../core/icons/registry.js";
const CLOSE_ICON = `<svg viewBox="0 -960 960 960" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>`;
export const withStructure = (config) => (component) => {
    const { element, getClass } = component;
    const isModal = config.variant === SIDE_SHEET_VARIANTS.MODAL;
    const root = getClass(SIDE_SHEET_CLASSES.ROOT);
    element.classList.add(root);
    element.classList.add(`${root}--${config.variant}`);
    element.classList.add(`${root}--${config.position}`);
    let scrim = null;
    if (isModal && config.layer !== "top") {
        scrim = document.createElement("div");
        scrim.className = getClass(SIDE_SHEET_CLASSES.SCRIM);
        element.appendChild(scrim);
    }
    const isTopDialog = element.localName === "dialog";
    const container = document.createElement("div");
    container.className = getClass(SIDE_SHEET_CLASSES.CONTAINER);
    if (!isTopDialog) {
        container.setAttribute("role", isModal ? "dialog" : "complementary");
        if (isModal)
            container.setAttribute("aria-modal", "true");
    }
    const surface = isTopDialog ? element : container;
    container.tabIndex = -1;
    if (config.width)
        container.style.width = `${config.width}px`;
    if (config.maxWidth)
        container.style.maxWidth = `${config.maxWidth}px`;
    let title = null;
    let closeButton = null;
    if (config.title || config.closeButton) {
        const header = document.createElement("div");
        header.className = getClass(SIDE_SHEET_CLASSES.HEADER);
        if (config.title) {
            title = document.createElement("h2");
            title.className = getClass(SIDE_SHEET_CLASSES.TITLE);
            title.textContent = config.title;
            title.id = `${getClass(SIDE_SHEET_CLASSES.TITLE)}-${Math.random()
                .toString(36)
                .slice(2, 9)}`;
            surface.setAttribute("aria-labelledby", title.id);
            header.appendChild(title);
        }
        if (config.closeButton) {
            closeButton = document.createElement("button");
            closeButton.type = "button";
            closeButton.className = getClass(SIDE_SHEET_CLASSES.CLOSE);
            setHTML(closeButton, getIcon("close", CLOSE_ICON));
            closeButton.setAttribute("aria-label", "Close");
            header.appendChild(closeButton);
        }
        container.appendChild(header);
    }
    if (!config.title && config.ariaLabel) {
        surface.setAttribute("aria-label", config.ariaLabel);
    }
    const content = document.createElement("div");
    content.className = getClass(SIDE_SHEET_CLASSES.CONTENT);
    if (config.content instanceof HTMLElement)
        content.appendChild(config.content);
    else if (typeof config.content === "string")
        setHTML(content, config.content);
    container.appendChild(content);
    element.appendChild(container);
    (config.container || document.body).appendChild(element);
    return {
        ...component,
        structure: {
            scrim,
            container,
            title,
            closeButton,
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
                title = document.createElement("h2");
                title.className = getClass(SIDE_SHEET_CLASSES.TITLE);
                title.textContent = next;
                title.id = `${getClass(SIDE_SHEET_CLASSES.TITLE)}-${Math.random()
                    .toString(36)
                    .slice(2, 9)}`;
                surface.removeAttribute("aria-label");
                surface.setAttribute("aria-labelledby", title.id);
                let header = container.querySelector(`.${getClass(SIDE_SHEET_CLASSES.HEADER)}`);
                if (!header) {
                    header = document.createElement("div");
                    header.className = getClass(SIDE_SHEET_CLASSES.HEADER);
                    container.insertBefore(header, content);
                }
                header.insertBefore(title, header.firstChild);
            },
        },
    };
};
