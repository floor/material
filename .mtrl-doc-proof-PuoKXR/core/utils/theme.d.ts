type ThemeChangeCallback = () => void;
/**
 * Register a callback to be notified of theme changes
 * @param callback
 */
export declare const onThemeChange: (callback: ThemeChangeCallback) => (() => void);
/**
 * Gets a theme color from CSS variables, with optional alpha/opacity support.
 * @param varName
 */
export declare function getThemeColor(varName: string, options?: {
    alpha?: number;
    fallback?: string;
    element?: Element | null;
    onThemeChange?: ThemeChangeCallback;
}): string;
export {};
