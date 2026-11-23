import { addClass } from "../../core/index.js";
export const withAPI = ({ state, items, headline, lifecycle }) => (component) => {
    const drawerComponent = {
        element: component.element,
        getClass: component.getClass,
        lifecycle,
        on(event, handler) {
            if (component.on) {
                component.on(event, handler);
            }
            return drawerComponent;
        },
        off(event, handler) {
            if (component.off) {
                component.off(event, handler);
            }
            return drawerComponent;
        },
        addClass(...classes) {
            if (component.addClass) {
                component.addClass(...classes);
            }
            else {
                addClass(component.element, ...classes);
            }
            return drawerComponent;
        },
        open() {
            state.open();
            return drawerComponent;
        },
        close() {
            state.close();
            return drawerComponent;
        },
        toggle() {
            state.toggle();
            return drawerComponent;
        },
        isOpen() {
            return state.isOpen();
        },
        setActive(id) {
            items.setActive(id);
            return drawerComponent;
        },
        getValue() {
            return items.getActive();
        },
        getActive() {
            return items.getActive();
        },
        setItems(newItems) {
            items.setItems(newItems);
            return drawerComponent;
        },
        getItems() {
            return (items.getItems() || []);
        },
        setBadge(id, badge) {
            items.setBadge(id, badge);
            return drawerComponent;
        },
        expandSection(id) {
            items.expandSection(id);
            return drawerComponent;
        },
        collapseSection(id) {
            items.collapseSection(id);
            return drawerComponent;
        },
        toggleSection(id) {
            items.toggleSection(id);
            return drawerComponent;
        },
        isSectionExpanded: items.isSectionExpanded,
        getExpandedSections: items.getExpandedSections,
        setHeadline(text) {
            headline.setHeadline(text);
            return drawerComponent;
        },
        getHeadline() {
            return headline.getHeadline();
        },
        destroy() {
            lifecycle.destroy();
        },
    };
    return drawerComponent;
};
