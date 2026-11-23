/** The icon registry: app-wide overrides for the glyphs components render, resolved once at component creation. */
import type { IconName, IconOverrides } from "./types.js";
/** Override icons by semantic name. */
export declare const setIcons: (icons: IconOverrides) => void;
/** The application's override for a name, or the component's own built-in. */
export declare const getIcon: (name: IconName, fallback: string) => string;
