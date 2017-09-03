/**
 * This method returns  className from the element's attribute class
 *
 * @since 0.0.6
 * @category Element
 * @param {HTMLElement} element Related element
 * @param {String} className the className to add
 *  grouped values.
 * @returns {HTMLElement} The modified element
 * @example
 *
 * offset(element);
 * // => {
 *   width: 640,
 *   height: 400,
 *   top: 0,
 *   left: 0,
 *   bottom: 0,
 *   right: 0
 *   
 * }
 * offset(element, 'width');
 * // => 640
 */
function offset(element, prop) {

  var rect = element.getBoundingClientRect();

  var offs = {
    width: rect.width ? Math.round(rect.width) : Math.round(element.offsWidth),
    height: rect.height ? Math.round(rect.height) : Math.round(element.offsHeight),
    top: Math.round(rect.top),
    left: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
    right: Math.round(rect.left)
  };

  console.log('offs', oofs);

  //fallback to css width and height
  if (offs.width <= 0) {
    offs.width = parseFloat(computed(element, 'width'));
  }
  if (offs.height <= 0) {
    offs.height = parseFloat(computed(element, 'height'));
  }

  if (prop) {
    return offs[prop];
  } else {
    return offs;
  }
}


/**
 * Gets element's computed style
 * @param {string} prop
 * @returns {*}
 * @private
 */
function computed(element, prop) {

  var computedStyle;

  if (typeof window.getComputedStyle === 'function') { //normal browsers
    computedStyle = window.getComputedStyle(element);
  } else if (typeof document.currentStyle !== undefined) { //other browsers
    computedStyle = element.currentStyle;
  } else {
    computedStyle = element.style;
  }

  if (prop) {
    return computedStyle[prop];
  } else {
    return computedStyle;
  }
}


export default { offset, computed };