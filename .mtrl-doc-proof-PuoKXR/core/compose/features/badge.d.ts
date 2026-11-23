import { BaseComponent, ElementComponent } from "../component.js";
import type { BadgeComponent as Badge } from "../../../components/badge/types.js";
/** Configuration for badge feature */
export interface BadgeConfig {
    /** Badge content to display */
    badge?: string | number;
    /** Custom badge configuration */
    badgeConfig?: {
        variant?: string;
        color?: string;
        size?: string;
        position?: string;
        max?: number;
    };
    /** CSS class prefix */
    prefix?: string;
}
/** Component with badge capabilities */
export interface BadgeComponent extends BaseComponent {
    /** Badge component instance */
    badge?: Badge;
}
/**
 * Adds badge functionality to a component
 * @param config
 */
export declare const withBadge: <T extends BadgeConfig & object>(config: T) => <C extends ElementComponent>(component: C) => C & BadgeComponent;
