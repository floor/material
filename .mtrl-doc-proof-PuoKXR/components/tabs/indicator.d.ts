import { TabComponent } from "./types.js";
/** Configuration for tab indicator */
export interface TabIndicatorConfig {
    /** Height of the indicator in pixels */
    height?: number;
    /** Width strategy - fixed size or dynamic based on tab width */
    widthStrategy?: 'fixed' | 'dynamic' | 'content' | 'auto';
    /** Fixed width in pixels when using fixed strategy */
    fixedWidth?: number;
    /** Animation duration in milliseconds */
    animationDuration?: number;
    /** Animation timing function */
    animationTiming?: string;
    /** Whether to show the indicator */
    visible?: boolean;
    /** CSS class prefix */
    prefix?: string;
    /** Custom color for the indicator */
    color?: string;
    /** Tabs variant (primary or secondary) */
    variant?: string;
}
/** Tab indicator API */
export interface TabIndicator {
    /** The indicator DOM element */
    element: HTMLElement;
    /** Move the indicator to a specific tab */
    moveToTab: (tab: TabComponent, immediate?: boolean) => void;
    /** Show the indicator */
    show: () => void;
    /** Hide the indicator */
    hide: () => void;
    /** Set indicator color */
    setColor: (color: string) => void;
    /** Update indicator position (e.g. */
    update: () => void;
    /** Destroy the indicator and clean up */
    destroy: () => void;
}
/**
 * Creates a tab indicator component
 * @param config
 */
export declare const createTabIndicator: (config?: TabIndicatorConfig) => TabIndicator;
