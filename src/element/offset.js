'use strict';

/**
 * Element style related methods
 * @module component/style
 */
var style = require("./style");

module.exports = (element, prop) => {

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
    offs.width = parseFloat(style.get(element, 'width'));
  }
  if (offs.height <= 0) {
    offs.height = parseFloat(style.get(element, 'height'));
  }

  if (prop) {
    return offs[prop];
  } else {
    return offs;
  }
};
