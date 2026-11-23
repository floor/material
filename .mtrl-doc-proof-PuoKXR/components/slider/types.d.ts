import type { ForwardedEventPayload } from "../../core/dom/index.js";
import type { NormalizedEvent, TouchEvents } from "../../core/utils/mobile.js";
import { SliderSize, SLIDER_COLORS, SLIDER_EVENTS, SLIDER_SIZES } from "./constants.js";
import { BaseComponentConfig } from "../../core/config/component.js";
export { SLIDER_COLORS, SLIDER_EVENTS, SLIDER_SIZES };
/** Available slider color variants */
export type SliderColor = "primary" | "secondary" | "tertiary" | "error";
/** Available slider event types */
export type SliderEventType = "change" | "input" | "focus" | "blur" | "start" | "end";
/** Configuration options for the slider component */
export interface SliderConfig extends BaseComponentConfig {
    /**
 * Put ariaLabel only on the input/handle, omitting the generated wrapper label.
 * @default false
 */
    controlLabelOnly?: boolean;
    /** Minimum value of the slider */
    min?: number;
    /** Maximum value of the slider */
    max?: number;
    /** Current value of the slider */
    value?: number;
    /** Secondary value for range slider (when using two handles) */
    secondValue?: number;
    /** Step size for discrete slider */
    step?: number;
    /** Whether the slider is disabled */
    disabled?: boolean;
    /** Form field name. */
    name?: string;
    /** Color variant of the slider * A stylesheet can override the drawn colours per slider with the custom properties `--<prefix>-slider-color` and `--<prefix>-slider-on-color`, where `<prefix>` is the configured component prefix (mtrl by default). */
    color?: SliderColor;
    /** Size variant of the slider */
    size?: SliderSize;
    /** Whether to show tick marks */
    ticks?: boolean;
    /** Custom labels for ticks, if provided */
    tickLabels?: string[] | Record<number, string>;
    /** Format function for displayed values */
    valueFormatter?: (value: number) => string;
    /** Whether to show the current value while dragging */
    showValue?: boolean;
    /** Whether to snap to steps while dragging (discrete slider) */
    snapToSteps?: boolean;
    /** Whether the slider is a range slider (two handles) */
    range?: boolean;
    /** Whether the slider is a centered slider (with active track from center) */
    centered?: boolean;
    /** Label text for the slider */
    label?: string;
    /** Position of the label (start or end) - defaults to 'start' */
    labelPosition?: "start" | "end";
    /** An icon inside the track, drawn as SVG markup (M3 Expressive "inset icon"). */
    insetIcon?: string;
    /** The inset icon while the value is at the minimum, in place of `insetIcon`. */
    insetIconAtMin?: string;
    /** The slider's orientation. */
    orientation?: "horizontal" | "vertical";
    /** A vertical slider's minimum at the top instead of the bottom (Compose VerticalSlider) */
    topToBottom?: boolean;
    /** Icon to display with the slider. */
    icon?: string;
    /** Position of the icon (start or end) */
    iconPosition?: "start" | "end";
    /** Additional CSS classes */
    class?: string;
    /** Event handlers for slider events */
    on?: {
        [key in SliderEventType]?: (event: SliderEvent) => void;
    };
    /** CSS class prefix */
    prefix?: string;
    /** Component schema */
    schema?: object;
}
/** Slider event data */
export interface SliderEvent {
    /** The slider component that triggered the event */
    slider: SliderComponent;
    /** Current slider value */
    value: number;
    /** Secondary value (for range sliders) */
    secondValue: number | null;
    /** Original DOM event if available */
    originalEvent: Event | null;
    /** Function to prevent default behavior */
    preventDefault: () => void;
    /** Whether default behavior was prevented */
    defaultPrevented: boolean;
}
/** Slider component public API interface */
/** Which handle an interaction is acting on. */
export type SliderActiveHandle = "first" | "second" | null;
/** The controller's state, shared with the handlers it builds. */
export interface SliderState {
    value: number;
    secondValue: number | null;
    min: number;
    max: number;
    step: number;
    dragging: boolean;
    /** Whether a handle is held down */
    pressed: boolean;
    activeHandle: SliderActiveHandle;
    activeBubble: HTMLElement | null;
    valueHideTimer: ReturnType<typeof setTimeout> | null;
}
/** The DOM the controller reaches for on the component it is handed. */
export interface SliderStateComponent {
    element: HTMLElement;
    container?: HTMLElement | null;
    handle?: HTMLElement | null;
    valueBubble?: HTMLElement | null;
    secondHandle?: HTMLElement | null;
    secondValueBubble?: HTMLElement | null;
    getClass: (name: string) => string;
    emit: (event: string, data: unknown) => unknown;
    /** withStates installs this whole, so the member is not optional inside it */
    disabled?: {
        isDisabled: () => boolean;
    };
    /** The hidden inputs withDom builds when the slider has a name. */
    formFields?: (HTMLInputElement | null)[] | null;
    /** withTracks installs this; the controller reads it for the discrete inset */
    getSize?: () => SliderSize;
    /** withTracks installs this; the controller calls it with the state after every change */
    renderTracks?: (state?: unknown) => void;
    lifecycle?: {
        destroy?: () => void;
        mount?: () => void;
    };
}
/** What drives a drag: the same handlers are registered for mouse and for touch, so each one takes either. */
export type SliderPointerEvent = MouseEvent | TouchEvent;
/** Public model, native forwarding and gesture notifications. */
export interface SliderEvents extends TouchEvents {
    change: (payload: SliderEvent) => void;
    input: (payload: SliderEvent) => void;
    focus: (payload: SliderEvent) => void;
    blur: (payload: SliderEvent) => void;
    start: (payload: SliderEvent) => void;
    end: (payload: SliderEvent) => void;
    click: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
    keydown: (payload: ForwardedEventPayload<KeyboardEvent, HTMLElement>) => void;
    mousedown: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
    mousemove: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
    mouseup: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
    touchstart: (payload: ForwardedEventPayload<TouchEvent, HTMLElement> | NormalizedEvent) => void;
    touchend: (payload: ForwardedEventPayload<TouchEvent, HTMLElement> | NormalizedEvent) => void;
    touchmove: (payload: ForwardedEventPayload<TouchEvent, HTMLElement> | (NormalizedEvent & {
        deltaX: number;
        deltaY: number;
    })) => void;
}
export interface SliderComponent {
    /** The root element of the slider */
    element: HTMLElement;
    /** Sets slider value. */
    setValue: (value: number, triggerEvent?: boolean) => SliderComponent;
    /** Gets slider value */
    getValue: () => number;
    /** Sets secondary slider value (for range slider). */
    setSecondValue: (value: number, triggerEvent?: boolean) => SliderComponent;
    /** Gets secondary slider value */
    getSecondValue: () => number | null;
    /** Sets slider minimum value */
    setMin: (min: number) => SliderComponent;
    /** Gets slider minimum value */
    getMin: () => number;
    /** Sets slider maximum value */
    setMax: (max: number) => SliderComponent;
    /** Gets slider maximum value */
    getMax: () => number;
    /** Sets slider step size */
    setStep: (step: number) => SliderComponent;
    /** Gets slider step size */
    getStep: () => number;
    /** Enables the slider */
    enable: () => SliderComponent;
    /** Disables the slider */
    disable: () => SliderComponent;
    /** Checks if slider is disabled */
    isDisabled: () => boolean;
    /** Sets slider color */
    setColor: (color: SliderColor) => SliderComponent;
    /** Gets slider color */
    getColor: () => string;
    /** Sets slider size */
    setSize: (size: SliderSize) => SliderComponent;
    /** Gets the size as it was set: a size name, or a track height in pixels */
    getSize: () => SliderSize;
    /** Shows or hides tick marks */
    showTicks: (show: boolean) => SliderComponent;
    /** Shows or hides current value while dragging */
    showCurrentValue: (show: boolean) => SliderComponent;
    /** Sets label text */
    setLabel: (text: string) => SliderComponent;
    /** Gets label text */
    getLabel: () => string;
    /** Sets the inset icon, and optionally the one shown at the minimum; '' removes it */
    setInsetIcon: (icon: string, atMin?: string) => SliderComponent;
    /** Sets icon HTML */
    setIcon: (iconHtml: string) => SliderComponent;
    /** Gets icon HTML */
    getIcon: () => string;
    /** Adds event listener */
    on: <K extends keyof SliderEvents>(event: K, handler: SliderEvents[K]) => SliderComponent;
    /** Removes event listener */
    off: <K extends keyof SliderEvents>(event: K, handler: SliderEvents[K]) => SliderComponent;
    /** Destroys the slider component and cleans up resources */
    destroy: () => void;
}
/** Registers SliderConfig with the global defaults map, so `setComponentDefaults("slider", ...)` is typed without core importing anything from this component. */
declare module "../../core/config/global" {
    interface ComponentConfigMap {
        slider?: Partial<SliderConfig>;
    }
}
