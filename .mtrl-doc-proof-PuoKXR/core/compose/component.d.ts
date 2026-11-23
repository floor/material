import { type CleanupScope } from "./cleanup.js";
import { EventCondition } from "../dom/create.js";
/** Touch state interface to track touch interactions */
export interface TouchState {
    startTime: number;
    startPosition: {
        x: number;
        y: number;
    };
    isTouching: boolean;
    activeTarget: EventTarget | null;
}
/** Config keys the base component and withElement read */
export interface BaseConfig {
    componentName?: string;
    prefix?: string;
    parent?: HTMLElement | string | null;
}
/** Base component interface with prefix utilities */
export interface BaseComponent {
    resources?: CleanupScope;
    config: BaseConfig & Record<string, unknown>;
    componentName?: string;
    getClass: (name: string) => string;
    getModifierClass: (base: string, modifier: string) => string;
    getElementClass: (base: string, element: string) => string;
    touchState: TouchState;
    updateTouchState: (event: Event, status: "start" | "end") => void;
}
/** Element component extends base with element */
export interface ElementComponent extends BaseComponent {
    element: HTMLElement;
    addClass(...classes: string[]): this;
    destroy: () => void;
}
/** Options for withElement enhancer */
export interface WithElementOptions {
    tag?: string;
    componentName?: string;
    attributes?: Record<string, unknown>;
    className?: string | string[];
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
    forwardEvents?: Record<string, EventCondition>;
    interactive?: boolean;
    parent?: HTMLElement | string;
}
/**
 * Creates a base component with configuration and prefix utilities.
 * @param config
 */
export declare const createBase: <T extends BaseConfig & object = BaseConfig & object>(config?: T) => BaseComponent & {
    config: T;
};
/**
 * Higher-order function that adds a DOM element to a component
 * @param options
 */
export declare const withElement: (options?: WithElementOptions) => <T extends BaseComponent>(component: T) => T & ElementComponent;
