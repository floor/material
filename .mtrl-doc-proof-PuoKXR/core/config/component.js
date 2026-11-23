import { PREFIX } from "../config.js";
import { getComponentDefaults } from "./global.js";
export const createComponentConfig = (defaults, userConfig = {}, componentName) => {
    const globalDefaults = getComponentDefaults(componentName);
    const userClassName = userConfig.className !== undefined
        ? userConfig.className
        : userConfig.class;
    const defaultClassName = defaults.className !== undefined ? defaults.className : defaults.class;
    const config = {
        ...defaults,
        ...globalDefaults,
        ...userConfig,
        componentName,
        prefix: PREFIX,
        className: userClassName !== undefined ? userClassName : defaultClassName,
    };
    if ("class" in config && config.className !== undefined) {
        delete config.class;
    }
    return config;
};
export const processClassNames = (classNames) => {
    if (!classNames)
        return "";
    if (typeof classNames === "string")
        return classNames;
    return classNames
        .filter(Boolean)
        .join(" ");
};
export const createElementConfig = (config, options) => {
    const configClasses = config.className || config.class;
    const optionsClasses = options.className;
    const combinedClassNames = [
        ...(Array.isArray(configClasses) ? configClasses : [configClasses]),
        ...(Array.isArray(optionsClasses) ? optionsClasses : [optionsClasses]),
    ].filter((name) => Boolean(name));
    const elementAttributes = options.attributes || {};
    return {
        tag: options.tag,
        componentName: config.componentName,
        attributes: elementAttributes,
        className: combinedClassNames.length > 0 ? combinedClassNames : undefined,
        id: config.id,
        name: config.name,
        title: config.title,
        tabIndex: config.tabIndex,
        style: options.style || config.style
            ? { ...options.style, ...config.style }
            : undefined,
        data: config.data,
        role: config.role,
        ariaLabel: config.ariaLabel,
        ariaDescribedBy: config.ariaDescribedBy,
        ariaLabelledBy: config.ariaLabelledBy,
        ariaHidden: config.ariaHidden,
        html: options.html,
        text: options.text,
        forwardEvents: options.forwardEvents || {},
        interactive: options.interactive,
    };
};
