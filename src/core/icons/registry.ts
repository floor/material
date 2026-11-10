/**
 * The icon registry: app-wide overrides for the glyphs components render,
 * resolved once at component creation. It imports no glyph — the components
 * keep their own built-in strings and pass them as the fallback.
 */
import type { IconName, IconOverrides } from "./types";

const overrides = new Map<IconName, string>();

/**
 * Override icons by semantic name. Only the keys present are touched; a
 * non-empty string sets that key, and `null`, `undefined` or `""` restores
 * the built-in. Call it once at application start-up, before components or
 * hydration: it is process configuration, not per-render state.
 */
export const setIcons = (icons: IconOverrides): void => {
  for (const name of Object.keys(icons) as IconName[]) {
    const value = icons[name];
    if (typeof value === "string" && value.length > 0) overrides.set(name, value);
    else overrides.delete(name);
  }
};

/** The application's override for a name, or the component's own built-in. */
export const getIcon = (name: IconName, fallback: string): string => overrides.get(name) ?? fallback;
