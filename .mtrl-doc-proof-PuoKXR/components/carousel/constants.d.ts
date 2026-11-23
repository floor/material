/** Material 3 carousel layouts (m3.material.io carousel specs) */
export declare const CAROUSEL_VARIANTS: {
    /** At least one large, one medium and one small item; the default */
    readonly MULTI_BROWSE: "multi-browse";
    /** Items keep one size and run off the trailing edge */
    readonly UNCONTAINED: "uncontained";
    /** One large item and a small preview of the next */
    readonly HERO: "hero";
    /** One large item centred between two small ones */
    readonly HERO_CENTER: "hero-center";
    /** One edge-to-edge item at a time, scrolling vertically */
    readonly FULL_SCREEN: "full-screen";
};
export declare const CAROUSEL_EVENTS: {
    /** The snapped item changed; detail carries the index */
    readonly CHANGE: "change";
};
/** Defaults from the Compose Material 3 carousel (CarouselDefaults) and the carousel specs: 8dp between items, 16dp container padding, 28dp corners, small items between 40 and 56dp, 10dp anchors just outside the container. */
export declare const CAROUSEL_DEFAULTS: {
    readonly VARIANT: "multi-browse";
    /** Preferred width of a large item; hero layouts use it as a maximum */
    readonly ITEM_WIDTH: 280;
    readonly GAP: 8;
    /** Full-screen layouts space items 16dp apart */
    readonly GAP_FULL_SCREEN: 16;
    readonly PADDING: 16;
    readonly CORNER_RADIUS: 28;
    readonly MIN_SMALL_ITEM_WIDTH: 40;
    readonly MAX_SMALL_ITEM_WIDTH: 56;
    readonly ANCHOR_SIZE: 10;
    readonly MEDIUM_LARGE_THRESHOLD: 0.85;
    readonly INITIAL_SLIDE: 0;
};
