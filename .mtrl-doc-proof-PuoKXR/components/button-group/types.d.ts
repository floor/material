import type { ButtonConfig, ButtonComponent } from "../button/types.js";
/** Button group orientation */
export type ButtonGroupOrientation = "horizontal" | "vertical";
/** Button group variant - applies to all buttons in the group */
export type ButtonGroupVariant = "filled" | "tonal" | "outlined" | "elevated" | "text";
/** Button group density options */
export type ButtonGroupDensity = "default" | "comfortable" | "compact";
/** Event types for button group */
export type ButtonGroupEventType = "click" | "focus" | "blur" | "change";
/** Material 3 button group kinds. */
export type ButtonGroupKind = "standard" | "connected";
export type ButtonGroupSelection = "none" | "single" | "multi";
export type ButtonGroupShape = "round" | "square";
export type ButtonGroupSize = "xs" | "s" | "m" | "l" | "xl";
/** Label display: always, or only on the selected button (icon-only otherwise) */
export type ButtonGroupLabels = "always" | "selected";
/** Payload of the "change" event: the selection after the change. */
export interface ButtonGroupChangeEvent {
    buttonGroup: ButtonGroupComponent;
    /** Values of the selected buttons, in button order */
    values: string[];
    /** The selection in the `value` shape of the `<m-button-group>` element's `change`: an array for a multi-select group, a string or null otherwise. */
    value: string | string[] | null;
    selected: ButtonComponent[];
    /** The button whose click caused the change, if any */
    button?: ButtonComponent;
    originalEvent?: Event;
}
/** Event data for button group events */
export interface ButtonGroupEvent {
    /** The button group component that contains the clicked button */
    buttonGroup: ButtonGroupComponent;
    /** The button component that was clicked */
    button: ButtonComponent;
    /** Index of the button in the group */
    index: number;
    /** Original DOM event */
    originalEvent: Event;
}
/** Configuration for a single button within a button group */
interface ButtonGroupItemBase extends Omit<ButtonConfig, "variant"> {
    /** Unique identifier for the button */
    id?: string;
    /** Button text content */
    text?: string;
    /** Button icon HTML content. */
    icon?: string;
    /** Accessible label. */
    ariaLabel?: string;
    /**
 * Whether this button is disabled
 * @default false
 */
    disabled?: boolean;
    /** Value associated with this button */
    value?: string;
    /** Icon shown while selected (toggle buttons). */
    selectedIcon?: string;
    /** Initially selected (selection groups only) */
    selected?: boolean;
    /** Additional CSS class for this button */
    class?: string;
}
/** Configuration interface for the Button Group component */
/** A button in a group. */
export type ButtonGroupItemConfig = (ButtonGroupItemBase & {
    text: string;
}) | (ButtonGroupItemBase & {
    text?: undefined;
    ariaLabel: string;
});
export interface ButtonGroupConfig {
    /** Array of button configurations */
    buttons?: ButtonGroupItemConfig[];
    /** "standard" (default) or "connected" */
    kind?: ButtonGroupKind;
    /** "none" (default): plain actions. */
    selection?: ButtonGroupSelection;
    /** With single or multi selection: the last selected button cannot be deselected */
    required?: boolean;
    /** Corner style: round (default) or square */
    shape?: ButtonGroupShape;
    /**
 * Standard groups: share of its width a pressed button gains while its neighbours give up the difference (M3: 0.15).
 * @default 0.15
 */
    expandedRatio?: number;
    /** Material size token: xs, s (default), m, l, xl */
    size?: ButtonGroupSize;
    /** "always" (default): buttons show icon and text. */
    labels?: ButtonGroupLabels;
    /**
 * Visual variant applied to all buttons in the group
 * @default 'outlined'
 */
    variant?: ButtonGroupVariant;
    /**
 * Orientation of the button group
 * @default 'horizontal'
 */
    orientation?: ButtonGroupOrientation;
    /**
 * Density setting that controls button sizing
 * @default 'default'
 */
    density?: ButtonGroupDensity;
    /**
 * Whether the entire button group is disabled
 * @default false
 */
    disabled?: boolean;
    /**
 * Whether buttons should have equal width
 * @default false
 */
    equalWidth?: boolean;
    /**
 * Component prefix for class names
 * @default 'mtrl'
 */
    prefix?: string;
    /** Component name used in class generation */
    componentName?: string;
    /** Additional CSS class for the button group container */
    class?: string;
    /**
 * Whether to enable ripple effect on buttons
 * @default true
 */
    ripple?: boolean;
    /** Ripple effect configuration */
    rippleConfig?: {
        /** How long, in milliseconds, a released wave lingers before it is removed */
        duration?: number;
    };
    /** Accessible label for the button group */
    ariaLabel?: string;
    /** Listeners registered at creation, ahead of any listener added afterwards. */
    on?: {
        click?: (event: ButtonGroupEvent) => void;
        focus?: (event: ButtonGroupEvent) => void;
        blur?: (event: ButtonGroupEvent) => void;
        change?: (event: ButtonGroupChangeEvent) => void;
    };
}
/** Button Group component interface */
export interface ButtonGroupComponent {
    /** The component's container DOM element */
    element: HTMLElement;
    /** Array of button component instances */
    buttons: ButtonComponent[];
    /**
 * Gets a button by its index
 * @param index
 */
    getButton: (index: number) => ButtonComponent | undefined;
    /**
 * Gets a button by its id or value
 * @param id
 */
    getButtonById: (id: string) => ButtonComponent | undefined;
    /** Gets the current variant */
    getVariant: () => ButtonGroupVariant;
    /**
 * Sets the variant for all buttons in the group
 * @param variant
 */
    setVariant: (variant: ButtonGroupVariant) => ButtonGroupComponent;
    /** Gets the current orientation */
    getOrientation: () => ButtonGroupOrientation;
    /**
 * Sets the orientation of the button group
 * @param orientation
 */
    setOrientation: (orientation: ButtonGroupOrientation) => ButtonGroupComponent;
    /** Gets the current density */
    getDensity: () => ButtonGroupDensity;
    /**
 * Sets the density of the button group
 * @param density
 */
    setDensity: (density: ButtonGroupDensity) => ButtonGroupComponent;
    /** Enables the entire button group */
    enable: () => ButtonGroupComponent;
    /** Disables the entire button group */
    disable: () => ButtonGroupComponent;
    /** Whether the whole group is disabled */
    isDisabled: () => boolean;
    /**
 * Enables a specific button by index
 * @param index
 */
    enableButton: (index: number) => ButtonGroupComponent;
    /**
 * Disables a specific button by index
 * @param index
 */
    disableButton: (index: number) => ButtonGroupComponent;
    /** Selection (groups with selection "single" or "multi") */
    getSelected: () => string[];
    /** Reads the current model value without changing selection. */
    getValue: () => string | string[] | null;
    isSelected: (value: string) => boolean;
    select: (value: string) => ButtonGroupComponent;
    deselect: (value: string) => ButtonGroupComponent;
    toggle: (value: string) => ButtonGroupComponent;
    getKind: () => ButtonGroupKind;
    getSelection: () => ButtonGroupSelection;
    /**
 * Adds an event listener to the button group
 * @param event
 * @param handler
 */
    on: {
        (event: "change", handler: (event: ButtonGroupChangeEvent) => void): ButtonGroupComponent;
        (event: "click" | "focus" | "blur", handler: (event: ButtonGroupEvent) => void): ButtonGroupComponent;
    };
    /**
 * Removes an event listener from the button group
 * @param event
 * @param handler
 */
    off: (event: ButtonGroupEventType, handler: (event: ButtonGroupEvent | ButtonGroupChangeEvent) => void) => ButtonGroupComponent;
    /** Destroys the component and cleans up resources */
    destroy: () => void;
}
export {};
