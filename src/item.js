import Layout from './layout'

import create from './mixin/create'
import insert from './mixin/insert'

var defaults = {
  prefix: 'material',
  class: 'item',
  type: 'default',
  tag: 'li',
  types: {
    default: 'span',
    display4: 'h1',
    display3: 'h1',
    display2: 'h1',
    display1: 'h1',
    headline: 'h1',
    title: 'h2',
    subheading2: 'h3',
    subheading1: 'h4',
    body: 'p',
    body2: 'aside',
    caption: 'span'
  }
}

/**
 * The class represents an item ie for list
 *
 * @class
 * @return {Object} The class instance
 * @example new Item(object);
 */
class Item {
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
    // merge options
    this.options = Object.assign({}, defaults, options || {})

    // define class

    // assign modules
    Object.assign(this, insert)
  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */
  build () {
    // define main tag
    this.options.tag = this.options.tag || this.options.types[this.options.type]

    this.options.tag = this.options.tag

    this.element = create(this.options)

    if (this.options.text) {
      this.set(this.options.text)
    }

    if (this.options.layout) {
      this.layout = new Layout(this.options.layout, this.element)
    } else {
      if (this.options.container) {
        this.insert(this.options.container)
      }
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

export default Item
