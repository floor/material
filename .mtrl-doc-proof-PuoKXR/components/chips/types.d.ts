import type { EventCallback } from "../../core/state/emitter.js";
import type { ForwardedEventPayload } from "../../core/dom/index.js";
export type ChipType = "assist" | "filter" | "input" | "suggestion";
/** Shared chip options. */
export interface ChipConfig {
    type?: ChipType;
    label?: string;
    /** Accessible name for the primary focus target. */
    ariaLabel?: string;
    value?: string;
    disabled?: boolean;
    /** In a single-select set, selecting this chip replaces the previous selection; the last selected config wins. */
    selected?: boolean;
    /** Elevated styling is supported by assist, filter and suggestion chips. */
    elevated?: boolean;
    /** Markup (HTML). */
    leadingIcon?: string;
    /** Markup (HTML). */
    icon?: string;
    /** Markup (HTML). */
    trailingIcon?: string;
    /** Decorative avatar for an input chip; takes precedence over leadingIcon. */
    avatar?: string;
    /** Called when an input chip is removed, from its remove button or with Backspace or Delete. */
    onRemove?: ChipEvents["remove"];
    removeLabel?: string;
    /** Filter chips: gives the trailing icon its own button, which calls this (the m3.material.io chips' trailing icon that "can be used to open a menu or remove the chip"). */
    onTrailingClick?: ChipEvents["trailing"];
    /** The trailing button's accessible name; "{label} options" for a menu, "Remove {label}" otherwise. */
    trailingLabel?: string;
    /** The trailing button opens a menu: aria-haspopup="menu", and a drop-down arrow unless trailingIcon is set. */
    trailingMenu?: boolean;
    /** Same payload as a `click` listener. */
    onClick?: ChipEvents["click"];
    /** Same payload as a `change` listener: `{ selected, chip, value }`. */
    onChange?: ChipEvents["change"];
    /** Called with the chip when the user toggles a selectable chip, not when a `selectionRequired` set refuses the click. */
    onSelect?: (chip: ChipComponent) => void;
    class?: string;
    prefix?: string;
    componentName?: string;
    ripple?: boolean;
}
export interface ChipOptions extends ChipConfig {
    /** Selection belongs to the chips container. */
    managedSelection?: boolean;
    /** Notify the owning set when a chip becomes selected. */
    onSelected?: (chip: ChipComponent) => void;
    /** The owning set removes the chip, once its `remove` listeners have run. */
    onRemoved?: (chip: ChipComponent) => void;
    /** The chip is a cell of a chip set's grid: the root is a `gridcell`, and a one-action chip's cell is its focus target. */
    cell?: boolean;
}
type NamedChipConfig = Omit<ChipConfig, "type" | "text" | "selected" | "avatar" | "onRemove" | "removeLabel" | "onChange" | "onSelect" | "onTrailingClick" | "trailingLabel" | "trailingMenu"> & {
    label: string;
};
export type AssistChipConfig = NamedChipConfig;
export type SuggestionChipConfig = Omit<NamedChipConfig, "trailingIcon">;
export type FilterChipConfig = NamedChipConfig & Pick<ChipConfig, "selected" | "onChange" | "onSelect" | "onTrailingClick" | "trailingLabel" | "trailingMenu">;
export type InputChipConfig = Omit<FilterChipConfig, "elevated" | "onTrailingClick" | "trailingLabel" | "trailingMenu"> & Pick<ChipConfig, "avatar" | "onRemove" | "removeLabel">;
export interface ChipChangePayload {
    selected: boolean;
    chip: ChipComponent;
    /** The chip's value, as `getValue()` returns it; every model event carries it */
    value: string | null;
}
export interface ChipEvents {
    click: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
    keydown: (payload: ForwardedEventPayload<KeyboardEvent, HTMLElement>) => void;
    focus: (payload: ForwardedEventPayload<FocusEvent, HTMLElement>) => void;
    blur: (payload: ForwardedEventPayload<FocusEvent, HTMLElement>) => void;
    change: (payload: ChipChangePayload) => void;
    remove: (chip: ChipComponent) => void;
    /** A filter chip's trailing button was activated. */
    trailing: (chip: ChipComponent) => void;
}
/** Shared API. */
export interface ChipComponent {
    element: HTMLElement;
    /** Native primary action. */
    action: HTMLButtonElement;
    /** A filter chip's trailing button, when it has one (`onTrailingClick`): anchor a menu to it and keep its aria-expanded in step. */
    trailingAction?: HTMLButtonElement;
    getType: () => ChipType;
    getValue: () => string | null;
    setValue: (value: string) => ChipComponent;
    enable: () => ChipComponent;
    disable: () => ChipComponent;
    isDisabled: () => boolean;
    setLabel: (label: string) => ChipComponent;
    getLabel: () => string;
    /** Alias of setLabel for chips-container consumers. */
    setText: (text: string) => ChipComponent;
    getText: () => string;
    setIcon: (icon: string) => ChipComponent;
    getIcon: () => string;
    setLeadingIcon: (icon: string) => ChipComponent;
    setTrailingIcon: (icon: string) => ChipComponent;
    isSelected: () => boolean;
    /** Selects or deselects this chip silently. */
    setSelected: (selected: boolean) => ChipComponent;
    toggleSelected: () => ChipComponent;
    focus: () => ChipComponent;
    destroy: () => void;
    on: <K extends keyof ChipEvents>(event: K, handler: ChipEvents[K]) => ChipComponent;
    off: <K extends keyof ChipEvents>(event: K, handler: ChipEvents[K]) => ChipComponent;
    addClass: (...classes: string[]) => ChipComponent;
}
/** Configuration interface for the Chips component */
export interface ChipsConfig {
    /**
 * Array of chip configurations to initialize
 * @default []
 */
    chips?: ChipConfig[];
    /**
 * Whether the chip set is horizontally scrollable
 * @default false
 */
    scrollable?: boolean;
    /**
 * Whether the chip set is vertically stacked
 * @default false
 */
    vertical?: boolean;
    /** Additional CSS classes */
    class?: string;
    /** CSS selector for filtering behavior */
    selector?: string | null;
    /**
 * Whether several chips can be selected at once.
 * @default true
 */
    multiSelect?: boolean;
    /**
 * Whether the set keeps at least one chip selected: deselecting the last selected chip is refused, and a refused click emits no `change`, on the chip or on the set.
 * @default false
 */
    selectionRequired?: boolean;
    /** Same payload as an `on("change")` listener. */
    onChange?: ChipsEvents["change"];
    /**
 * Component prefix for class names
 * @default 'mtrl'
 */
    prefix?: string;
    /** Label text for the chips container */
    label?: string;
    /**
 * Position of the label (start or end)
 * @default 'start'
 */
    labelPosition?: "start" | "end";
    /** Schema definition for the component structure */
    schema?: unknown;
    /** Event handlers for component events */
    on?: Partial<ChipsEvents>;
}
/** Chips component interface */
/** What a chips feature needs from the component it is handed. */
export interface ChipsFeatureComponent {
    element: HTMLElement;
    getClass: (name: string) => string;
    emit?: (event: string, data: unknown) => unknown;
    /** withDom builds this; the controller appends chips to it */
    chipContainer?: HTMLElement;
    /** withChipItems keeps the live chips here. */
    chipInstances: ChipComponent[];
    /** withContainer installs this whole, so the members are not optional in it */
    layout?: {
        isVertical: () => boolean;
        isScrollable: () => boolean;
    };
    resources?: import("../../core/compose/cleanup.js").CleanupScope;
    lifecycle?: {
        destroy: () => void;
    };
}
/** The handlers the chips controller keeps per event name. */
export type ChipsEventListeners = Record<string, EventCallback[]>;
/** The payload of the chips set's `change`. */
export interface ChipsChangeEvent {
    /** The selection in the `value` property's shape: a string or null for a single-select set, an array for a multi-select one. */
    value: string | string[] | null;
    /** The values of the selected chips, in chip order (a chip without a value gives null) */
    selected: (string | null)[];
    /** The value of the chip the user toggled; null for a change made by a method */
    changed: string | null;
}
/** A chip joined the set; `value` is the selection after insertion. */
export interface ChipsAddEvent {
    value: string | string[] | null;
    chip: ChipComponent;
}
/** A chip left the set; `value` is the remaining selection. */
export interface ChipsRemoveEvent extends ChipsAddEvent {
    /** The selection after removal, in the same shape as the set's `getValue()`. */
    value: string | string[] | null;
    /** The removed chip's value, captured before destruction. */
    chipValue: string | null;
}
/** Events emitted by the chips container's controller. */
export interface ChipsEvents {
    /** The selection after the change. */
    change: (event: ChipsChangeEvent) => void;
    /** The newly created chip and the selection after insertion. */
    add: (event: ChipsAddEvent) => void;
    /** The removed chip and the selection after removal. */
    remove: (event: ChipsRemoveEvent) => void;
}
export interface ChipsComponent {
    /** The chips container's DOM element */
    element: HTMLElement;
    /**
 * Adds a new chip to the chips container.
 * @param chipConfig
 */
    addChip: (chipConfig: ChipConfig) => ChipsComponent;
    /**
 * Removes a chip from the chips container
 * @param chipOrIndex
 */
    removeChip: (chipOrIndex: ChipComponent | number) => ChipsComponent;
    /** Gets all chip instances in the set */
    getChips: () => ChipComponent[];
    /** Gets currently selected chips */
    getSelectedChips: () => ChipComponent[];
    /** Gets the values of selected chips */
    getSelectedValues: () => (string | null)[];
    /** Gets the current value - form field compatibility */
    getValue: () => string | string[] | null;
    /**
 * Sets the value by selecting chips by value, without a change event - form field compatibility
 * @param values
 */
    setValue: (values: string | string[] | null | undefined) => ChipsComponent;
    /**
 * Selects chips by their values
 * @param values
 * @param triggerEvent
 */
    selectByValue: (values: string | string[], triggerEvent?: boolean) => ChipsComponent;
    /** Clears all selections. */
    clearSelection: () => ChipsComponent;
    /**
 * Sets the scrollable state of the chips container
 * @param isScrollable
 */
    setScrollable: (isScrollable: boolean) => ChipsComponent;
    /**
 * Sets the vertical layout state
 * @param isVertical
 */
    setVertical: (isVertical: boolean) => ChipsComponent;
    /**
 * Sets the label text
 * @param text
 */
    setLabel: (text: string) => ChipsComponent;
    /** Gets the label text */
    getLabel: () => string;
    /**
 * Sets the label position
 * @param position
 */
    setLabelPosition: (position: "start" | "end") => ChipsComponent;
    /** Gets the label position */
    getLabelPosition: () => string;
    /**
 * Scrolls to a specific chip.
 * @param chipOrIndex
 */
    scrollToChip: (chipOrIndex: ChipComponent | number) => ChipsComponent;
    /** Enables keyboard navigation between chips in the set */
    enableKeyboardNavigation: () => ChipsComponent;
    /** Turns keyboard navigation between the chips on and off: while disabled, */
    keyboard: {
        /** Moves focus with the arrows, Home and End again */
        enable: () => void;
        /** Stops moving focus with the arrows, Home and End */
        disable: () => void;
    };
    /** Destroys the chips container and all contained chips */
    destroy: () => void;
    /**
 * Adds an event listener to the chips container
 * @param event
 * @param handler
 */
    on: <K extends keyof ChipsEvents>(event: K, handler: ChipsEvents[K]) => ChipsComponent;
    /**
 * Removes an event listener from the chips container
 * @param event
 * @param handler
 */
    off: <K extends keyof ChipsEvents>(event: K, handler: ChipsEvents[K]) => ChipsComponent;
}
/** Registers ChipConfig with the global defaults map, so `setComponentDefaults("chip", ...)` is typed without core importing anything from this component. */
declare module "../../core/config/global" {
    interface ComponentConfigMap {
        chip?: Partial<ChipConfig>;
    }
}
export {};
