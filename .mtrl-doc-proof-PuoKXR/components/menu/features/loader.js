export const hasNestedItems = (items) => !!items?.some((item) => "hasSubmenu" in item && item.hasSubmenu === true);
export const createSubmenuLoader = (config, component) => {
    let feature = null;
    let loading = false;
    let destroyed = false;
    let queue = [];
    const lifecycle = { destroy: () => { } };
    const load = () => {
        if (feature || loading || destroyed)
            return;
        loading = true;
        import("./submenu.js").then(({ default: withSubmenu }) => {
            loading = false;
            if (destroyed)
                return;
            const submenu = withSubmenu(config)({ ...component, lifecycle }).submenu;
            feature = submenu;
            const waiting = queue;
            queue = [];
            waiting.forEach((action) => action(submenu));
        }, (error) => {
            loading = false;
            queue = [];
            console.error("Menu submenu feature failed to load:", error);
        });
    };
    const interact = (action, itemElement) => {
        if (feature) {
            action(feature);
            return;
        }
        if (destroyed)
            return;
        queue.push((submenu) => {
            if (!itemElement || itemElement.isConnected)
                action(submenu);
        });
        load();
    };
    const close = (action) => {
        if (feature)
            action(feature);
        else
            queue = [];
    };
    const api = {
        handleSubmenuClick: (item, index, itemElement) => interact((s) => s.handleSubmenuClick(item, index, itemElement), itemElement),
        handleNestedSubmenuClick: (item, index, itemElement) => interact((s) => s.handleNestedSubmenuClick(item, index, itemElement), itemElement),
        handleSubmenuHover: (item, index, itemElement) => interact((s) => s.handleSubmenuHover(item, index, itemElement), itemElement),
        handleSubmenuLeave: () => interact((s) => s.handleSubmenuLeave()),
        closeSubmenu: (level) => close((s) => s.closeSubmenu(level)),
        closeAllSubmenus: () => close((s) => s.closeAllSubmenus()),
        hasOpenSubmenu: () => feature?.hasOpenSubmenu() ?? false,
        getActiveSubmenus: () => feature?.getActiveSubmenus() ?? [],
    };
    const destroy = () => {
        if (destroyed)
            return;
        destroyed = true;
        queue = [];
        lifecycle.destroy();
    };
    return { api, load, destroy };
};
