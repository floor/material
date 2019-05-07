
/**
 * Class Element
 * @class
 * @since 0.0.1
 * @example
 * var div = new Element({
 *   tag: 'div',
 *   class: 'mydiv',
 * })
 */
class Element {
  /**
   * The init method of the Button class
   * @param  {Object} The element attributes
   * @private
   * @return {DOMElement} The dom element
   */
  constructor (options) {
    var element = document.createElement(options.tag || 'div')

    delete options.tag

    for (var property in options) {
      if (options.hasOwnProperty(property)) {
        element.setAttribute(property, options[property])
      }
    }

    return element
  }
}

export default Element
