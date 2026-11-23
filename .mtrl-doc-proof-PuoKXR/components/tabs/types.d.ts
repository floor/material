import type { BadgeComponent } from "../badge/index.js";
import type { ButtonComponent } from "../button/types.js";
import type { ForwardedEventPayload } from "../../core/dom/index.js";
/** Button methods the tab delegates to; each one is checked before use */
export type TabButton = Partial<Pick<ButtonComponent, 'getValue' | 'setValue' | 'getText' | 'setText' | 'getIcon' | 'setIcon'>>;
import { TabIndicator } from "./indicator.js";
/** Available tabs variants */
export type TabsVariant = 'primary' | 'secondary';
/** Available tabs states */
export type TabStates = 'active' | 'inactive' | 'disabled';
/** Configuration for the tab indicator */
export interface IndicatorConfig {
    /** Height of the indicator in pixels */
    height?: number;
    /** Width strategy for the indicator */
    widthStrategy?: 'fixed' | 'dynamic' | 'content' | 'auto';
    /** Fixed width in pixels (when using fixed strategy) */
    fixedWidth?: number;
    /** Animation duration in milliseconds */
    animationDuration?: number;
    /** Animation timing function */
    animationTiming?: string;
    /** Custom color for the indicator */
    color?: string;
    /** Whether the indicator shows; hide() and show() change it later */
    visible?: boolean;
    /** Tab variant (primary or secondary) */
    variant?: string;
}
/** Tab change event data interface */
export interface TabChangeEventData {
    /** The tab component that was activated */
    tab: TabComponent;
    /** The value of the activated tab, as `TabComponent.getValue()` returns it. */
    value: string;
}
/** Events a single tab emits, and what each hands its handler. */
export interface TabEvents {
    click: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
    focus: (event: FocusEvent) => void;
    blur: (event: FocusEvent) => void;
}
/** Events a tabs group emits. */
export interface TabsEvents {
    change: (event: TabChangeEventData) => void;
}
/** Configuration interface for a single Tab */
export interface TabConfig {
    /** Id of the tab group this tab belongs to. */
    groupId?: string;
    /** Accessible name for a tab. */
    ariaLabel?: string;
    /**
 * Tab state that determines if it's the active destination
 * @default 'inactive'
 */
    state?: TabStates | string;
    /**
 * Whether the tab is initially disabled
 * @default false
 */
    disabled?: boolean;
    /** Initial tab text content (label) */
    text?: string;
    /** Initial tab icon HTML content. */
    icon?: string;
    /** Badge text or value to display (if applicable) */
    badge?: string | number;
    /** Badge configuration object */
    badgeConfig?: {
        variant?: string;
        color?: string;
        size?: string;
        position?: string;
        max?: number;
    };
    /**
 * Icon size in pixels or other CSS units
 * @default '24px'
 */
    iconSize?: string;
    /** Additional CSS classes to add to the tab */
    class?: string;
    /** Tab value attribute for identifying the selected tab */
    value?: string;
    /**
 * Whether to enable ripple effect
 * @default true
 */
    ripple?: boolean;
    /**
 * Component prefix for class names
 * @default 'mtrl'
 */
    prefix?: string;
    /** Component name used in class generation */
    componentName?: string;
    /** Ripple effect configuration */
    rippleConfig?: {
        /** How long, in milliseconds, a released wave lingers before it is removed */
        duration?: number;
    };
    /** Variant of the tab */
    variant?: string;
}
/** Configuration interface for the Tabs component */
export interface TabsConfig {
    /** Accessible name for the tablist when it has no visible label. */
    ariaLabel?: string;
    /** Id for this tab group, used to build each tab's element id as `tab-<groupId>-<value>` and to find panels as `tabpanel-<groupId>-<value>`; a value with characters outside `[A-Za-z0-9_-]` gets a derived id instead (`tabIdFor`, `tabPanelIdFor`, The group id itself is not encoded: keep a pinned one to `[A-Za-z0-9_]` (generated ones are), or `tabIdFor("a-b", "c")` and `tabIdFor("a", "b-c")` coincide and a space makes an unsafe id. */
    groupId?: string;
    /**
 * Whether an arrow key also selects the tab it moves to.
 * @default false
 */
    autoActivate?: boolean;
    /** A behaviour to apply to the group while it is created, e.g. */
    responsive?: (tabs: TabsComponent) => void;
    /**
 * Tabs variant (primary or secondary)
 * @default 'primary'
 */
    variant?: TabsVariant | string;
    /** Initial tabs to create */
    tabs?: TabConfig[];
    /**
 * Whether to show the divider
 * @default true
 */
    showDivider?: boolean;
    /**
 * Whether to enable horizontal scrolling
 * @default true
 */
    scrollable?: boolean;
    /** Additional CSS classes for the container */
    class?: string;
    /**
 * Component prefix for class names
 * @default 'mtrl'
 */
    prefix?: string;
    /** Event handlers registered when the tabs are created. */
    on?: Partial<TabsEvents>;
    /** Tab indicator configuration */
    indicator?: IndicatorConfig;
}
/** Icon API interface for managing tab icons */
export interface IconAPI {
    /**
 * Sets the icon HTML content
 * @param html
 */
    setIcon: (html: string) => IconAPI;
    /** Gets the current icon HTML content */
    getIcon: () => string;
    /** Gets the icon DOM element */
    getElement: () => HTMLElement | null;
}
/** Text API interface for managing tab text */
export interface TextAPI {
    /**
 * Sets the text content
 * @param content
 */
    setText: (content: string) => TextAPI;
    /** Gets the current text content */
    getText: () => string;
    /** Gets the text DOM element */
    getElement: () => HTMLElement | null;
}
/** Tab component interface */
export interface TabComponent {
    /** The tab's DOM element */
    element: HTMLElement;
    /** The button the tab is built on */
    button?: TabButton;
    /** The tab's badge component, or `undefined`. */
    badge?: BadgeComponent | undefined;
    /** Gets a class name with the component's prefix */
    getClass: (name: string) => string;
    /** Gets the tab's value attribute */
    getValue: () => string;
    /** Sets the tab's value attribute */
    setValue: (value: string) => TabComponent;
    /** Activates the tab (sets active state) */
    activate: () => TabComponent;
    /** Deactivates the tab (sets inactive state) */
    deactivate: () => TabComponent;
    /** Checks if the tab is active */
    isActive: () => boolean;
    /** Enables the tab (removes disabled attribute) */
    enable: () => TabComponent;
    /** Disables the tab (adds disabled attribute) */
    disable: () => TabComponent;
    /** Whether the tab is disabled */
    isDisabled: () => boolean;
    /** Sets the tab's text content */
    setText: (content: string) => TabComponent;
    /** Sets the explicit accessible label; undefined restores text/value naming. */
    setAriaLabel: (label: string | undefined) => TabComponent;
    /** Gets the tab's text content */
    getText: () => string;
    /** Sets the tab's icon */
    setIcon: (icon: string) => TabComponent;
    /** Gets the tab's icon HTML content */
    getIcon: () => string;
    /** Sets the tab's badge */
    setBadge: (content: string | number) => TabComponent;
    /** Gets the tab's badge content */
    getBadge: () => string;
    /** Shows the tab's badge */
    showBadge: () => TabComponent;
    /** Hides the tab's badge */
    hideBadge: () => TabComponent;
    /** Gets the badge component instance, or `undefined`: it may not exist */
    getBadgeComponent: () => BadgeComponent | undefined;
    /** Updates the tab's layout style based on content */
    updateLayoutStyle: () => void;
    /**
 * Adds an event listener to the tab.
 * @param event
 * @param handler
 */
    on: <K extends keyof TabEvents>(event: K, handler: TabEvents[K]) => TabComponent;
    /**
 * Removes an event listener from the tab
 * @param event
 * @param handler
 */
    off: <K extends keyof TabEvents>(event: K, handler: TabEvents[K]) => TabComponent;
    /** Destroys the tab component and cleans up resources */
    destroy: () => void;
    /** API for managing disabled state */
    disabled?: {
        enable: () => void;
        disable: () => void;
        isDisabled: () => boolean;
    };
    /** API for managing component lifecycle */
    lifecycle?: {
        destroy: () => void;
    };
}
/** Tabs component interface */
export interface TabsComponent {
    /** Container element */
    element: HTMLElement;
    /**
 * Gets a class name with the component's prefix
 * @param name
 */
    getClass: (name: string) => string;
    /**
 * Creates and adds a new tab to the tabs component
 * @param config
 */
    addTab: (config: TabConfig) => TabComponent;
    /**
 * Adds a pre-created tab to the tabs component
 * @param tab
 */
    add: (tab: TabComponent) => TabsComponent;
    /** Gets all tabs in the container */
    getTabs: () => TabComponent[];
    /** Gets the active tab */
    getActiveTab: () => TabComponent | null;
    /** Reads the current model value without changing selection. */
    getValue: () => string | null;
    /** Gets the indicator component */
    getIndicator?: () => TabIndicator;
    /**
 * Sets a tab as active.
 * @param tabOrValue
 */
    setActiveTab: (tabOrValue: TabComponent | string) => TabsComponent;
    /**
 * Removes a tab from the container
 * @param tabOrValue
 */
    removeTab: (tabOrValue: TabComponent | string) => TabsComponent;
    /**
 * Adds an event listener.
 * @param event
 * @param handler
 */
    on: <K extends keyof TabsEvents>(event: K, handler: TabsEvents[K]) => TabsComponent;
    /**
 * Removes an event listener
 * @param event
 * @param handler
 */
    off: <K extends keyof TabsEvents>(event: K, handler: TabsEvents[K]) => TabsComponent;
    /**
 * Emit one of the group's own events ({@link TabsEvents}), with its payload: the names and payloads `on` and `off` accept.
 * @param event
 * @param data
 */
    emit?<K extends keyof TabsEvents>(event: K, data: Parameters<TabsEvents[K]>[0]): this;
    /** Destroys the tabs component and all tabs */
    destroy: () => void;
    /** Activation handler shared by the component's click and keyboard paths. */
    handleTabClick: (event: Event | null, tab: TabComponent) => void;
    /** Scroll container owned by the scrollable feature. */
    scrollContainer?: HTMLElement;
}
