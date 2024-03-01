/**
 * Converts a nested object into a flat object with dotted paths as keys.
 *
 * @param {Object} obj - The object to be flattened.
 * @param {string} [base=''] - (Internal use) A prefix used to build the dotted paths. Users typically do not need to provide this.
 * @returns {Object} A new object with the same values as `obj`, but flattened.
 *
 * @example
 * const nested = { a: { b: { c: 1 }, d: 2 }, e: 3 };
 * const flat = dot(nested);
 * // flat is now { 'a.b.c': 1, 'a.d': 2, 'e': 3 }
 *
 * @example
 * // It does not flatten arrays or date objects
 * const complex = { a: [{ b: 1 }, { c: 2 }], d: new Date() };
 * const flatComplex = dot(complex);
 * // flatComplex is now { 'a': [{ b: 1 }, { c: 2 }], 'd': [Date Object] }
 */

const dot = (obj, base = '') => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const newKey = base ? `${base}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, dot(value, newKey))
    } else {
      acc[newKey] = value
    }
    return acc
  }, {})
}

export default dot
