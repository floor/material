// src/core/theme/tokens.ts
/**
 * M3 colour roles to mtrl's colour tokens (FLO-308).
 *
 * One function turns a scheme's role colours into the `--mtrl-sys-color-*`
 * declarations a theme sets, light and dark. The theme generator
 * (`scripts/generate-themes.ts`) calls it with material-color-utilities'
 * output, and md3.io's theme builder calls it the same way, so a theme made on
 * the site and a theme shipped in the package cannot drift. It has no
 * dependency: the colour science stays in the caller.
 *
 * @module core/theme
 */

/**
 * The colour roles a theme sets: the baseline theme's, in its order. Every
 * generated theme declares exactly these (a test holds the list to baseline).
 */
export const THEME_ROLES = [
  "error", "on-error", "error-container", "on-error-container",
  "primary", "on-primary", "primary-container", "on-primary-container",
  "secondary", "on-secondary", "secondary-container", "on-secondary-container",
  "tertiary", "on-tertiary", "tertiary-container", "on-tertiary-container",
  "surface", "surface-dim", "surface-bright",
  "surface-container-lowest", "surface-container-low", "surface-container",
  "surface-container-high", "surface-container-highest",
  "on-surface", "on-surface-variant",
  "outline", "outline-variant", "shadow", "scrim",
  "inverse-surface", "inverse-on-surface", "inverse-primary",
] as const;

export type ThemeRole = (typeof THEME_ROLES)[number];

/**
 * A scheme's colours by role. Keys are the M3 role names, kebab-case
 * (`primary-container`) or camelCase as material-color-utilities spells them
 * (`primaryContainer`); values are `#rrggbb` hex strings.
 */
export type SchemeRoles = Record<string, string>;

export interface SchemeToTokensOptions {
  /** The token prefix, as `--{prefix}-sys-color-*`. Default `mtrl`. */
  prefix?: string;
  /**
   * Also emit each role's `-rgb` twin (`r, g, b`), as the shipped themes do
   * for now. Default true.
   */
  rgb?: boolean;
}

/** A theme's declarations: custom property to value, light and dark. */
export interface ThemeTokens {
  light: Record<string, string>;
  dark: Record<string, string>;
}

const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const HEX = /^#([0-9a-f]{6})$/i;

const channels = (hex: string): string => {
  const value = parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
};

const mode = (roles: SchemeRoles, name: "light" | "dark", prefix: string, rgb: boolean): Record<string, string> => {
  const byRole = new Map<string, string>();
  for (const [key, value] of Object.entries(roles)) byRole.set(kebab(key), value);
  const tokens: Record<string, string> = {};
  for (const role of THEME_ROLES) {
    const hex = byRole.get(role);
    if (hex === undefined) throw new Error(`schemeToTokens: ${name} scheme has no ${role}`);
    if (!HEX.test(hex)) throw new Error(`schemeToTokens: ${name} ${role} is not #rrggbb: ${hex}`);
    tokens[`--${prefix}-sys-color-${role}`] = hex.toLowerCase();
    // Light surface-rgb carries on-surface's channels, as in baseline: a
    // workaround disabled buttons once read. Dark carries its own.
    const twin = role === "surface" && name === "light" ? byRole.get("on-surface") ?? hex : hex;
    if (rgb) tokens[`--${prefix}-sys-color-${role}-rgb`] = channels(twin);
  }
  return tokens;
};

/**
 * Turns a light and a dark scheme's role colours into a theme's colour
 * tokens. Every role in {@link THEME_ROLES} must be present in both.
 *
 * @example
 * const tokens = schemeToTokens({ light, dark });
 * tokens.light["--mtrl-sys-color-primary"]; // "#6750a4"
 */
export const schemeToTokens = (
  schemes: { light: SchemeRoles; dark: SchemeRoles },
  options: SchemeToTokensOptions = {},
): ThemeTokens => {
  const prefix = options.prefix ?? "mtrl";
  const rgb = options.rgb ?? true;
  return { light: mode(schemes.light, "light", prefix, rgb), dark: mode(schemes.dark, "dark", prefix, rgb) };
};
