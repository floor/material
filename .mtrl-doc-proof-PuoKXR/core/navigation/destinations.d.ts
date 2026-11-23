/** One destination, as both components take it. */
export interface DestinationConfig {
    id: string;
    label: string;
    /** Markup (HTML). */
    icon: string;
    /** Markup (HTML). */
    activeIcon?: string;
    href?: string;
    /** A count, a short text, or `true` for the dot */
    badge?: string | number | boolean;
    badgeLabel?: string;
    active?: boolean;
    disabled?: boolean;
}
/** The component's class for a part: `__item`, `__badge`, … */
export type PartClass = (part: string) => string;
/** A copy of the items with unique ids, labels and icons, and one active at most. */
export declare const copyDestinations: <T extends DestinationConfig>(items: T[], component: string) => T[];
/** Shows, updates or removes the item's badge, and names the destination with it. */
export declare const updateBadge: (item: DestinationConfig, element: HTMLElement, cls: PartClass) => void;
/** The destination's element: a link or a button, its indicator, icon, label and badge. */
export declare const createDestination: (item: DestinationConfig, cls: PartClass) => HTMLElement;
/** Marks the active destination, and shows its active icon. */
export declare const updateSelection: (items: DestinationConfig[], nodes: Map<string, HTMLElement>, cls: PartClass) => void;
/** Moves focus between the enabled destinations: `next` and `previous` are the arrow keys of the component's axis, Home and End go to the ends. */
export declare const moveDestinationFocus: (event: KeyboardEvent, nodes: Map<string, HTMLElement>, container: HTMLElement, keys: {
    next: string;
    previous: string;
}) => boolean;
