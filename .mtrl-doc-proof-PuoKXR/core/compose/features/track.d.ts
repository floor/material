import { BaseComponent, ElementComponent } from "../component.js";
/** Configuration for track feature */
export interface TrackConfig {
    /** CSS class prefix */
    prefix: string;
    /** Component name for class generation */
    componentName: string;
    /** Custom icon HTML or 'none' */
    icon?: string;
    /** Icon HTML shown in the unselected handle, which then grows to 24dp: M3's "icon on selected and unselected switch" configuration. */
    unselectedIcon?: string;
    /** When true, the thumb graphic is `aria-hidden`. */
    controlLabelOnly?: boolean;
}
/** Component with track and thumb elements */
export interface TrackComponent extends BaseComponent {
    /** Track element */
    track: HTMLElement;
    /** Thumb element */
    thumb: HTMLElement;
}
/**
 * Adds track and thumb elements to a component
 * @param config
 */
export declare const withTrack: <T extends TrackConfig>(config: T) => <C extends ElementComponent>(component: C) => C & TrackComponent;
