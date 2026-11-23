import type { BaseComponentConfig } from "../../core/config/component.js";
/** A primary destination. */
export interface NavigationRailItemConfig {
    id: string;
    label: string;
    /** Markup (HTML). */
    icon: string;
    /** Markup (HTML). */
    activeIcon?: string;
    href?: string;
    badge?: string | number | boolean;
    /** Accessible description for a dot badge or count, e.g. */
    badgeLabel?: string;
    active?: boolean;
    disabled?: boolean;
}
export interface NavigationRailSelectEvent {
    id: string;
    /** The id again, as the `value` of the `<m-navigation-rail>` element's `change` */
    value: string;
    index: number;
    originalEvent: MouseEvent;
}
export interface NavigationRailEvents {
    select: NavigationRailSelectEvent;
    expand: {
        expanded: true;
    };
    collapse: {
        expanded: false;
    };
}
/** Standalone, non-modal M3 Expressive navigation rail. */
export interface NavigationRailConfig extends BaseComponentConfig {
    items?: NavigationRailItemConfig[];
    expanded?: boolean;
    /** Standard rail occupies layout space; modal expansion uses a native modal dialog. */
    layout?: 'standard' | 'modal';
    /** Hide the standard rail when collapsed. */
    hideWhenCollapsed?: boolean;
    /** Expanded width in CSS pixels, clamped to the Android token range 220–360. */
    expandedWidth?: number;
    /** Show the accessible expand/collapse menu button. */
    showToggle?: boolean;
    expandLabel?: string;
    collapseLabel?: string;
    /** Menu button icon while collapsed. */
    expandIcon?: string;
    /** Menu button icon while expanded. */
    collapseIcon?: string;
    /** Optional application-owned header, such as a FAB. */
    header?: HTMLElement;
    ripple?: boolean;
    /** `select` listener registered at creation. */
    onSelect?: (event: NavigationRailEvents["select"]) => void;
    /** `expand` listener registered at creation. */
    onExpand?: (event: NavigationRailEvents["expand"]) => void;
    /** `collapse` listener registered at creation. */
    onCollapse?: (event: NavigationRailEvents["collapse"]) => void;
}
export interface NavigationRailComponent {
    element: HTMLElement;
    getClass: (name: string) => string;
    expand: () => NavigationRailComponent;
    collapse: () => NavigationRailComponent;
    toggle: () => NavigationRailComponent;
    isExpanded: () => boolean;
    setActive: (id: string | null) => NavigationRailComponent;
    getActive: () => string | null;
    /** Reads the current model value without changing selection. */
    getValue: () => string | null;
    setItems: (items: NavigationRailItemConfig[]) => NavigationRailComponent;
    getItems: () => NavigationRailItemConfig[];
    setBadge: (id: string, badge: NavigationRailItemConfig['badge'], label?: string) => NavigationRailComponent;
    on: <K extends keyof NavigationRailEvents>(event: K, handler: (detail: NavigationRailEvents[K]) => void) => NavigationRailComponent;
    off: <K extends keyof NavigationRailEvents>(event: K, handler: (detail: NavigationRailEvents[K]) => void) => NavigationRailComponent;
    destroy: () => void;
    lifecycle: {
        destroy: () => void;
    };
}
/** Registers NavigationRailConfig with the global defaults map, so `setComponentDefaults("navigation-rail", ...)` is typed without core importing anything from this component. */
declare module "../../core/config/global" {
    interface ComponentConfigMap {
        "navigation-rail"?: Partial<NavigationRailConfig>;
    }
}
