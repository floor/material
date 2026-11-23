import { BaseComponent, ElementComponent } from "../component.js";
/** Text manager interface */
export interface TextManager {
    /**
 * Sets text content
 * @param text
 */
    /** Text, or a node placed inside the text element (the web components pass a `<slot>`). */
    setText: (text: string | Node) => TextManager;
    /** Gets current text content */
    getText: () => string;
    /** Gets text element */
    getElement: () => HTMLElement | null;
}
/** Configuration for text feature */
export interface TextConfig {
    /** Initial text content */
    /** Text, or a node placed inside the text element. */
    text?: string | Node;
    /** CSS class prefix */
    prefix?: string;
    /** Component name for class generation */
    componentName?: string;
    /** Element to insert text before (optional) */
    beforeElement?: HTMLElement;
}
/** Component with text capabilities */
export interface TextComponent extends BaseComponent {
    /** Text manager */
    text: TextManager;
}
/**
 * Adds text management to a component
 * @param config
 */
export declare const withText: <T extends TextConfig & object>(config: T) => <C extends ElementComponent>(component: C) => C & TextComponent;
