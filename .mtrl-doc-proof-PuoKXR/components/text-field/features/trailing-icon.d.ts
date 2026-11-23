import { BaseComponent, ElementComponent } from "../../../core/compose/component.js";
/** Extended element component with input field */
interface InputElementComponent extends ElementComponent {
    input?: HTMLInputElement | HTMLTextAreaElement;
    emit?: (event: string, data?: unknown) => void;
    lifecycle?: {
        destroy: () => void;
    };
}
/** What an interactive trailing icon's `trailing` event carries */
export interface TextFieldTrailingPayload {
    /** The field's value when the icon was activated */
    value: string;
    /** The click (Enter and Space reach a button as one) */
    event: MouseEvent;
}
/** Configuration for trailing icon feature */
export interface TrailingIconConfig {
    /** Trailing icon HTML content */
    trailingIcon?: string;
    /** Makes the trailing icon a button with this accessible name: clear, show password, open a menu. */
    trailingIconLabel?: string;
    /** `trailing` listener. */
    onTrailingClick?: (event: TextFieldTrailingPayload) => void;
    /** Whether the field starts disabled; the trailing button is disabled with it */
    disabled?: boolean;
    /** CSS class prefix */
    prefix?: string;
    /** Component name */
    componentName?: string;
}
/** Component with trailing icon capabilities */
/** What this feature installs. */
export interface TrailingIconFeature {
    /** Trailing icon element */
    trailingIcon: HTMLElement | null;
    /**
 * Sets trailing icon content
 * @param html
 * @param label
 */
    setTrailingIcon: (html: string, label?: string) => TrailingIconComponent;
    /** Removes trailing icon */
    removeTrailingIcon: () => TrailingIconComponent;
}
/** Component with trailingicon capabilities */
export interface TrailingIconComponent extends BaseComponent, TrailingIconFeature {
}
/**
 * Adds trailing icon to a text field component
 * @param config
 */
export declare const withTrailingIcon: <T extends TrailingIconConfig & object>(config: T) => <C extends InputElementComponent>(component: C) => C & TrailingIconFeature;
export {};
