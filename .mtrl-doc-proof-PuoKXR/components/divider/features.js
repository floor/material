const ORIENTATIONS = ['horizontal', 'vertical'];
const VARIANTS = ['full-width', 'inset', 'middle-inset'];
const DEFAULT_INSET = 16;
const applyLayout = (component, config) => {
    const { element } = component;
    const base = component.getClass('divider');
    const orientation = config.orientation || 'horizontal';
    const variant = config.variant || 'full-width';
    const thickness = config.thickness || 1;
    const horizontal = orientation === 'horizontal';
    ORIENTATIONS.forEach(name => element.classList.toggle(`${base}--${name}`, name === orientation));
    VARIANTS.forEach(name => element.classList.toggle(`${base}--${name}`, name === variant));
    if (horizontal)
        element.removeAttribute('aria-orientation');
    else
        element.setAttribute('aria-orientation', 'vertical');
    const style = element.style;
    style.marginLeft = style.marginRight = style.marginTop = style.marginBottom = '';
    style.marginInlineStart = style.marginInlineEnd = style.marginBlockStart = style.marginBlockEnd = '';
    const cross = horizontal ? 'height' : 'width';
    const main = horizontal ? 'width' : 'height';
    style[cross] = `${thickness}px`;
    style[main] = '100%';
    const explicit = config.insetStart !== undefined || config.insetEnd !== undefined;
    if (variant !== 'full-width' || explicit) {
        const insetStart = config.insetStart !== undefined
            ? config.insetStart
            : (variant === 'full-width' ? 0 : DEFAULT_INSET);
        const insetEnd = config.insetEnd !== undefined
            ? config.insetEnd
            : (variant === 'middle-inset' ? DEFAULT_INSET : 0);
        style[horizontal ? 'marginInlineStart' : 'marginBlockStart'] = `${insetStart}px`;
        style[horizontal ? 'marginInlineEnd' : 'marginBlockEnd'] = `${insetEnd}px`;
        style[main] = `calc(100% - ${insetStart + insetEnd}px)`;
    }
};
export const withOrientation = (config) => (component) => {
    applyLayout(component, config);
    return {
        ...component,
        getOrientation() {
            return config.orientation || 'horizontal';
        },
        setOrientation(newOrientation) {
            config.orientation = newOrientation;
            applyLayout(component, config);
            return this;
        }
    };
};
export const withInset = (config) => (component) => ({
    ...component,
    getVariant() {
        return config.variant || 'full-width';
    },
    setVariant(newVariant) {
        config.variant = newVariant;
        applyLayout(component, config);
        return this;
    },
    setInset(insetStart, insetEnd) {
        if (insetStart !== undefined)
            config.insetStart = insetStart;
        if (insetEnd !== undefined)
            config.insetEnd = insetEnd;
        applyLayout(component, config);
        return this;
    }
});
export const withStyle = (config) => (component) => {
    if (config.color) {
        component.element.style.backgroundColor = config.color;
    }
    return {
        ...component,
        setThickness(newThickness) {
            config.thickness = newThickness;
            applyLayout(component, config);
            return this;
        },
        setColor(color) {
            component.element.style.backgroundColor = color;
            return this;
        }
    };
};
