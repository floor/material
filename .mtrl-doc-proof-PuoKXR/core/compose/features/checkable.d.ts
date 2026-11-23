import { BaseComponent } from "../component.js";
/** Configuration for checkable feature */
export interface CheckableConfig {
    checked?: boolean;
}
/** Component with input element */
export interface InputComponent extends BaseComponent {
    element: HTMLElement;
    input: HTMLInputElement;
    emit?: (event: string, data: unknown) => unknown;
    /** This feature only subscribes to change and does not read its payload. */
    on?: (event: "change", handler: () => void) => unknown;
}
/** Checkable state manager interface */
export interface CheckableManager {
    /** Sets the checked state to true. */
    check: () => CheckableManager;
    /** Sets the checked state to false. */
    uncheck: () => CheckableManager;
    /** Toggles the current checked state. */
    toggle: () => CheckableManager;
    /** Gets the current checked state */
    isChecked: () => boolean;
}
/** Component with checkable capabilities */
export interface CheckableComponent extends BaseComponent {
    checkable: CheckableManager;
}
/**
 * Adds checked state management to a component with an input
 * @param config
 */
export declare const withCheckable: <T extends CheckableConfig & object>(config?: T) => <C extends InputComponent>(component: C) => C & CheckableComponent;
