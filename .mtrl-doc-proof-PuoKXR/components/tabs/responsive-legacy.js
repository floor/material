export const RESPONSIVE_BREAKPOINTS = {
    SMALL: 600,
    MEDIUM: 904,
    LARGE: 1240
};
const LAYOUTS = ['icon-only', 'text-only', 'icon-and-text'];
const naturalLayout = (tab) => tab.getIcon() && tab.getText() ? 'icon-and-text' : tab.getIcon() ? 'icon-only' : 'text-only';
export const setupResponsiveBehavior = (tabs, config = {}) => {
    if (config.responsive === false)
        return;
    const small = config.breakpoints?.small || RESPONSIVE_BREAKPOINTS.SMALL;
    const smallLayout = config.smallScreen?.layout || 'icon-only';
    let isSmall = false;
    const layoutFor = (tab) => {
        const natural = naturalLayout(tab);
        if (!isSmall || natural !== 'icon-and-text' || smallLayout === 'icon-and-text')
            return natural;
        return smallLayout;
    };
    const apply = (tab) => {
        const layout = layoutFor(tab);
        for (const name of LAYOUTS) {
            tab.element.classList.toggle(`${tab.getClass('tab')}--${name}`, name === layout);
        }
    };
    const followed = new WeakSet();
    const follow = (tab) => {
        if (followed.has(tab))
            return;
        followed.add(tab);
        const own = tab.updateLayoutStyle.bind(tab);
        tab.updateLayoutStyle = () => {
            own();
            apply(tab);
        };
    };
    const updateLayout = () => {
        isSmall = window.innerWidth < small;
        tabs.getTabs().forEach(tab => {
            follow(tab);
            apply(tab);
        });
        tabs.element.classList.toggle(`${tabs.getClass('tabs')}--responsive-small`, isSmall);
    };
    updateLayout();
    for (const method of ['addTab', 'add']) {
        const original = tabs[method];
        tabs[method] = (...args) => {
            const result = original.apply(tabs, args);
            updateLayout();
            return result;
        };
    }
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(document.body);
    const host = tabs;
    host._resizeObserver = resizeObserver;
    const originalDestroy = tabs.destroy;
    tabs.destroy = function () {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
        originalDestroy.call(this);
    };
};
