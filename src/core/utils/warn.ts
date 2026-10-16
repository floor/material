// Development-only warnings.
//
// The rule for selection components is that a value no option
// carries clears the selection, the same as native `<select>` setting
// `selectedIndex = -1`. Clearing silently is indistinguishable from a typo,
// so it warns -- but only where a warning helps, which is not production.
//
// tsc leaves the environment read intact; a consumer's bundler can replace it.
// Catch missing process/env in raw browser ESM: a diagnostic must not throw.

const isDevelopment = (): boolean => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
};

/**
 * Warns that a value matched no option, once per call.
 *
 * @param component - the component name, as it appears to a consumer
 * @param value - the value that matched nothing
 * @internal
 */
export const warnUnknownValue = (component: string, value: unknown): void => {
  if (!isDevelopment()) return;
  console.warn(`[mtrl] ${component}: no option with value "${String(value)}"`);
};

/**
 * Warns about a use the spec advises against, which still works.
 *
 * @param component - the component name, as it appears to a consumer
 * @param message - what the spec advises
 * @internal
 */
export const warnDev = (component: string, message: string): void => {
  if (!isDevelopment()) return;
  console.warn(`[mtrl] ${component}: ${message}`);
};
