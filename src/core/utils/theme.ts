import { PREFIX } from '../config';

// Store callbacks for theme change notifications
type ThemeChangeCallback = () => void;
const themeChangeCallbacks = new Set<ThemeChangeCallback>();

// Setup theme change observer
let themeObserver: MutationObserver | null = null;

/**
 * Setup observer for theme changes on body element
 */
const setupThemeObserver = (): void => {
  if (themeObserver) return; // Already set up

  themeObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === 'attributes' && 
        (mutation.attributeName === 'data-theme' || mutation.attributeName === 'data-theme-mode')
      ) {
        // Notify all registered callbacks
        themeChangeCallbacks.forEach(callback => callback());
        break;
      }
    }
  });

  // Themes are set with data-theme / data-theme-mode on <html> or on <body>;
  // observe both so a change on either notifies.
  const options = { attributes: true, attributeFilter: ['data-theme', 'data-theme-mode'] };
  themeObserver.observe(document.documentElement, options);
  if (document.body) {
    themeObserver.observe(document.body, options);
  }
};

/**
 * Register a callback to be notified of theme changes
 * @param callback Function to call when theme changes
 * @returns Function to unregister the callback
 */
export const onThemeChange = (callback: ThemeChangeCallback): (() => void) => {
  // Setup observer if not already done
  if (!themeObserver) {
    setupThemeObserver();
  }

  themeChangeCallbacks.add(callback);
  
  // Return function to unregister
  return () => {
    themeChangeCallbacks.delete(callback);
    if (themeChangeCallbacks.size === 0) {
      themeObserver?.disconnect();
      themeObserver = null;
    }
  };
};

const HEX = /^#([\da-f]{6}|[\da-f]{3})$/i;
const RGB_TRIPLET = /^\d+,\s*\d+,\s*\d+$/;

/** '#6750a4' or '#fff' → '103, 80, 164'; anything else → null. */
const hexToTriplet = (value: string): string | null => {
  if (!HEX.test(value)) return null;
  const hex = value.slice(1);
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  return [0, 2, 4].map((i) => parseInt(full.substring(i, i + 2), 16)).join(', ');
};

/** Reads --<prefix>-<name> from the active theme (<body>), then from :root. */
const readVar = (name: string): string => {
  const prefixed = `--${PREFIX}-${name}`;
  const value = getComputedStyle(document.body).getPropertyValue(prefixed).trim();
  return value || getComputedStyle(document.documentElement).getPropertyValue(prefixed).trim();
};

/**
 * Gets a theme color from CSS variables, with optional alpha/opacity support.
 * The prefix is automatically added to the variable name.
 * Colors are retrieved from the active theme (defined on body element) if available,
 * falling back to the default theme (defined on :root) if not found.
 *
 * @param {string} varName - The CSS variable name without prefix (e.g. 'sys-color-primary')
 * @param {object} [options] - Options for color retrieval
 * @param {number} [options.alpha] - Alpha value (0-1): a hex colour is returned as rgba()
 * @param {string} [options.fallback] - Fallback color if variable is not found
 * @param {ThemeChangeCallback} [options.onThemeChange] - Optional callback for theme changes
 * @returns {string} The color value (hex, rgb, or rgba)
 *
 * @deprecated for `-rgb` names only: the themes no longer declare the
 * `--<prefix>-sys-color-*-rgb` twins (FLO-311). `getThemeColor('sys-color-X-rgb')`
 * still returns the `'r, g, b'` triplet, derived from `sys-color-X`, and will be
 * removed in the next major. Read `sys-color-X` (with `alpha` for rgba) instead.
 *
 * @example
 * // Basic usage
 * getThemeColor('sys-color-primary') // '#006493' (from active theme)
 * 
 * // With theme change notification
 * getThemeColor('sys-color-primary', {
 *   onThemeChange: () => {
 *     // Re-render or update component
 *     component.update();
 *   }
 * });
 */
export function getThemeColor(
  varName: string, 
  options?: { 
    alpha?: number, 
    fallback?: string,
    onThemeChange?: ThemeChangeCallback 
  }
): string {
  // Register theme change callback if provided
  if (options?.onThemeChange) {
    onThemeChange(options.onThemeChange);
  }

  let value = readVar(varName);

  // Deprecated: a '-rgb' twin that the theme no longer declares is derived
  // from its colour role, so existing callers keep their 'r, g, b' triplet.
  if (!value && varName.endsWith('-rgb')) {
    value = hexToTriplet(readVar(varName.slice(0, -4))) ?? '';
  }

  // If still not found, use fallback or return empty
  if (!value && options?.fallback) return options.fallback;
  if (!value) return '';

  if (typeof options?.alpha === 'number') {
    // An rgb triplet (e.g. '103, 80, 164') or a hex colour becomes rgba()
    const triplet = RGB_TRIPLET.test(value) ? value : hexToTriplet(value);
    if (triplet) return `rgba(${triplet}, ${options.alpha})`;
  }

  return value;
}

// Cleanup observer when the page goes away. pagehide, not unload: an unload
// listener is deprecated in Chrome, reported as a permissions policy
// violation, and keeps the page out of the back/forward cache.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }
    themeChangeCallbacks.clear();
  });
} 