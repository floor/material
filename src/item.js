'use strict'

// import Component from './component';
import merge from './module/merge'
import insert from './component/insert'
import css from './module/css'
// import bind from '../module/bind';

var defaults = {
  prefix: 'material',
  class: 'item',
  tag: {
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
    // merge options
    this.options = merge(defaults, options || {})

    // define class

    // assign modules
    Object.assign(this, insert)
  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */
  build(options) {
    options = options || this.options

    // define main tag
    var tag = options.tag[options.type] || options.tag.default

    this.wrapper = document.createElement(tag)

    if (options.text) {
      this.set(options.text)
    }

    css.add(this.wrapper, this.options.prefix + '-' + this.options.class)

    if (options.type) {
      css.add(this.wrapper, this.options.class + '-' + options.type)
    }

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
};

export default Item