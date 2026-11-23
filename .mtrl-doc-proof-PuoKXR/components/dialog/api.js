import { removeClass } from "../../core/dom/classes.js";
import { hideFromTopLayer } from "../../core/dom/layer.js";
export const withAPI = (component) => {
    const options = component;
    return {
        ...component,
        open() {
            options.visibility.open();
            return this;
        },
        close() {
            options.visibility.close();
            return this;
        },
        toggle(open) {
            options.visibility.toggle(open);
            return this;
        },
        isOpen() {
            return options.visibility.isOpen();
        },
        setTitle(title) {
            options.content.setTitle(title);
            return this;
        },
        getTitle() {
            return options.content.getTitle();
        },
        setSubtitle(subtitle) {
            options.content.setSubtitle(subtitle);
            return this;
        },
        getSubtitle() {
            return options.content.getSubtitle();
        },
        setContent(content) {
            options.content.setContent(content);
            return this;
        },
        getContent() {
            return options.content.getContent();
        },
        addButton(button) {
            options.buttons.addButton(button);
            return this;
        },
        removeButton(indexOrText) {
            options.buttons.removeButton(indexOrText);
            return this;
        },
        getButtons() {
            return options.buttons.getButtons();
        },
        setFooterAlignment(alignment) {
            options.buttons.setFooterAlignment(alignment);
            return this;
        },
        toggleDivider(show) {
            options.divider.toggleDivider(show);
            return this;
        },
        hasDivider() {
            return options.divider.hasDivider();
        },
        setSize(size) {
            options.size.setSize(size);
            return this;
        },
        on(event, handler) {
            options.on(event, handler);
            return this;
        },
        off(event, handler) {
            options.off(event, handler);
            return this;
        },
        getHeaderElement() {
            return options.content.getHeaderElement();
        },
        getContentElement() {
            return options.content.getContentElement();
        },
        getFooterElement() {
            return options.content.getFooterElement();
        },
        confirm(options) {
            return component.confirm(options || { message: "Are you sure?" });
        },
        destroy() {
            const wasOpen = this.isOpen();
            options.visibility.cancel();
            if (wasOpen) {
                const dialogVisibleClass = `${component.getClass("dialog")}--visible`;
                const overlayVisibleClass = `${component.getClass("dialog__overlay")}--visible`;
                removeClass(component.element, dialogVisibleClass);
                removeClass(component.overlay, overlayVisibleClass);
                hideFromTopLayer(component.element);
                if (options.focus && options.focus.releaseFocus) {
                    options.focus.releaseFocus();
                }
            }
            options.lifecycle.destroy();
            if (component.overlay && component.overlay.parentNode) {
                component.overlay.parentNode.removeChild(component.overlay);
            }
            if (component.element.parentNode !== component.overlay) {
                component.element.remove();
            }
        },
        element: component.element,
        overlay: component.overlay,
    };
};
