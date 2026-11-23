import { ElementComponent } from "../../core/compose/index.js";
/** Top App Bar types */
export type TopAppBarType = 'small' | 'medium' | 'large' | 'center';
/**
 * Configuration options for Top App Bar component
 * @deprecated use `AppBarConfig`. Material Design 3 names the component the
 * app bar. Removal in 4.0.
 */
export interface TopAppBarConfig {
    /**
 * Element to use for the container
 * @default 'header'
 */
    tag?: string;
    /**
 * Type of top app bar to display
 * @default 'small'
 */
    type?: TopAppBarType;
    /** Title text to display in the app bar */
    title?: string;
    /**
 * Whether to enable scrolling behavior
 * @default true
 */
    scrollable?: boolean;
    /**
 * Whether to compress medium/large variants to small on scroll
 * @default true
 */
    compressible?: boolean;
    /**
 * Scroll threshold in pixels to trigger the scrolled state
 * @default 4
 */
    scrollThreshold?: number;
    /** Additional CSS classes to apply */
    class?: string;
    /** Called with the new scrolled state when scrolling changes the bar. */
    onScroll?: (scrolled: boolean) => void;
    /**
 * Component prefix for class names
 * @default 'mtrl'
 */
    prefix?: string;
    /** Component name for class generation */
    componentName?: string;
}
/**
 * Top App Bar component interface
 * @deprecated use `AppBarComponent`. Removal in 4.0.
 */
export interface TopAppBarComponent extends ElementComponent {
    /**
 * Sets the title of the top app bar
 * @param title
 */
    setTitle(title: string): this;
    /** Gets the current title */
    getTitle: () => string;
    /**
 * Adds a leading navigation icon or element
 * @param element
 */
    addLeadingElement(element: HTMLElement): this;
    /**
 * Adds a trailing action icon or element
 * @param element
 */
    addTrailingElement(element: HTMLElement): this;
    /**
 * Changes the top app bar type
 * @param type
 */
    setType(type: TopAppBarType): this;
    /**
 * Manually sets the scrolled state
 * @param scrolled
 */
    setScrollState(scrolled: boolean): this;
    /** Gets the headline element */
    getHeadlineElement: () => HTMLElement;
    /** Gets the leading container element */
    getLeadingContainer: () => HTMLElement;
    /** Gets the trailing container element */
    getTrailingContainer: () => HTMLElement;
}
/** The app bar's configuration; the top app bar is the app bar. */
export type AppBarConfig = TopAppBarConfig;
/** The app bar's component; the top app bar is the app bar. */
export type AppBarComponent = TopAppBarComponent;
