import { BaseComponent, ElementComponent } from "../component.js";
/** Configuration for disabled feature */
export interface DisabledConfig {
    disabled?: boolean;
    componentName?: string;
}
/** Disabled state manager interface */
export interface DisabledManager {
    /** Enables the component */
    enable(): DisabledManager;
    /** Disables the component */
    disable(): DisabledManager;
    /** Toggles the disabled state */
    toggle(): DisabledManager;
    /** Checks if the component is disabled */
    isDisabled(): boolean;
}
/** Component with disabled state capabilities */
export interface DisabledComponent extends BaseComponent {
    disabled: DisabledManager;
}
/**
 * Adds disabled state management to a component
 * @param config
 */
export declare const withDisabled: <T extends DisabledConfig & object>(config: T) => <C extends ElementComponent>(component: C) => C & DisabledComponent;
