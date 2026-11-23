/** Top App Bar types */
export declare const TOP_APP_BAR_TYPES: {
    /** Small height app bar */
    readonly SMALL: "small";
    /** Medium height app bar */
    readonly MEDIUM: "medium";
    /** Large height app bar */
    readonly LARGE: "large";
    /** Center-aligned app bar */
    readonly CENTER: "center";
};
/** Top App Bar states */
export declare const TOP_APP_BAR_STATES: {
    /** Default state */
    readonly DEFAULT: "default";
    /** Scrolled state */
    readonly SCROLLED: "scrolled";
    /** Fixed state */
    readonly FIXED: "fixed";
};
/** Default configuration values for top app bar */
export declare const TOP_APP_BAR_DEFAULTS: {
    /** Default HTML tag */
    readonly TAG: "header";
    /** Default bar type */
    readonly TYPE: "small";
    /** Whether to enable scrolling behavior */
    readonly SCROLLABLE: true;
    /** Whether to compress medium/large variants on scroll */
    readonly COMPRESSIBLE: true;
    /** Scroll threshold in pixels to trigger scrolled state */
    readonly SCROLL_THRESHOLD: 4;
};
/** CSS class names used by the top app bar component */
export declare const TOP_APP_BAR_CLASSES: {
    /** Root element class */
    readonly ROOT: "top-app-bar";
    /** Small variant class */
    readonly SMALL: "top-app-bar--small";
    /** Medium variant class */
    readonly MEDIUM: "top-app-bar--medium";
    /** Large variant class */
    readonly LARGE: "top-app-bar--large";
    /** Center-aligned variant class */
    readonly CENTER: "top-app-bar--center";
    /** Scrolled state class */
    readonly SCROLLED: "top-app-bar--scrolled";
    /** Fixed state class */
    readonly FIXED: "top-app-bar--fixed";
    /** Row container class */
    readonly ROW: "top-app-bar__row";
    /** Section container class */
    readonly SECTION: "top-app-bar__section";
    /** Leading section class */
    readonly SECTION_LEADING: "top-app-bar__section--leading";
    /** Headline section class */
    readonly SECTION_HEADLINE: "top-app-bar__section--headline";
    /** Trailing section class */
    readonly SECTION_TRAILING: "top-app-bar__section--trailing";
    /** Title element class */
    readonly TITLE: "top-app-bar__title";
};
