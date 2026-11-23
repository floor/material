import type { ForwardedEventPayload } from "../../core/dom/index.js";
import type { NormalizedEvent } from "../../core/utils/mobile.js";
/** Normalized touch-end event emitted by the interactive root on touch devices. */
export type TimePickerTapPayload = NormalizedEvent;
/** Horizontal swipe emitted by the interactive root on touch devices. */
export interface TimePickerSwipePayload {
    direction: "left" | "right";
    deltaX: number;
    deltaY: number;
}
/** The committed 24-hour value carried by `change` and `confirm`. */
export interface TimePickerValueEvent {
    /** HH:MM, or HH:MM:SS with showSeconds */
    value: string;
}
/** A draft edit while the committed value remains available as `value`. */
export interface TimePickerInputEvent extends TimePickerValueEvent {
    /** The uncommitted 24-hour value shown in the open picker. */
    draftValue: string;
}
/** Events emitted by the picker API and its interactive root. */
export interface TimePickerEvents {
    /** The committed 24-hour value (HH:MM, or HH:MM:SS with showSeconds), also submitted by the form: once when OK commits a different time. */
    change: (event: TimePickerValueEvent) => void;
    /** The committed value and draft as the dial, fields or AM/PM change. */
    input: (event: TimePickerInputEvent) => void;
    /** The confirmed 24-hour value, matching getValue() and the submitted form value. */
    confirm: (event: TimePickerValueEvent) => void;
    open: () => void;
    close: () => void;
    cancel: () => void;
    /** Root events; the dialog is inside the root, so its clicks and keys reach these too. */
    click: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
    keydown: (payload: ForwardedEventPayload<KeyboardEvent, HTMLElement>) => void;
    tap: (payload: TimePickerTapPayload) => void;
    swipe: (payload: TimePickerSwipePayload) => void;
}
/** Time picker display type */
export declare enum TIME_PICKER_TYPE {
    /** Clock dial-based time picker */
    DIAL = "dial",
    /** Text input-based time picker */
    INPUT = "input"
}
/** Time picker orientation */
export declare enum TIME_PICKER_ORIENTATION {
    /** Vertical layout (default on mobile) */
    VERTICAL = "vertical",
    /** Horizontal layout */
    HORIZONTAL = "horizontal"
}
/** Time format (12-hour or 24-hour) */
export declare enum TIME_FORMAT {
    /** 12-hour format with AM/PM */
    AMPM = "12h",
    /** 24-hour format */
    MILITARY = "24h"
}
/** A time format as the enum or its string value, `'12h'` or `'24h'` */
export type TimeFormat = TIME_FORMAT | `${TIME_FORMAT}`;
/** A time picker type as the enum or its string value, `'dial'` or `'input'` */
export type TimePickerType = TIME_PICKER_TYPE | `${TIME_PICKER_TYPE}`;
/** An orientation as the enum or its string value, `'vertical'` or `'horizontal'` */
export type TimePickerOrientation = TIME_PICKER_ORIENTATION | `${TIME_PICKER_ORIENTATION}`;
/** Period of day for 12-hour format */
export declare enum TIME_PERIOD {
    /** Morning */
    AM = "AM",
    /** Afternoon/Evening */
    PM = "PM"
}
/** Configuration interface for the TimePicker component */
export interface TimePickerConfig {
    /** Initial time value in 24-hour format (HH:MM) */
    value?: string;
    /** Form field name. */
    name?: string;
    /**
 * Type of time picker to display
 * @default TIME_PICKER_TYPE.DIAL
 */
    type?: TimePickerType;
    /**
 * Time format to use (12h or 24h)
 * @default TIME_FORMAT.AMPM
 */
    format?: TimeFormat;
    /**
 * Layout orientation for the time picker
 * @default TIME_PICKER_ORIENTATION.VERTICAL
 */
    orientation?: TimePickerOrientation;
    /** Title text for the time picker */
    title?: string;
    /** Accessible dialog name; defaults to the title, then "Select time". */
    ariaLabel?: string;
    /**
 * Whether to show seconds selector
 * @default false
 */
    showSeconds?: boolean;
    /** Additional CSS classes to add to the time picker */
    class?: string;
    /**
 * Component prefix for class names
 * @default 'mtrl'
 */
    prefix?: string;
    /** Component name used in class generation */
    componentName?: string;
    /** Earliest selectable time, 24-hour `HH:MM` or `HH:MM:SS`. */
    minTime?: string;
    /** Latest selectable time, 24-hour `HH:MM` or `HH:MM:SS`; as `minTime`, at the other end. */
    maxTime?: string;
    /**
 * Minute step: dial minutes off it are disabled, a pointer between them picks the nearest, and a typed minute rounds to it when committed.
 * @default 1
 */
    minuteStep?: number;
    /**
 * Second step, as `minuteStep`, when seconds are shown.
 * @default 1
 */
    secondStep?: number;
    /**
 * Custom text for cancel button
 * @default 'Cancel'
 */
    cancelText?: string;
    /**
 * Custom text for confirm button
 * @default 'OK'
 */
    confirmText?: string;
    /**
 * Whether the time picker is open when the factory returns: `isOpen()` is true and `open` has been emitted (to `onOpen`).
 * @default false
 */
    open?: boolean;
    /**
 * Whether the picker is disabled: it does not open
 * @default false
 */
    disabled?: boolean;
    /**
 * Where the dialog is appended.
 * @default the component's element
 */
    container?: string | HTMLElement;
    /** Custom icon for the clock button */
    clockIcon?: string;
    /** Custom icon for the keyboard button */
    keyboardIcon?: string;
    /** `change` listener registered at creation. */
    onChange?: TimePickerEvents["change"];
    /** `input` listener registered at creation, as the draft changes while the picker is open. */
    onInput?: TimePickerEvents["input"];
    /** `open` listener registered at creation. */
    onOpen?: TimePickerEvents["open"];
    /** `close` listener registered at creation. */
    onClose?: TimePickerEvents["close"];
    /** `confirm` listener registered at creation. */
    onConfirm?: TimePickerEvents["confirm"];
    /** `cancel` listener registered at creation. */
    onCancel?: TimePickerEvents["cancel"];
}
/** Configuration as it leaves `createBaseConfig`. */
export type ResolvedTimePickerConfig = TimePickerConfig & Required<Pick<TimePickerConfig, "type" | "format" | "orientation" | "showSeconds" | "minuteStep" | "secondStep" | "cancelText" | "confirmText" | "open" | "clockIcon" | "keyboardIcon" | "prefix">> & {
    /** The dialog title's id, unique per picker. */
    titleId?: string;
};
/** Time value object */
export interface TimeValue {
    /** Hours (0-23) */
    hours: number;
    /** Minutes (0-59) */
    minutes: number;
    /** Seconds (0-59), optional */
    seconds?: number;
    /** AM/PM for 12-hour format */
    period?: TIME_PERIOD;
}
/** TimePicker component interface */
export interface TimePickerComponent {
    /** The time picker's container DOM element */
    element: HTMLElement;
    /** Modal container element */
    modalElement: HTMLElement;
    /** Dialog container element */
    dialogElement: HTMLElement;
    /** Whether the time picker is currently open */
    isOpen: () => boolean;
    /** Opens the time picker. */
    open: () => TimePickerComponent;
    /** Closes the time picker */
    close: () => TimePickerComponent;
    /** Toggles the time picker open/closed state */
    toggle: () => TimePickerComponent;
    /** Gets the current time value */
    getValue: () => string;
    /** Gets the current time as a TimeValue object */
    getTimeObject: () => TimeValue;
    /**
 * Sets the time value.
 * @param time
 */
    setValue: (time: string) => TimePickerComponent;
    /**
 * Sets the time picker type (dial or input)
 * @param type
 */
    setType: (type: TimePickerType) => TimePickerComponent;
    /** Gets the current time picker type */
    getType: () => TIME_PICKER_TYPE;
    /**
 * Sets the time format (12h or 24h)
 * @param format
 */
    setFormat: (format: TimeFormat) => TimePickerComponent;
    /** Gets the current time format */
    getFormat: () => TIME_FORMAT;
    /**
 * Sets the time picker orientation
 * @param orientation
 */
    setOrientation: (orientation: TimePickerOrientation) => TimePickerComponent;
    /** Gets the current time picker orientation */
    getOrientation: () => TIME_PICKER_ORIENTATION;
    /**
 * Sets the time picker title
 * @param title
 */
    setTitle: (title: string) => TimePickerComponent;
    /** Names the dialog; empty restores its title or "Select time". */
    setAriaLabel: (label: string) => TimePickerComponent;
    /** Gets the current time picker title */
    getTitle: () => string;
    /** Enables the picker */
    enable: () => TimePickerComponent;
    /** Disables the picker: it does not open, and an open one is cancelled */
    disable: () => TimePickerComponent;
    /** Whether the picker is disabled */
    isDisabled: () => boolean;
    /** Destroys the time picker component and cleans up resources */
    destroy: () => void;
    /**
 * Adds an event listener to the time picker
 * @param event
 * @param handler
 */
    on: <K extends keyof TimePickerEvents>(event: K, handler: TimePickerEvents[K]) => TimePickerComponent;
    /**
 * Removes an event listener from the time picker
 * @param event
 * @param handler
 */
    off: <K extends keyof TimePickerEvents>(event: K, handler: TimePickerEvents[K]) => TimePickerComponent;
}
