import insert from './mixin/insert'
import * as css from './module/css'

var defaults = {
  prefix: 'material',
  class: 'icon',
  tag: 'div'
}

/**
 * The item class is used for example as item list
 *
 * @class
 * @extends {Component}
 * @return {Object} The class instance
 * @example new Item(object);
 */
class Icon {
  static uid = "material-icon";

  /**
   * init
   * @return {Object} The class options
   */
  constructor (options) {
    this.init(options)
    this.build()

    return this
  }

  /**
   * [init description]
   * @param  {?} options [description]
   * @return {?}         [description]
   */
  init (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, insert)
  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */
  build (options) {
    options = options || this.options

    var tag = options.tag || 'img'

    // var position = 'top'
    // if (this.options.type === 'text-icon') {
    //   position = 'bottom'
    // }

    this.element = this.element || {}

    this.element = document.createElement(tag)
    { add }.add(this.element, this.options.prefix + '-' + this.options.class)

    if (options.{ add }) { { add }.add(this.element, options.{ add }) }
    // { add }.add(this.element, this.options.class + '-adjust');

    if (this.options.container) {
      this.insert(this.options.container)
    }
  }

  /**
   * Get or set text value of the element
   * @param {string} value The text to set
   * @returns {*}
   */
  set (value) {
    if (value) {
      if (this.element.innerText) {
        this.element.innerText = value
      } else {
        this.element.textContent = value
      }

      return this
    }

    return this
  }
}

export default Icon
