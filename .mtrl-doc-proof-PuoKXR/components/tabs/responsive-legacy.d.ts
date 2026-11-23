import { TabsComponent } from "./types.js";
/** Breakpoints for responsive behavior */
export declare const RESPONSIVE_BREAKPOINTS: {
    /** Small screens (mobile) */
    SMALL: number;
    /** Medium screens (tablet) */
    MEDIUM: number;
    /** Large screens (desktop) */
    LARGE: number;
};
/** Configuration for responsive behavior */
export interface ResponsiveConfig {
    /** Whether to enable responsive behavior */
    responsive?: boolean;
    /** Options for small screens */
    smallScreen?: {
        /**
 * Layout below the small breakpoint: `icon-only` hides the labels of tabs that have an icon (the label still names the tab), `text-only` hides the icons of tabs that have a label, `icon-and-text` keeps every tab as built.
 * @default 'icon-only'
 */
        layout?: 'icon-only' | 'text-only' | 'icon-and-text';
    };
    /** Breakpoints. */
    breakpoints?: {
        small?: number;
        medium?: number;
        large?: number;
    };
}
/**
 * Enhances tabs with responsive behavior.
 * @deprecated Pass `tabsResponsive(config)` from
 * `material/components/tabs/responsive` as createTabs's `responsive` option
 * instead: it takes this configuration and applies this behaviour. This
 * function keeps working in 3.x and is removed in 4.0.
 * @param tabs
 * @param config
 */
export declare const setupResponsiveBehavior: (tabs: TabsComponent, config?: ResponsiveConfig) => void;
