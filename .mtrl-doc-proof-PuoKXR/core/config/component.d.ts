import type { EventCondition } from "../dom/create.js";
type StyleDeclaration = {
    -readonly [K in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[K];
};
/** Base component configuration interface */
export interface BaseComponentConfig {
    componentName?: string;
    class?: string | string[];
    className?: string | string[];
    parent?: HTMLElement | string | null;
    id?: string;
    name?: string;
    title?: string;
    tabIndex?: number;
    style?: Partial<CSSStyleDeclaration>;
    data?: Record<string, string>;
    role?: string;
    ariaLabel?: string;
    ariaDescribedBy?: string;
    ariaLabelledBy?: string;
    ariaHidden?: boolean;
}
/**
 * Creates a base configuration for any component
 * @param defaults
 * @param userConfig
 * @param componentName
 */
export declare const createComponentConfig: <T extends BaseComponentConfig & object>(defaults: T, userConfig: Partial<T> | undefined, componentName: string) => T & {
    componentName: string;
    prefix: string;
};
/**
 * Processes class names for an element, handling arrays, nulls and conditional classes
 * @param classNames
 */
export declare const processClassNames: (classNames: string | string[] | null) => string;
/**
 * Creates a configuration object for withElement HOC
 * @param config
 * @param options
 */
export declare const createElementConfig: (config: BaseComponentConfig, options: {
    tag: string;
    attributes?: Record<string, unknown>;
    className?: string | (string | null | undefined)[] | null;
    /** Styles the component computes for itself, as properties. */
    style?: Partial<CSSStyleDeclaration>;
    html?: string;
    text?: string;
    forwardEvents?: Record<string, EventCondition>;
    interactive?: boolean;
}) => {
    tag: string;
    componentName: string | undefined;
    attributes: Record<string, unknown>;
    className: string[] | undefined;
    id: string | undefined;
    name: string | undefined;
    title: string | undefined;
    tabIndex: number | undefined;
    style: StyleDeclaration | undefined;
    data: Record<string, string> | undefined;
    role: string | undefined;
    ariaLabel: string | undefined;
    ariaDescribedBy: string | undefined;
    ariaLabelledBy: string | undefined;
    ariaHidden: boolean | undefined;
    html: string | undefined;
    text: string | undefined;
    forwardEvents: Record<string, EventCondition>;
    interactive: boolean | undefined;
};
export {};
