/** Library prefix used for all components */
export declare const PREFIX = "mtrl";
/**
 * Gets a prefixed component class name
 * @param type
 */
export declare const getComponentClass: (type: string) => string;
/**
 * Gets a BEM modifier class name
 * @param baseClass
 * @param modifier
 */
export declare const getModifierClass: (baseClass: string, modifier: string) => string;
/**
 * Gets a BEM element class name
 * @param baseClass
 * @param element
 */
export declare const getElementClass: (baseClass: string, element: string) => string;
/** Theme configuration interface */
export interface ThemeConfig {
    /** Theme name */
    name: string;
    /** Theme CSS variables */
    variables: Record<string, string>;
    /** Theme variants */
    variants: Record<string, unknown>;
}
/** Component configuration interface */
export interface ComponentConfig {
    prefix: string;
    type: string;
    baseClass: string;
    getClass: () => string;
    getModifierClass: (modifier: string) => string;
    getElementClass: (element: string) => string;
    withTheme: (theme: string) => ThemedComponentConfig;
    withVariants: (...variants: string[]) => VariantComponentConfig;
    withStates: (...states: string[]) => StateComponentConfig;
}
/** Themed component configuration interface */
export interface ThemedComponentConfig extends ComponentConfig {
    theme: string;
    getThemeClass: (variant: string) => string;
    getCssVariables: () => Record<string, string>;
}
/** Variant component configuration interface */
export interface VariantComponentConfig extends ComponentConfig {
    variants: string[];
    hasVariant: (variant: string) => boolean;
    getVariantClass: (variant: string) => string | null;
}
/** State component configuration interface */
export interface StateComponentConfig extends ComponentConfig {
    states: string[];
    getStateClass: (state: string) => string | null;
}
/** CSS class generation utilities */
export declare const classNames: {
    /**
 * Creates a BEM-style class name
 * @param block
 * @param element
 * @param modifier
 */
    bem: (block: string, element?: string, modifier?: string) => string;
    /**
 * Joins class names, filtering out falsy values
 * @param classes
 */
    join: (...classes: (string | undefined | null | false)[]) => string;
};
