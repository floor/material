// src/core/dom/classes.ts
/**
 * @module core/dom
 * @description DOM manipulation utilities optimized for performance
 */

// These helpers take class names exactly as given. They used to prefix every
// name with `mtrl-`, which meant a consumer's `class: "custom-button"` landed
// as `mtrl-custom-button` and could not be styled by the name they wrote.
// Prefixing belongs to `getClass()`, which internal code already uses at the
// call site.

// Cache for frequently used class combinations to avoid repeated processing
const classCache = new Map<string, string[]>();
const MAX_CACHE_SIZE = 500;

/**
 * Normalize classes to array of unique strings with optimization and caching
 * - String with space-separated classes
 * - Array of strings
 * - Mixed array of strings and space-separated classes
 *
 * @param {...(string | string[])} classes - Classes to normalize
 * @returns {string[]} Array of unique, non-empty class names
 */
export const normalizeClasses = (
  ...classes: (string | string[])[]
): string[] => {
  // Fast path 1: Empty input
  if (classes.length === 0) return [];

  // Fast path 2: Single string without spaces - most common case
  if (classes.length === 1 && typeof classes[0] === "string") {
    const input = classes[0];
    if (!input) return [];
    if (!input.includes(" ")) return [input];

    // Check cache for single string with spaces
    if (classCache.has(input)) {
      return classCache.get(input)!;
    }
  }

  // Optimized processing - single pass with minimal allocations
  const seen = new Set<string>();
  const result: string[] = [];

  for (const cls of classes) {
    if (typeof cls === "string" && cls) {
      // Fast path for single class
      if (!cls.includes(" ")) {
        if (!seen.has(cls)) {
          seen.add(cls);
          result.push(cls);
        }
      } else {
        // Split space-separated classes efficiently
        cls.split(" ").forEach((c) => {
          const trimmed = c.trim();
          if (trimmed && !seen.has(trimmed)) {
            seen.add(trimmed);
            result.push(trimmed);
          }
        });
      }
    } else if (Array.isArray(cls)) {
      // Process array of classes
      cls.forEach((c) => {
        if (typeof c === "string" && c) {
          // Split space-separated classes, same as top-level strings
          c.split(" ").forEach((part) => {
            const trimmed = part.trim();
            if (trimmed && !seen.has(trimmed)) {
              seen.add(trimmed);
              result.push(trimmed);
            }
          });
        }
      });
    }
  }

  // Cache result for single string inputs to avoid repeated processing
  if (
    classes.length === 1 &&
    typeof classes[0] === "string" &&
    result.length <= 10
  ) {
    if (classCache.size < MAX_CACHE_SIZE) {
      classCache.set(classes[0], result);
    }
  }

  return result;
};

// Every normalized token is free of spaces: normalizeClasses splits on them and
// trims each part, and its single-string fast path only returns inputs that do
// not contain one. So each helper only has to apply the token.
const forEachClass = (
  classes: (string | string[])[],
  apply: (name: string) => void,
): void => {
  // Fast path: one string without spaces, the most common call
  if (
    classes.length === 1 &&
    typeof classes[0] === "string" &&
    classes[0] &&
    !classes[0].includes(" ")
  ) {
    apply(classes[0]);
    return;
  }
  for (const name of normalizeClasses(...classes)) apply(name);
};

/**
 * Add prefixed classes to element with optimizations
 * Automatically adds prefix to classes that don't already have it
 * Optimized for minimal DOM interactions and single-class scenarios
 *
 * @param {HTMLElement} element - Target element
 * @param {...(string | string[])} classes - Classes to add
 * @returns {HTMLElement} Modified element for chaining
 */
export const addClass = (
  element: HTMLElement,
  ...classes: (string | string[])[]
): HTMLElement => {
  forEachClass(classes, (name) => element.classList.add(name));
  return element;
};

/**
 * Remove prefixed classes from element with optimizations
 * Handles exact class names as specified with automatic prefixing
 * Optimized for single-class scenarios and batch operations
 *
 * @param {HTMLElement} element - Target element
 * @param {...(string | string[])} classes - Classes to remove
 * @returns {HTMLElement} Modified element for chaining
 */
export const removeClass = (
  element: HTMLElement,
  ...classes: (string | string[])[]
): HTMLElement => {
  forEachClass(classes, (name) => element.classList.remove(name));
  return element;
};

/**
 * Toggle prefixed classes on element with optimizations
 * Automatically adds prefix to classes that don't already have it
 * Optimized for single-class scenarios
 *
 * @param {HTMLElement} element - Target element
 * @param {...(string | string[])} classes - Classes to toggle
 * @returns {HTMLElement} Modified element for chaining
 */
export const toggleClass = (
  element: HTMLElement,
  ...classes: (string | string[])[]
): HTMLElement => {
  forEachClass(classes, (name) => element.classList.toggle(name));
  return element;
};

/**
 * Check if element has all specified prefixed classes with optimizations
 * Automatically adds prefix to classes that don't already have it
 * Returns true only if ALL specified classes are present
 *
 * @param {HTMLElement} element - Target element
 * @param {...(string | string[])} classes - Classes to check
 * @returns {boolean} True if element has all specified classes
 */
export const hasClass = (
  element: HTMLElement,
  ...classes: (string | string[])[]
): boolean => {
  for (const name of normalizeClasses(...classes)) {
    if (!element.classList.contains(name)) return false;
  }
  return true;
};
