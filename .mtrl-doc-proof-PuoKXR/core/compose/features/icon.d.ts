import { BaseComponent, ElementComponent } from "../component.js";
/** Icon manager interface */
export interface IconManager {
    /**
 * Sets icon HTML content
 * @param html
 */
    setIcon: (html: string) => IconManager;
    /** Gets current icon HTML content */
    getIcon: () => string;
    /** Gets icon element */
    getElement: () => HTMLElement | null;
}
/** Configuration for icon feature */
export interface IconConfig {
    /** Initial icon HTML content */
    icon?: string;
    /** Icon position ('start' or 'end') */
    iconPosition?: "start" | "end";
    /** Icon size variant */
    iconSize?: string;
    /** CSS class prefix */
    prefix?: string;
    /** Component name for class generation */
    componentName?: string;
    /** Text content (for determining button styling) */
    text?: string | Node;
}
/** Component with icon capabilities */
export interface IconComponent extends BaseComponent {
    /** Icon manager */
    icon: IconManager;
}
/**
 * Adds icon management to a component
 * @param config
 */
export declare const withIcon: <T extends IconConfig & object>(config: T) => <C extends ElementComponent>(component: C) => C & IconComponent;
