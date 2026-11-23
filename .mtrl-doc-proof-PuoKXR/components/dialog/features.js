import createButton from "../button/index.js";
import { addClass, removeClass } from "../../core/dom/classes.js";
import { setHTML } from "../../core/dom/html.js";
import { getIcon } from "../../core/icons/registry.js";
import { deepActiveElement, tabStops, wrapTab } from "../../core/dom/focus.js";
import { hideFromTopLayer, onModalEscape, onTopLayerClose, showInTopLayer } from "../../core/dom/layer.js";
const DIALOG_EVENTS = {
    OPEN: "open",
    CLOSE: "close",
    BEFORE_OPEN: "beforeopen",
    BEFORE_CLOSE: "beforeclose",
    AFTER_OPEN: "afteropen",
    AFTER_CLOSE: "afterclose",
};
let dialogCount = 0;
export const withStructure = (config, getComponent) => (component) => {
    const uid = `${component.getClass("dialog")}-${++dialogCount}`;
    const titleId = `${uid}-title`;
    const contentId = `${uid}-content`;
    const overlay = document.createElement("div");
    overlay.classList.add(component.getClass("dialog__overlay"));
    if (config.zIndex) {
        overlay.style.zIndex = String(config.zIndex);
    }
    const showCloseButton = config.closeButton ?? config.size === "fullscreen";
    const createHeader = () => {
        const header = document.createElement("div");
        header.classList.add(component.getClass("dialog__header"));
        const headerContent = document.createElement("div");
        headerContent.classList.add(component.getClass("dialog__header-content"));
        header.appendChild(headerContent);
        if (config.title) {
            const title = document.createElement("h2");
            title.classList.add(component.getClass("dialog__header-title"));
            title.id = titleId;
            title.textContent = config.title;
            headerContent.appendChild(title);
        }
        if (config.subtitle) {
            const subtitle = document.createElement("p");
            subtitle.classList.add(component.getClass("dialog__header-subtitle"));
            subtitle.textContent = config.subtitle;
            headerContent.appendChild(subtitle);
        }
        if (showCloseButton) {
            const closeButton = document.createElement("button");
            closeButton.classList.add(component.getClass("dialog__header-close"));
            closeButton.setAttribute("aria-label", "Close dialog");
            setHTML(closeButton, getIcon("close", `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `));
            closeButton.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                component.emit("dialog:close", { source: "closeButton" });
            });
            header.appendChild(closeButton);
        }
        return header;
    };
    const createContent = () => {
        const content = document.createElement("div");
        content.classList.add(component.getClass("dialog__content"));
        content.id = contentId;
        if (config.content) {
            setHTML(content, config.content);
        }
        return content;
    };
    const createFooter = () => {
        const footer = document.createElement("div");
        footer.classList.add(component.getClass("dialog__footer"));
        const alignment = config.footerAlignment || "right";
        if (alignment !== "right") {
            addClass(footer, `${component.getClass("dialog__footer")}--${alignment}`);
        }
        if (Array.isArray(config.buttons) && config.buttons.length > 0) {
            config.buttons.forEach((buttonConfig) => addButton(footer, buttonConfig, component, getComponent));
        }
        return footer;
    };
    const createDividerElement = () => {
        const divider = document.createElement("hr");
        divider.classList.add(component.getClass("dialog__divider"));
        return divider;
    };
    const header = createHeader();
    const content = createContent();
    const footer = Array.isArray(config.buttons) && config.buttons.length > 0
        ? createFooter()
        : null;
    addClass(component.element, component.getClass("dialog"));
    component.element.inert = true;
    component.element.setAttribute("aria-hidden", "true");
    if (config.title) {
        component.element.setAttribute("aria-labelledby", titleId);
    }
    else if (config.ariaLabel) {
        component.element.setAttribute("aria-label", config.ariaLabel);
    }
    if (config.content) {
        component.element.setAttribute("aria-describedby", contentId);
    }
    const size = config.size || "medium";
    if (size !== "medium") {
        addClass(component.element, `${component.getClass("dialog")}--${size}`);
    }
    const animation = config.animation || "scale";
    if (animation !== "scale") {
        addClass(component.element, `${component.getClass("dialog")}--${animation}`);
    }
    component.element.appendChild(header);
    let headerDivider = null;
    let footerDivider = null;
    if (config.divider) {
        headerDivider = createDividerElement();
        headerDivider.classList.add(component.getClass("dialog__header-divider"));
        component.element.appendChild(headerDivider);
        if (footer) {
            footerDivider = createDividerElement();
            footerDivider.classList.add(component.getClass("dialog__footer-divider"));
        }
    }
    component.element.appendChild(content);
    if (footerDivider) {
        component.element.appendChild(footerDivider);
    }
    if (footer) {
        component.element.appendChild(footer);
    }
    const container = config.container || document.body;
    if (config.layer === "top") {
        container.appendChild(component.element);
    }
    else {
        overlay.appendChild(component.element);
        container.appendChild(overlay);
    }
    return {
        ...component,
        overlay,
        structure: {
            header,
            content,
            footer,
            headerDivider,
            footerDivider,
            container,
        },
    };
};
export const withDivider = () => (component) => {
    return {
        ...component,
        divider: {
            toggleDivider(show) {
                if (show && !component.structure.headerDivider) {
                    const headerDivider = document.createElement("hr");
                    headerDivider.classList.add(component.getClass("dialog__divider"), component.getClass("dialog__header-divider"));
                    component.element.insertBefore(headerDivider, component.structure.content);
                    component.structure.headerDivider = headerDivider;
                    if (component.structure.footer &&
                        !component.structure.footerDivider) {
                        const footerDivider = document.createElement("hr");
                        footerDivider.classList.add(component.getClass("dialog__divider"), component.getClass("dialog__footer-divider"));
                        component.element.insertBefore(footerDivider, component.structure.footer);
                        component.structure.footerDivider = footerDivider;
                    }
                }
                else if (!show) {
                    if (component.structure.headerDivider) {
                        component.structure.headerDivider.remove();
                        component.structure.headerDivider = null;
                    }
                    if (component.structure.footerDivider) {
                        component.structure.footerDivider.remove();
                        component.structure.footerDivider = null;
                    }
                }
                return component;
            },
            hasDivider() {
                return component.structure.headerDivider !== null;
            },
        },
    };
};
const addButton = (footer, buttonConfig, component, getComponent) => {
    const { text, variant = "text", onClick, closeDialog = true, autofocus = false, attributes = {}, size, } = buttonConfig;
    const button = createButton({
        text,
        variant,
        ...(size ? { size } : {}),
        ...attributes,
    });
    button.on("click", ({ originalEvent: event }) => {
        let shouldClose = closeDialog;
        if (typeof onClick === "function") {
            try {
                const result = onClick(event, getComponent());
                if (result === false) {
                    shouldClose = false;
                }
            }
            catch (err) {
                console.error("Error in onClick handler:", err);
            }
        }
        if (shouldClose) {
            component.emit("dialog:close", { source: "button", text });
        }
    });
    if (autofocus) {
        button.element.setAttribute("autofocus", "true");
    }
    footer.appendChild(button.element);
    if (!component._buttons) {
        component._buttons = [];
    }
    component._buttons.push({
        config: buttonConfig,
        instance: button,
    });
};
export const withVisibility = (getComponent) => (component) => {
    const isOpen = component.config.open === true;
    let opened = isOpen;
    let escape;
    let showTimer;
    let afterOpenTimer;
    let afterCloseTimer;
    let afterOpenWaiting = false;
    const openDuration = component.config.animationDuration ?? 500;
    const closeDuration = component.config.animationDuration ?? 150;
    const top = component.config.layer === "top";
    const scrim = top ? component.element : component.overlay;
    let previouslyFocusedElement = null;
    let mouseDownOnOverlay = false;
    const inerted = [];
    let scrollLock = null;
    let focusFrame;
    let focusView;
    let focusRequest = 0;
    let focusPending = false;
    const cancelFocusFrame = () => {
        focusRequest += 1;
        focusPending = false;
        if (focusFrame !== undefined) {
            focusView?.cancelAnimationFrame(focusFrame);
            focusFrame = undefined;
            focusView = undefined;
        }
    };
    const emit = (type) => {
        component.emit?.(type, { dialog: getComponent() });
    };
    const ask = (type) => {
        const e = {
            dialog: getComponent(),
            defaultPrevented: false,
            preventDefault: () => {
                e.defaultPrevented = true;
            },
        };
        component.emit?.(type, e);
        return e.defaultPrevented;
    };
    const stopOpen = () => {
        opened = false;
        clearTimeout(showTimer);
        clearTimeout(afterOpenTimer);
        afterOpenWaiting = false;
        cancelFocusFrame();
    };
    const emitAfterOpen = () => {
        afterOpenWaiting = false;
        if (opened)
            emit(DIALOG_EVENTS.AFTER_OPEN);
    };
    const afterOpenDue = () => {
        afterOpenTimer = undefined;
        if (focusPending) {
            afterOpenWaiting = true;
            return;
        }
        emitAfterOpen();
    };
    const inertBackground = () => {
        if (component.config.modal === false)
            return;
        const parent = top ? null : component.overlay.parentElement;
        if (parent) {
            for (const sibling of parent.children) {
                if (sibling !== component.overlay && !sibling.hasAttribute("inert")) {
                    sibling.setAttribute("inert", "");
                    inerted.push(sibling);
                }
            }
        }
        const body = component.element.ownerDocument.body;
        if (body && scrollLock === null) {
            scrollLock = body.style.overflow;
            body.style.overflow = "hidden";
        }
    };
    const releaseBackground = () => {
        inerted.splice(0).forEach((el) => el.removeAttribute("inert"));
        const body = component.element.ownerDocument.body;
        if (body && scrollLock !== null) {
            body.style.overflow = scrollLock;
            scrollLock = null;
        }
    };
    let containerPosition = null;
    const unscopeScrim = () => {
        removeClass(component.overlay, `${component.getClass("dialog__overlay")}--contained`);
        if (containerPosition === null)
            return;
        component.structure.container.style.position = containerPosition;
        containerPosition = null;
    };
    const scopeScrim = () => {
        const container = component.structure.container;
        if (top || container === document.body)
            return;
        if (getComputedStyle(container).position === "static") {
            containerPosition ??= container.style.position;
            container.style.position = "relative";
        }
        addClass(component.overlay, `${component.getClass("dialog__overlay")}--contained`);
        if (!container.clientHeight ||
            container.clientWidth < component.element.offsetWidth ||
            container.clientHeight < component.element.offsetHeight) {
            unscopeScrim();
        }
    };
    const handleWrap = (e) => wrapTab(component.element, e);
    const focusWhenVisible = (target) => {
        const view = target.ownerDocument.defaultView;
        cancelFocusFrame();
        const request = focusRequest;
        const settle = () => {
            focusFrame = undefined;
            if (request !== focusRequest)
                return;
            const alive = opened && target.isConnected;
            if (alive &&
                typeof view?.requestAnimationFrame === "function" &&
                view.getComputedStyle(target).visibility === "hidden") {
                focusPending = true;
                focusFrame = view.requestAnimationFrame(settle);
                focusView = view;
                return;
            }
            if (alive)
                target.focus();
            focusPending = false;
            if (afterOpenWaiting)
                emitAfterOpen();
        };
        settle();
    };
    const trapFocus = () => {
        inertBackground();
        if (component.config.autofocus !== false) {
            const requested = component.element.querySelector("[autofocus]");
            const target = requested || tabStops(component.element)[0] || component.element;
            focusWhenVisible(target);
        }
        if (component.config.trapFocus !== false) {
            component.element.addEventListener("keydown", handleWrap);
        }
    };
    const releaseFocus = () => {
        component.element.removeEventListener("keydown", handleWrap);
        releaseBackground();
        if (previouslyFocusedElement) {
            if (previouslyFocusedElement.isConnected)
                previouslyFocusedElement.focus();
            previouslyFocusedElement = null;
        }
    };
    const setupEvents = () => {
        if (component.config.closeOnOverlayClick !== false) {
            scrim.addEventListener("mousedown", handleOverlayMouseDown);
            document.addEventListener("mouseup", handleOverlayMouseUp);
        }
        escape?.stop();
        escape = onModalEscape(component.element, () => {
            if (component.config.closeOnEscape !== false)
                visibility.close();
        }, top && (() => component.element.dispatchEvent(new Event("cancel", { cancelable: true }))));
    };
    const cleanupEvents = () => {
        scrim.removeEventListener("mousedown", handleOverlayMouseDown);
        document.removeEventListener("mouseup", handleOverlayMouseUp);
        escape?.stop();
    };
    const onScrim = (e) => {
        if (!top)
            return e.target === component.overlay;
        if (e.composedPath()[0] !== scrim)
            return false;
        const box = scrim.getBoundingClientRect();
        return e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom;
    };
    function handleOverlayMouseDown(e) {
        mouseDownOnOverlay = onScrim(e);
    }
    function handleOverlayMouseUp(e) {
        if (mouseDownOnOverlay && onScrim(e)) {
            visibility.close();
        }
        mouseDownOnOverlay = false;
    }
    const showModal = () => {
        if (!component.element.isConnected) {
            component.structure.container.appendChild(component.element);
        }
        if (!component.element.isConnected || !showInTopLayer(component.element, { kind: "modal" })) {
            component.element.setAttribute("open", "");
        }
    };
    const dialogVisibleClass = `${component.getClass("dialog")}--visible`;
    const overlayVisibleClass = `${component.getClass("dialog__overlay")}--visible`;
    scopeScrim();
    if (isOpen) {
        component.element.inert = false;
        component.element.removeAttribute("aria-hidden");
        if (top)
            showModal();
        addClass(component.overlay, overlayVisibleClass);
        addClass(component.element, dialogVisibleClass);
        trapFocus();
        setupEvents();
    }
    const visibility = {
        open() {
            if (opened)
                return;
            previouslyFocusedElement = deepActiveElement();
            if (ask(DIALOG_EVENTS.BEFORE_OPEN))
                return;
            opened = true;
            component.element.inert = false;
            component.element.removeAttribute("aria-hidden");
            clearTimeout(afterCloseTimer);
            afterOpenWaiting = false;
            focusPending = false;
            if (top) {
                showModal();
                void component.element.offsetWidth;
                addClass(component.element, dialogVisibleClass);
                trapFocus();
                setupEvents();
                emit(DIALOG_EVENTS.OPEN);
                if (!opened)
                    return;
                afterOpenTimer = setTimeout(afterOpenDue, openDuration);
                return;
            }
            if (component.element.parentNode !== component.overlay) {
                component.overlay.appendChild(component.element);
            }
            if (component.overlay && !component.overlay.parentNode) {
                const container = component.structure.container || document.body;
                container.appendChild(component.overlay);
            }
            scopeScrim();
            setupEvents();
            emit(DIALOG_EVENTS.OPEN);
            if (!opened)
                return;
            showTimer = setTimeout(() => {
                addClass(component.overlay, overlayVisibleClass);
                addClass(component.element, dialogVisibleClass);
                trapFocus();
                if (typeof component.emit === "function") {
                    afterOpenTimer = setTimeout(afterOpenDue, openDuration);
                }
            }, 10);
        },
        close(forced) {
            if (!opened)
                return;
            if (!forced && ask(DIALOG_EVENTS.BEFORE_CLOSE))
                return;
            stopOpen();
            removeClass(component.element, dialogVisibleClass);
            removeClass(component.overlay, overlayVisibleClass);
            component.element.inert = true;
            component.element.setAttribute("aria-hidden", "true");
            if (top)
                hideFromTopLayer(component.element);
            releaseFocus();
            cleanupEvents();
            emit(DIALOG_EVENTS.CLOSE);
            if (opened)
                return;
            afterCloseTimer = setTimeout(() => {
                if (!top && component.overlay && component.overlay.parentNode) {
                    component.overlay.parentNode.removeChild(component.overlay);
                }
                unscopeScrim();
                emit(DIALOG_EVENTS.AFTER_CLOSE);
            }, closeDuration);
        },
        toggle(open = !opened) {
            open ? this.open() : this.close();
        },
        isOpen() {
            return opened;
        },
        cancel() {
            stopOpen();
            clearTimeout(afterCloseTimer);
            cleanupEvents();
            unscopeScrim();
        },
    };
    component.on("dialog:close", () => {
        visibility.close();
    });
    if (top) {
        onTopLayerClose(component.element, () => visibility.close(true));
    }
    return {
        ...component,
        visibility,
        focus: {
            trapFocus,
            releaseFocus,
        },
    };
};
export const withContent = () => (component) => {
    const headerElement = component.structure.header;
    const contentElement = component.structure.content;
    const footerElement = component.structure.footer;
    return {
        ...component,
        content: {
            setTitle(title) {
                let titleElement = headerElement.querySelector(`.${component.getClass("dialog__header-title")}`);
                if (!titleElement && title) {
                    titleElement = document.createElement("h2");
                    titleElement.classList.add(component.getClass("dialog__header-title"));
                    headerElement
                        .querySelector(`.${component.getClass("dialog__header-content")}`)
                        ?.appendChild(titleElement);
                }
                if (titleElement) {
                    titleElement.textContent = title;
                }
            },
            getTitle() {
                const titleElement = headerElement.querySelector(`.${component.getClass("dialog__header-title")}`);
                return titleElement?.textContent || "";
            },
            setSubtitle(subtitle) {
                let subtitleElement = headerElement.querySelector(`.${component.getClass("dialog__header-subtitle")}`);
                if (!subtitleElement && subtitle) {
                    subtitleElement = document.createElement("p");
                    subtitleElement.classList.add(component.getClass("dialog__header-subtitle"));
                    headerElement
                        .querySelector(`.${component.getClass("dialog__header-content")}`)
                        ?.appendChild(subtitleElement);
                }
                if (subtitleElement) {
                    subtitleElement.textContent = subtitle;
                }
            },
            getSubtitle() {
                const subtitleElement = headerElement.querySelector(`.${component.getClass("dialog__header-subtitle")}`);
                return subtitleElement?.textContent || "";
            },
            setContent(content) {
                setHTML(contentElement, content);
            },
            getContent() {
                return contentElement.innerHTML;
            },
            getHeaderElement() {
                return headerElement;
            },
            getContentElement() {
                return contentElement;
            },
            getFooterElement() {
                return footerElement;
            },
        },
    };
};
export const withButtons = (getComponent) => (component) => {
    if (!component._buttons) {
        component._buttons = [];
    }
    const buttonRecords = component._buttons;
    return {
        ...component,
        _buttons: buttonRecords,
        buttons: {
            addButton(button) {
                let footer = component.structure.footer;
                if (!footer) {
                    footer = document.createElement("div");
                    footer.classList.add(component.getClass("dialog__footer"));
                    const alignment = component.config.footerAlignment || "right";
                    if (alignment !== "right") {
                        addClass(footer, `${component.getClass("dialog__footer")}--${alignment}`);
                    }
                    component.element.appendChild(footer);
                    component.structure.footer = footer;
                }
                addButton(footer, button, component, getComponent);
            },
            removeButton(indexOrText) {
                const numeric = typeof indexOrText === "number";
                const index = numeric ? indexOrText : buttonRecords.findIndex((button) => button.config.text === indexOrText);
                if (numeric ? index >= 0 && index < buttonRecords.length : index !== -1) {
                    const button = buttonRecords[index];
                    button.instance.destroy();
                    buttonRecords.splice(index, 1);
                }
                if (buttonRecords.length === 0 && component.structure.footer) {
                    component.element.removeChild(component.structure.footer);
                    component.structure.footer = null;
                }
            },
            getButtons() {
                return buttonRecords.map((button) => button.config);
            },
            setFooterAlignment(alignment) {
                const footer = component.structure.footer;
                if (!footer)
                    return;
                const ALL_ALIGNMENTS = ["left", "center", "space-between"];
                ALL_ALIGNMENTS.forEach((align) => {
                    removeClass(footer, `${component.getClass("dialog__footer")}--${align}`);
                });
                if (alignment !== "right") {
                    addClass(footer, `${component.getClass("dialog__footer")}--${alignment}`);
                }
            },
        },
    };
};
export const withSize = () => (component) => {
    return {
        ...component,
        size: {
            setSize(size) {
                const ALL_SIZES = [
                    "small",
                    "medium",
                    "large",
                    "fullwidth",
                    "fullscreen",
                ];
                ALL_SIZES.forEach((sizeValue) => {
                    removeClass(component.element, `${component.getClass("dialog")}--${sizeValue}`);
                });
                if (size !== "medium") {
                    addClass(component.element, `${component.getClass("dialog")}--${size}`);
                }
            },
        },
    };
};
export const withConfirm = () => (component) => {
    return {
        ...component,
        confirm(options) {
            return new Promise((resolve) => {
                const { title = "Confirm", message, confirmText = "Yes", cancelText = "No", confirmVariant = "filled", cancelVariant = "text", size = "small", } = options;
                component.content.setTitle(title);
                const text = document.createElement("p");
                text.textContent = message;
                component.content.setContent(text.outerHTML);
                component.size.setSize(size);
                component._buttons.forEach((button) => button.instance.destroy());
                component._buttons = [];
                let settled = false;
                const settle = (answer) => {
                    if (settled)
                        return;
                    settled = true;
                    component.off("close", onClose);
                    resolve(answer);
                };
                const onClose = () => settle(false);
                component.on("close", onClose);
                component.buttons.addButton({
                    text: cancelText,
                    variant: cancelVariant,
                    onClick: () => settle(false),
                });
                component.buttons.addButton({
                    text: confirmText,
                    variant: confirmVariant,
                    onClick: () => settle(true),
                });
                component.visibility.open();
            });
        },
    };
};
