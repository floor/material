import { BaseComponent, ElementComponent } from "../component.js";
/** Configuration for text label feature */
export interface TextLabelConfig {
    /** Label text */
    /** The label: text, or a node placed inside the label element (the web components pass a `<slot>` so the page's content is the label). */
    label?: string | Node;
    /** Label position ('start' or 'end') */
    labelPosition?: "start" | "end";
    /** CSS class prefix */
    prefix?: string;
    /** Component name for class generation */
    componentName?: string;
}
/** Label manager interface */
export interface LabelManager {
    /**
 * Sets the label text
 * @param text
 */
    setText: (text: string) => LabelManager;
    /** Gets the current label text */
    getText: () => string;
    /** Gets the label element */
    getElement: () => HTMLElement;
}
/** Component with label capabilities */
export interface LabelComponent extends BaseComponent {
    label: LabelManager;
}
/**
 * Adds a text label to a component
 * @param config
 */
export declare const withTextLabel: <T extends TextLabelConfig & object>(config?: T) => <C extends ElementComponent>(component: C) => C & LabelComponent;
