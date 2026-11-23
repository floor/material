export const THEME_ROLES = [
    "error", "on-error", "error-container", "on-error-container",
    "primary", "on-primary", "primary-container", "on-primary-container",
    "secondary", "on-secondary", "secondary-container", "on-secondary-container",
    "tertiary", "on-tertiary", "tertiary-container", "on-tertiary-container",
    "primary-fixed", "primary-fixed-dim", "on-primary-fixed", "on-primary-fixed-variant",
    "secondary-fixed", "secondary-fixed-dim", "on-secondary-fixed", "on-secondary-fixed-variant",
    "tertiary-fixed", "tertiary-fixed-dim", "on-tertiary-fixed", "on-tertiary-fixed-variant",
    "surface", "surface-dim", "surface-bright", "surface-variant",
    "surface-container-lowest", "surface-container-low", "surface-container",
    "surface-container-high", "surface-container-highest",
    "on-surface", "on-surface-variant",
    "outline", "outline-variant", "shadow", "scrim",
    "inverse-surface", "inverse-on-surface", "inverse-primary",
];
const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const HEX = /^#([0-9a-f]{6})$/i;
const mode = (roles, name, prefix) => {
    const byRole = new Map();
    for (const [key, value] of Object.entries(roles))
        byRole.set(kebab(key), value);
    const tokens = {};
    for (const role of THEME_ROLES) {
        const hex = byRole.get(role);
        if (hex === undefined)
            throw new Error(`schemeToTokens: ${name} scheme has no ${role}`);
        if (!HEX.test(hex))
            throw new Error(`schemeToTokens: ${name} ${role} is not #rrggbb: ${hex}`);
        tokens[`--${prefix}-sys-color-${role}`] = hex.toLowerCase();
    }
    return tokens;
};
export const schemeToTokens = (schemes, options = {}) => {
    const prefix = options.prefix ?? "mtrl";
    return { light: mode(schemes.light, "light", prefix), dark: mode(schemes.dark, "dark", prefix) };
};
