'use strict';

module.exports = {
  /**
   * Returns current coordinates of the element,
   * relative to the document
   *
   * @param {HTMLElement} element
   * @returns {*}
   */
  offset(element, prop) {

    var rect = element.getBoundingClientRect();

    var offs = {
      top: Math.round(rect.top),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      width: rect.width ? Math.round(rect.width) : Math.round(element.offsWidth),
      height: rect.height ? Math.round(rect.height) : Math.round(element.offsHeight)
    };

    //fallback to css width and height
    if (offs.width <= 0) {
      offs.width = parseFloat(this._getComputedStyle(element, 'width'));
    }
    if (offs.height <= 0) {
      offs.height = parseFloat(this._getComputedStyle(element, 'height'));
    }

    if (prop) {
      return offs[prop];
    } else {
      return offs;
    }
  },


  /**
   * Gets element's computed style
   * @param {string} prop
   * @returns {*}
   * @private
   */
  _getComputedStyle(element, prop) {

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
  },
};
