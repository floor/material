'use strict'

import init from './component/init'
import merge from './module/merge'
import insert from './component/insert'
import classify from './component/classify'
import create from './element/create'
import css from './module/css'

var defaults = {
  prefix: 'material',
  class: 'text',
  modules: [insert],
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
 * this class creates a text component
 *
 * @since 0.0.6
 * @category Element
 * @param {HTMLElement} element Related element
 * @param {String} className the className to add
 *  grouped values.
 * @returns {HTMLElement} The modified element
 * @example
 *
 * var text = new Text({
 *   text: 'hello',
 *   type: 'title'
 * }).insert(document.body);
 *
 * // => Hello
 */
class Text {
  /**
   * init
   * @return {Object} The class options
   */
  constructor (options) {
    this.options = merge(defaults, options || {})

    init(this)
    this.build(this.options)

    return this
  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */
  build (options) {
    options = options || this.options

    var tag = options.tag[options.type] || options.tag.default

    this.wrapper = create(tag, options.prefix + '-' + options.class)

    classify(this.wrapper, this.options)

    if (options.text) {
      this.set(options.text)
    }

    if (options.type) { css.add(this.wrapper, options.class + '-' + options.type) }

    if (options.container) {
      this.insert(options.container)
    }
    return this
  }

  /**
   * Get or set text value of the element
   * @param {string} value The text to set
   * @returns {*}
   */
  set (value) {
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

export default Text
