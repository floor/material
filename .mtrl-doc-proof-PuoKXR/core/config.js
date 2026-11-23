export const PREFIX = 'mtrl';
export const getComponentClass = (type) => `${PREFIX}-${type}`;
export const getModifierClass = (baseClass, modifier) => `${baseClass}--${modifier}`;
export const getElementClass = (baseClass, element) => `${baseClass}__${element}`;
export const classNames = {
    bem: (block, element, modifier) => {
        let className = block;
        if (element)
            className += `-${element}`;
        if (modifier)
            className += `--${modifier}`;
        return className;
    },
    join: (...classes) => classes.filter(Boolean).join(' ')
};
