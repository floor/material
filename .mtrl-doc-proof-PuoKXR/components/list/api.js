export const withAPI = ({ list, selection, events, lifecycle, config }) => (component) => {
    const api = {
        ...component,
        element: component.element,
        async refresh() {
            list.refresh();
            return this;
        },
        getAllItems: () => list.getAllItems(),
        getVisibleItems: () => list.getVisibleItems(),
        scrollToItem(itemId, position, animate) {
            const shouldAnimate = animate !== undefined ? animate : config?.animate || false;
            list.scrollToItem(itemId, position, shouldAnimate);
            return this;
        },
        async scrollToIndex(index, position, animate) {
            const shouldAnimate = animate !== undefined ? animate : config?.animate || false;
            list.scrollToIndex(index, position, shouldAnimate);
            return this;
        },
        isLoading: () => list.isLoading(),
        hasNextPage: () => list.hasNextPage(),
        getSelectedItems: () => selection.getSelectedItems(),
        getSelectedItemIds: () => selection.getSelectedItemIds(),
        isItemSelected: (itemId) => selection.isItemSelected(itemId),
        selectItem(itemId) {
            selection.selectItem(itemId);
            return this;
        },
        deselectItem(itemId) {
            selection.deselectItem(itemId);
            return this;
        },
        clearSelection() {
            selection.clearSelection();
            return this;
        },
        setSelection(itemIds) {
            selection.setSelection(itemIds);
            return this;
        },
        on(event, handler) {
            events.on(event, handler);
            return this;
        },
        off(event, handler) {
            events.off(event, handler);
            return this;
        },
        destroy: () => {
            lifecycle.destroy();
        },
    };
    if (component.eventTarget)
        component.eventTarget.current = api;
    return api;
};
export default withAPI;
