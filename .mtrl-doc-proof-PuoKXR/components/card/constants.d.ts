/** Card variants following Material Design 3 guidelines */
export declare const CARD_VARIANTS: {
    readonly ELEVATED: "elevated";
    readonly FILLED: "filled";
    readonly OUTLINED: "outlined";
};
/** Card elevation levels in Material Design 3 */
export declare const CARD_ELEVATIONS: {
    readonly LEVEL0: 0;
    readonly LEVEL1: 1;
    readonly LEVEL2: 2;
    readonly LEVEL4: 4;
};
/** Card width constants */
export declare const CARD_WIDTHS: {
    readonly SMALL: "344px";
    readonly MEDIUM: "480px";
    readonly LARGE: "624px";
    readonly FULL: "100%";
};
/** Card corner radius options */
export declare const CARD_CORNER_RADIUS: {
    readonly SMALL: "8px";
    readonly MEDIUM: "12px";
    readonly LARGE: "16px";
};
/** Card media aspect ratio options */
export declare const CARD_ASPECT_RATIOS: {
    readonly SQUARE: "1:1";
    readonly STANDARD: "4:3";
    readonly WIDESCREEN: "16:9";
};
/** Card action alignment options */
export declare const CARD_ACTION_ALIGNMENT: {
    readonly START: "start";
    readonly CENTER: "center";
    readonly END: "end";
    readonly SPACE_BETWEEN: "space-between";
};
/** Card media position options */
export declare const CARD_MEDIA_POSITION: {
    readonly TOP: "top";
    readonly BOTTOM: "bottom";
};
/** CSS class names used in the card component */
export declare const CARD_CLASSES: {
    readonly ROOT: "card";
    readonly HEADER: "card__header";
    readonly TITLE: "card__header-title";
    readonly SUBTITLE: "card__header-subtitle";
    readonly AVATAR: "card__header-avatar";
    readonly HEADER_ACTION: "card__header-action";
    readonly CONTENT: "card__content";
    readonly MEDIA: "card__media";
    readonly ACTIONS: "card__actions";
    /** Reserved modifier; draggable currently uses the native attribute. */
    readonly DRAGGABLE: "card--draggable";
    readonly INTERACTIVE: "card--interactive";
    readonly FULL_WIDTH: "card--full-width";
    /** Reserved modifier; clickable currently uses INTERACTIVE. */
    readonly CLICKABLE: "card--clickable";
    readonly LOADING: "card--state-loading";
    readonly EXPANDED: "card--expanded";
    /** Reserved modifier prefix; elevation currently uses styles. */
    readonly ELEVATION_PREFIX: "card--elevation-";
};
