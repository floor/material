/** M3 colour roles to mtrl's colour tokens. */
/** The colour roles a theme sets: the baseline theme's, in its order. */
export declare const THEME_ROLES: readonly [
    "error",
    "on-error",
    "error-container",
    "on-error-container",
    "primary",
    "on-primary",
    "primary-container",
    "on-primary-container",
    "secondary",
    "on-secondary",
    "secondary-container",
    "on-secondary-container",
    "tertiary",
    "on-tertiary",
    "tertiary-container",
    "on-tertiary-container",
    "primary-fixed",
    "primary-fixed-dim",
    "on-primary-fixed",
    "on-primary-fixed-variant",
    "secondary-fixed",
    "secondary-fixed-dim",
    "on-secondary-fixed",
    "on-secondary-fixed-variant",
    "tertiary-fixed",
    "tertiary-fixed-dim",
    "on-tertiary-fixed",
    "on-tertiary-fixed-variant",
    "surface",
    "surface-dim",
    "surface-bright",
    "surface-variant",
    "surface-container-lowest",
    "surface-container-low",
    "surface-container",
    "surface-container-high",
    "surface-container-highest",
    "on-surface",
    "on-surface-variant",
    "outline",
    "outline-variant",
    "shadow",
    "scrim",
    "inverse-surface",
    "inverse-on-surface",
    "inverse-primary"
];
export type ThemeRole = (typeof THEME_ROLES)[number];
/** A scheme's colours by role. */
export type SchemeRoles = Record<string, string>;
export interface SchemeToTokensOptions {
    /** The token prefix, as `--{prefix}-sys-color-*`. */
    prefix?: string;
}
/** A theme's declarations: custom property to value, light and dark. */
export interface ThemeTokens {
    light: Record<string, string>;
    dark: Record<string, string>;
}
/** Turns a light and a dark scheme's role colours into a theme's colour tokens. */
export declare const schemeToTokens: (schemes: {
    light: SchemeRoles;
    dark: SchemeRoles;
}, options?: SchemeToTokensOptions) => ThemeTokens;
