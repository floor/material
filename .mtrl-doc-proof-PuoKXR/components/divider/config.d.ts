/** Configuration options for divider components Controls the appearance, orientation, and behavior of Material Design 3 dividers. */
export interface DividerConfig {
    /** CSS class prefix (defaults to 'mtrl') */
    prefix?: string;
    /** CSS class to add to the divider Additional classes for custom styling needs. */
    class?: string | string[];
    /**
 * Orientation of the divider
 * @default 'horizontal'
 */
    orientation?: 'horizontal' | 'vertical';
    /**
 * Variant of the divider Controls how the divider is inset within its container: - 'full-width': Spans the entire width/height (default) - 'inset': Adds space at the start (left for horizontal, top for vertical) - 'middle-inset': Adds space at both start and end Most commonly used in lists to align dividers with text content.
 * @default 'full-width'
 */
    variant?: 'full-width' | 'inset' | 'middle-inset';
    /**
 * Custom inset value (left margin for horizontal, top margin for vertical) Overrides the default inset spacing at the start of the divider.
 * @default 16 for 'inset' and 'middle-inset' variants, 0 for full-width
 */
    insetStart?: number;
    /**
 * Custom inset end value (right margin for horizontal, bottom margin for vertical) Overrides the default inset spacing at the end of the divider.
 * @default 0 for 'inset' and full-width, 16 for 'middle-inset'
 */
    insetEnd?: number;
    /** Color of the divider Sets a custom color for the divider. */
    color?: string;
    /**
 * Thickness of the divider in pixels Controls the thickness (height for horizontal, width for vertical) of the divider.
 * @default 1
 */
    thickness?: number;
    /** Used internally for component composition */
    componentName?: string;
}
/** Default configuration for dividers */
export declare const defaultConfig: Partial<DividerConfig>;
/**
 * Creates a base configuration object for divider Merges user-provided configuration with default values and ensures all required properties have values.
 * @param config
 */
export declare const createBaseConfig: (config?: DividerConfig) => DividerConfig;
