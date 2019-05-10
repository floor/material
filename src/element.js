
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
  static isElement () {
    return true
  }
  /**
   * The init method of the Button class
   * @param  {Object} The element attributes
   * @private
   * @return {DOMElement} The dom element
   */
  constructor (options) {
    //  console.log('Element options', options)
    var element = document.createElement(options.tag || 'div')

    delete options.tag

    for (var property in options) {
      if (options.hasOwnProperty(property)) {
        element.setAttribute(property, options[property])
      }
    }

    if (options.html) {
      element.innerHTML = options.html
    }

    if (options.text) {
      element.textContent = options.text
    }

    return element
  }
}

export default Element
