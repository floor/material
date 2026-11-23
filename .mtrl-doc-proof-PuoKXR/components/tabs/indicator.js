const DEFAULT_CONFIG = {
    widthStrategy: 'auto',
    fixedWidth: 40,
    visible: true,
    prefix: 'mtrl',
    variant: 'primary',
};
const PRIMARY_HEIGHT = 3;
const SECONDARY_HEIGHT = 2;
const PRIMARY_INSET = 2;
const MIN_LENGTH = 24;
export const createTabIndicator = (config = {}) => {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const prefix = mergedConfig.prefix || 'mtrl';
    const element = document.createElement('div');
    element.className = `${prefix}-tabs__indicator`;
    const anchorSupport = () => {
        const host = (element.ownerDocument.defaultView ?? globalThis);
        const supports = host.CSS?.supports;
        return typeof supports === 'function' ? supports('anchor-name', 'none') : null;
    };
    const anchor = anchorSupport();
    const strategy = mergedConfig.widthStrategy ?? 'auto';
    const custom = mergedConfig.animationDuration !== undefined || mergedConfig.animationTiming !== undefined;
    const motion = (property) => `${property} ${mergedConfig.animationDuration ?? 250}ms ${mergedConfig.animationTiming ?? 'cubic-bezier(0.4, 0, 0.2, 1)'}`;
    const transition = custom ? `${motion(anchor === false ? 'transform' : 'left')}, ${motion('width')}` : '';
    element.style.transition = transition;
    element.style.height = `${mergedConfig.height ?? (mergedConfig.variant === 'secondary' ? SECONDARY_HEIGHT : PRIMARY_HEIGHT)}px`;
    if (anchor === false)
        element.style.width = `${mergedConfig.fixedWidth}px`;
    if (strategy !== 'auto')
        element.classList.add(`${prefix}-tabs__indicator--${strategy}`);
    if (strategy === 'fixed' || strategy === 'content') {
        element.style.setProperty(`--${prefix}-tabs-indicator-width`, `${mergedConfig.fixedWidth || 40}px`);
    }
    if (mergedConfig.visible === false) {
        element.style.opacity = '0';
    }
    if (mergedConfig.color) {
        element.style.backgroundColor = mergedConfig.color;
    }
    let currentTab = null;
    const calculateWidth = (tab) => {
        if (mergedConfig.widthStrategy === 'auto') {
            if (mergedConfig.variant === 'secondary') {
                return tab.element.offsetWidth;
            }
            const textElement = tab.element.querySelector(`.${prefix}-button__text`);
            if (textElement) {
                return Math.max(textElement.getBoundingClientRect().width - 2 * PRIMARY_INSET, MIN_LENGTH);
            }
            return Math.max(tab.element.offsetWidth / 2, 30);
        }
        switch (mergedConfig.widthStrategy) {
            case 'dynamic':
                return Math.max(tab.element.offsetWidth / 2, 30);
            case 'content':
                const text = tab.element.querySelector(`.${prefix}-button__text`);
                if (text) {
                    return Math.max(text.clientWidth, 30);
                }
                return mergedConfig.fixedWidth || 40;
            case 'fixed':
            default:
                return mergedConfig.fixedWidth || 40;
        }
    };
    const getTabPosition = (tabElement) => {
        const scrollContainer = tabElement.parentElement;
        if (!scrollContainer) {
            console.error('Tab has no parent element, cannot position indicator');
            return { left: 0, width: tabElement.offsetWidth };
        }
        const tabRect = tabElement.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        return {
            left: tabRect.left - containerRect.left,
            width: tabRect.width
        };
    };
    const calculatePosition = (tab, indicatorWidth) => {
        const { left, width: tabWidth } = getTabPosition(tab.element);
        if (mergedConfig.variant !== 'secondary' &&
            (mergedConfig.widthStrategy === 'auto' || mergedConfig.widthStrategy === 'content')) {
            const textElement = tab.element.querySelector(`.${prefix}-button__text`);
            if (textElement) {
                const textRect = textElement.getBoundingClientRect();
                const tabRect = tab.element.getBoundingClientRect();
                const textLeft = textRect.left - tabRect.left;
                return {
                    left: left + textLeft + (textRect.width - indicatorWidth) / 2
                };
            }
        }
        if (indicatorWidth < tabWidth) {
            return {
                left: left + ((tabWidth - indicatorWidth) / 2)
            };
        }
        return { left };
    };
    const moveToTab = (tab, immediate = false) => {
        if (!tab || !tab.element) {
            console.error('Invalid tab or tab has no element');
            return;
        }
        currentTab = tab;
        if (anchor !== false) {
            if (anchor === true && immediate) {
                element.style.transition = 'none';
                void element.offsetHeight;
                element.style.transition = transition;
            }
            return;
        }
        const width = calculateWidth(tab);
        const { left } = calculatePosition(tab, width);
        if (immediate) {
            element.style.transition = 'none';
            element.offsetHeight;
        }
        element.style.width = `${width}px`;
        element.style.transform = `translateX(${left}px)`;
        if (immediate) {
            setTimeout(() => {
                element.style.transition = transition;
            }, 10);
        }
    };
    const update = () => {
        if (currentTab) {
            moveToTab(currentTab, true);
        }
    };
    const show = () => {
        element.style.opacity = '1';
    };
    const hide = () => {
        element.style.opacity = '0';
    };
    const setColor = (color) => {
        element.style.backgroundColor = color;
    };
    const destroy = () => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
        currentTab = null;
    };
    return {
        element,
        moveToTab,
        show,
        hide,
        setColor,
        update,
        destroy
    };
};
