/**
 * Utility functions
 * @module module/utils
 */

/**
 * Checks if given value is an array
 * @param {*} object
 * @returns {boolean}
 */
const isArray = (object) => {
  return Object.prototype.toString.call(object) === '[object Array]'
}

/**
 * Checks if JavaScript object is a plain object
 * @param {Object} object
 * @returns {*|boolean}
 */
const isLiteralObject = (object) => {
  return object && typeof object === 'object' && Object.getPrototypeOf(object) === Object.getPrototypeOf({})
}

/**
 * Checks if object is iterable
 * @param {Object} object
 * @returns {boolean}
 */
const isIterable = (object) => {
  return isLiteralObject(object) ||
    isArray(object) ||
    (typeof object === 'object' &&
      object !== null &&
      object.length !== undefined)
}

/**
 *
 * @param {Object} object
 * @param {Function} callback
 */
const each = (object, callback) => {
  if (isArray(object) || (typeof object === 'object' && object.length !== undefined)) {
    for (let i = 0, l = object.length; i < l; i++) {
      callback.apply(object[i], [object[i], i])
    }
    return
  }

  if (isLiteralObject(object)) {
    for (const key in object) {
      callback.apply(object[key], [object[key], key])
    }
  }
}

/**
 * Array.indexOf support
 * @param {Array} array
 * @param {*} obj
 * @returns {number}
 */
const indexOf = (array, obj) => {
  if (Array.prototype.indexOf) {
    return Array.prototype.indexOf.call(array, obj)
  }
  for (let i = 0, j = array.length; i < j; i++) {
    if (array[i] === obj) {
      return i
    }
  }
  return -1
}

export { isArray, isIterable, isLiteralObject, each, indexOf }
