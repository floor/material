'use strict';

/**
 * Element related methods
 * @module component/element
 */
module.exports = {

  /**
   * create dom element
   * @param  {string} string A simple selector string
   * @return {HTMLElement} The dom element
   */
  createElement(string, document) {
    document = document || window.document;

    var s = this._selectorFragment(string)[0];
    let tag = s.uTag;

    if (!tag) {
      return null;
    }

    var element = document.createElement(tag);
    var id = s.id;
    var classes = s.classes;

    if (id) {
      element.id = id;
    }

    if (classes) {
      element.className = classes.join(" ");
    }

    return element;
  },

  /**
   * an array of simple selector fragment objects from the passed complex selector string
   * @param  {string} selector The complex selector
   * @return {Array} returns an array of simple selector fragment objects
   */
  _selectorFragment(selector) {
    var fragment;
    var result = [];
    var regex = /^\s*([>+~])?\s*([*\w-]+)?(?:#([\w-]+))?(?:\.([\w.-]+))?\s*/;

    if (typeof selector === "string") {
      while (selector) {
        fragment = selector.match(regex);
        if (fragment[0] === "") { // matched no selector
          break;
        }
        result.push({
          rel: fragment[1],
          uTag: (fragment[2] || "").toUpperCase(),
          id: fragment[3],
          classes: (fragment[4]) ? fragment[4].split(".") : undefined
        });
        selector = selector.substring(fragment[0].length);
      }
    }

    return result;
  }
};
