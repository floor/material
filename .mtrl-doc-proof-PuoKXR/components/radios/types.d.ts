/** Configuration for a radio option in the Radios component */
export interface RadioOptionConfig {
    /** Radio input value attribute */
    value: string;
    /** Radio label text content */
    label: string;
    /**
 * Whether the radio is initially disabled
 * @default false
 */
    disabled?: boolean;
    /**
 * Whether to position the label before the radio
 * @default false
 */
    labelBefore?: boolean;
}
/** Configuration interface for the Radios component */
export interface RadiosConfig {
    /** Radio input name attribute used for grouping radios */
    name: string;
    /** Array of radio option configurations */
    options?: RadioOptionConfig[];
    /** Initial selected value */
    value?: string;
    /**
 * Layout direction for radio buttons
 * @default 'vertical'
 */
    direction?: 'vertical' | 'horizontal';
    /**
 * Whether the entire group is initially disabled
 * @default false
 */
    disabled?: boolean;
    /** A selection is required before submit. */
    required?: boolean;
    /**
 * Whether to enable ripple effect
 * @default true
 */
    ripple?: boolean;
    /** Additional CSS classes to add to the radios component */
    class?: string;
    /**
 * Component prefix for class names
 * @default 'mtrl'
 */
    prefix?: string;
    /** Component name used in class generation */
    componentName?: string;
}
/** Interface for a single radio in the Radios component */
export interface RadioItem {
    /** The radio container element */
    element: HTMLElement;
    /** The actual radio input element */
    input: HTMLInputElement;
    /** The label element */
    label: HTMLLabelElement;
    /** The radio option configuration */
    config: RadioOptionConfig;
    /** Destroys the radio and removes event listeners */
    destroy: () => void;
}
/** Selection or unknown-value clearing reported by the radio group. */
export interface RadiosChangePayload {
    /** Selected value, or null when nothing is selected: the value `getValue()` reads. */
    value: string | null;
    /** Native input change event; undefined for programmatic clearing. */
    originalEvent: Event | undefined;
    /** Selected option, or null when an unknown value clears selection. */
    option: RadioOptionConfig | null;
}
/** Group emitter events. */
export interface RadiosEvents {
    change: (payload: RadiosChangePayload) => void;
}
/** Radios component interface */
export interface RadiosComponent {
    /** The radios container DOM element */
    element: HTMLElement;
    /** Array of radio items in the group */
    radios: RadioItem[];
    /** API for managing component lifecycle */
    lifecycle: {
        /** Destroys the component and cleans up resources */
        destroy: () => void;
    };
    /**
 * Gets a class name with the component's prefix
 * @param name
 */
    getClass: (name: string) => string;
    /** Gets the selected value */
    getValue: () => string | null;
    /**
 * Sets the radios component value (selects a radio).
 * @param value
 */
    setValue: (value: string | null) => RadiosComponent;
    /** Gets the selected radio option's configuration */
    getSelected: () => RadioOptionConfig | null;
    /**
 * Adds a radio option to the radios component
 * @param option
 */
    addOption: (option: RadioOptionConfig) => RadiosComponent;
    /**
 * Removes a radio option from the radios component
 * @param value
 */
    removeOption: (value: string) => RadiosComponent;
    /** Enables the radios component */
    enable: () => RadiosComponent;
    /** Disables the radios component */
    disable: () => RadiosComponent;
    /** Whether the whole group is disabled */
    isDisabled: () => boolean;
    /**
 * Enables a specific radio option
 * @param value
 */
    enableOption: (value: string) => RadiosComponent;
    /**
 * Disables a specific radio option
 * @param value
 */
    disableOption: (value: string) => RadiosComponent;
    /** Destroys the radios component and all radio items */
    destroy: () => void;
    /**
 * Adds an event listener to the radios component
 * @param event
 * @param handler
 */
    on: <K extends keyof RadiosEvents>(event: K, handler: RadiosEvents[K]) => RadiosComponent;
    /**
 * Removes an event listener from the radios component
 * @param event
 * @param handler
 */
    off: <K extends keyof RadiosEvents>(event: K, handler: RadiosEvents[K]) => RadiosComponent;
}
