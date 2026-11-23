/** Progress variant types */
export type ProgressVariant = "linear" | "circular";
/** Progress thickness options */
export type ProgressThickness = "thin" | "thick" | number;
/** Progress shape options (linear only) */
export type ProgressShape = "flat" | "wavy";
/** Progress component event types */
export type ProgressEvent = "change" | "complete";
/** Configuration interface for the Progress component */
export interface ProgressConfig {
    /**
 * Progress variant that determines visual style
 * @default 'linear'
 */
    variant?: ProgressVariant;
    /**
 * Initial progress value (0-100)
 * @default 0
 */
    value?: number;
    /**
 * Whether the progress indicator is initially disabled
 * @default false
 */
    disabled?: boolean;
    /**
 * Maximum value
 * @default 100
 */
    max?: number;
    /**
 * Buffer value for linear progress with buffer (like video loading)
 * @default 0
 */
    buffer?: number;
    /** Additional CSS classes to add to the progress component */
    class?: string;
    /**
 * Thickness of the progress track and indicator
 * @default 'thin'
 */
    thickness?: ProgressThickness;
    /**
 * Shape of the linear indeterminate progress animation
 * @default 'flat'
 */
    shape?: ProgressShape;
    /**
 * Whether to show text label with percentage
 * @default false
 */
    showLabel?: boolean;
    /**
 * Whether progress is indeterminate (shows animation without specific value)
 * @default false
 */
    indeterminate?: boolean;
    /**
 * Whether to mark the end of a linear determinate track with a 4dp dot.
 * @default true
 */
    showStopIndicator?: boolean;
    /**
 * Accessible name: what is loading, such as "Loading news article"
 * @default 'Loading'
 */
    ariaLabel?: string;
    /** Custom label formatter function */
    labelFormatter?: (value: number, max: number) => string;
    /**
 * Component prefix for class names
 * @default 'mtrl'
 */
    prefix?: string;
    /**
 * Component name used in class generation
 * @default 'progress'
 */
    componentName?: string;
    /** DOM structure schema */
    schema?: object;
    /**
 * Size of the circular progress indicator in dp (only for circular variant)
 * @default 40 (48 when wavy)
 */
    size?: number;
}
/** Progress component interface */
/** What progress events carry. */
export interface ProgressEventPayload {
    value: number;
    max: number;
}
/** The progress events. */
export interface ProgressEvents {
    /** The value was set */
    change: (event: ProgressEventPayload) => void;
    /** The value reached the maximum */
    complete: (event: ProgressEventPayload) => void;
}
/** What the progress draws with. */
export interface ProgressInternals {
    /** The canvas the indicator is drawn on */
    canvas: HTMLCanvasElement;
    /** Re-measures the canvas and redraws; the component does this on resize */
    resize: () => void;
    /** The canvas again: these three named the parts of the SVG this replaced */
    track: SVGElement;
    indicator: SVGElement;
    buffer: SVGElement;
}
export interface ProgressComponent {
    /** The component's root DOM element */
    element: HTMLElement;
    /**
 * Gets a class name with the component's prefix
 * @param name
 */
    getClass: (name: string) => string;
    /**
 * Sets the progress value
 * @param value
 * @param animate
 */
    setValue: (value: number, animate?: boolean) => ProgressComponent;
    /** Gets the current progress value */
    getValue: () => number;
    /** Gets the maximum progress value */
    getMax: () => number;
    /**
 * Sets the buffer value (for linear variant with buffer indicators)
 * @param value
 */
    setBuffer: (value: number) => ProgressComponent;
    /** Gets the current buffer value */
    getBuffer: () => number;
    /** Enables the progress component */
    enable: () => ProgressComponent;
    /** Disables the progress component */
    disable: () => ProgressComponent;
    /** Checks if the component is disabled */
    isDisabled: () => boolean;
    /** Hides the progress component */
    hide: () => ProgressComponent;
    /** Shows the progress component */
    show: () => ProgressComponent;
    /** Checks if the progress component is visible */
    isVisible: () => boolean;
    /** Shows the label element */
    showLabel: () => ProgressComponent;
    /** Hides the label element */
    hideLabel: () => ProgressComponent;
    /**
 * Sets a custom formatter for the label
 * @param formatter
 */
    setLabelFormatter: (formatter: (value: number, max: number) => string) => ProgressComponent;
    /**
 * Sets the thickness of the progress track and indicator
 * @param thickness
 */
    setThickness: (thickness: ProgressThickness) => ProgressComponent;
    /** Gets the current thickness value in pixels */
    getThickness: () => number;
    /**
 * Sets the shape of the linear indeterminate progress animation
 * @param shape
 */
    setShape: (shape: ProgressShape) => ProgressComponent;
    /** Gets the current shape value */
    getShape: () => ProgressShape;
    /**
 * Sets the indeterminate state
 * @param indeterminate
 */
    setIndeterminate: (indeterminate: boolean) => ProgressComponent;
    /** Checks if the component is in indeterminate state */
    isIndeterminate: () => boolean;
    /**
 * Sets the size of the circular progress indicator
 * @param size
 */
    setSize: (size: number) => ProgressComponent;
    /** Gets the current size of the circular progress indicator */
    getSize: () => number | undefined;
    /** Returns a Promise that resolves after the current canvas state has been painted to screen. */
    painted: () => Promise<void>;
    /** Adds an event listener: `change` when the value is set, `complete` when it reaches the maximum. */
    on: <K extends keyof ProgressEvents>(event: K, handler: ProgressEvents[K]) => ProgressComponent;
    /** Removes an event listener */
    off: <K extends keyof ProgressEvents>(event: K, handler: ProgressEvents[K]) => ProgressComponent;
    /** Destroys the progress component and cleans up resources */
    destroy: () => void;
    /**
 * Adds CSS classes to the progress element
 * @param classes
 */
    addClass: (...classes: string[]) => ProgressComponent;
    /** API for managing disabled state */
    disabled: {
        /** Enables the progress */
        enable: () => void;
        /** Disables the progress */
        disable: () => void;
        /** Checks if the progress is disabled */
        isDisabled: () => boolean;
    };
    /** API for managing component lifecycle */
    lifecycle: {
        /** Destroys the component and cleans up resources */
        destroy: () => void;
    };
}
