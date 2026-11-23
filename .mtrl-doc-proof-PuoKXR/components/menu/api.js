const withAPI = ({ menu, opener, events, lifecycle }) => (component) => {
    const menuComponent = {
        element: component.element,
        open(event, interactionType) {
            menu.open(event, interactionType);
            return this;
        },
        close(event, restoreFocus = true, skipAnimation = false) {
            menu.close(event, restoreFocus, skipAnimation);
            return this;
        },
        toggle(event, interactionType) {
            if (event && !interactionType) {
                if (event instanceof KeyboardEvent) {
                    interactionType = "keyboard";
                }
                else if (event instanceof MouseEvent) {
                    interactionType = "mouse";
                }
            }
            menu.toggle(event, interactionType);
            return this;
        },
        isOpen() {
            return menu.isOpen();
        },
        setItems(items) {
            menu.setItems(items);
            return this;
        },
        getItems() {
            return menu.getItems();
        },
        setOpener(openerElement) {
            opener.setOpener(openerElement);
            return this;
        },
        getOpener() {
            return opener.getOpener();
        },
        setPosition(position) {
            menu.setPosition(position);
            return this;
        },
        getPosition() {
            return menu.getPosition();
        },
        setSelected(itemId) {
            menu.setSelected(itemId);
            return this;
        },
        getSelected() {
            return menu.getSelected();
        },
        on(event, handler) {
            if (events?.on) {
                events.on(event, handler);
            }
            else if (component.on) {
                component.on(event, handler);
            }
            return this;
        },
        off(event, handler) {
            if (events?.off) {
                events.off(event, handler);
            }
            else if (component.off) {
                component.off(event, handler);
            }
            return this;
        },
        destroy() {
            lifecycle.destroy();
        },
    };
    return menuComponent;
};
export { withAPI };
