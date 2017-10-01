'use strict'

import merge from './module/merge'
import insert from './component/insert'
import css from './module/css'

var defaults = {
  prefix: 'material',
  class: 'image',
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
class Image {
  /**
   * init
   * @return {Object} The class options
   */
  constructor(options) {
    // console.log('text options', options);

    this.options = merge(defaults, options || {})

    this.init()
    this.build()

    return this
  }

  /**
   * [init description]
   * @param  {?} options [description]
   * @return {?}         [description]
   */
  init() {
    Object.assign(this, insert)
  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */
  build(options) {
    options = options || this.options

    var tag = options.tag || 'img'

    this.wrapper = document.createElement(tag)

    if (options.src) {
      this.wrapper.setAttribute('style', 'background-image: url(' + options.src + ')')
    }

    css.add(this.wrapper, this.options.prefix + '-' + this.options.class)

    if (options.css) { css.add(this.wrapper, options.css) }
    // css.add(this.wrapper, this.options.class + '-adjust');

    if (this.options.container) {
      this.insert(this.options.container)
    }
  }

  /**
   * Get or set text value of the element
   * @param {string} value The text to set
   * @returns {*}
   */
  set(value) {
    if (value) {
      if (this.wrapper.innerText) {
        this.wrapper.innerText = value
      } else {
        this.wrapper.textContent = value
      }

      return this
    }

    return this
  }
}

export default Image