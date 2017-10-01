'use strict'

import merge from './module/merge'
import insert from './component/insert'
import css from './module/css'

var defaults = {
  prefix: 'material',
  class: 'divider',
  tag: 'span'
}

/**
 * The item class is used for example as item list
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
    this.init(options)
    this.build()

    return this
  }

  /**
   * [init description]
   * @param  {?} options [description]
   * @return {?}         [description]
   */
  init(options) {
    options = options || {}
    // merge options
    this.options = merge(defaults, options || {})

    Object.assign(this, insert)
  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */
  build(options) {
    options = options || this.options

    // define main tag

    this.wrapper = document.createElement(this.options.tag)

    css.add(this.wrapper, this.options.prefix + '-' + this.options.class)

    if (options.type) {
      css.add(this.wrapper, this.options.class + '-' + options.type)
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