'use strict'

import insert from './component/insert'
import css from './module/css'

var defaults = {
  prefix: 'material',
  class: 'divider',
  tag: 'span'
}

/**
 * this class component represent an divider usually in a list
 *
 * @class
 * @extends {Component}
 * @return {Object} The class instance
 * @example new Item(object);
 */
class Divider {
  /**
   * init
   * @return {Object} The class options
   */
  constructor(options) {
    this.options = Object.assign({}, defaults, options || {})
    this.init(options)
    this.build()

    return this
  }

  /**
   * [init description]
   * @param  {?} options [description]
   * @return {?}         [description]
   */
  init() {
    // merge options

    Object.assign(this, insert)
  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */
  build() {
    // define main tag

    this.wrapper = document.createElement(this.options.tag)

    css.add(this.wrapper, this.options.prefix + '-' + this.options.class)

    if (this.options.type) {
      css.add(this.wrapper, this.options.class + '-' + this.options.type)
    }

    if (this.options.text) {
      this.wrapper.textContent = this.options.text
    }

    if (this.options.container) {
      this.insert(this.options.container)
    }
  }
}

export default Divider