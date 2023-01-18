import emitter from '../module/emitter'
import attach from '../module/attach'

import dataset from '../view/dataset'

var defaults = {
  class: 'loading',
  tag: 'div',
  delay: 1000,
  type: 'indeterminate',
  circular: `<svg class="progress" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
      <circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
    </svg>`
}

/**
 * The class represents an item ie for list
 *
 * @class
 * @return {Object} The class instance
 * @example new Item(object);
 */
class Loading {
  static isComponent () {
    return true
  }

  /**
   * init
   * @return {Object} The class options
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, emitter, attach)
    // console.log('options', options)

    this.init()

    return this
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   * @return {Object} The class instance
   */
  init () {
    this.build()
    // this.setup()
    // this.attach()

    if (this.options.container) {
      this.append(this.options.container)
    }

    return this
  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */
  build (options) {
    this.root = document.createElement(this.options.tag)
    this.classify()

    if (this.options.type === 'circular') {
      this.root.innerHTML = this.options.circular
    } if (this.options.type === 'indeterminate') {
      this.bar = document.createElement(this.options.tag)
      this.bar.classList.add('bar')
      this.root.classList.add('type-indeterminate')
      this.root.appendChild(this.bar)
    }

    return this
  }

  classify () {
    if (this.options.class !== 'loading') {
      this.root.setAttribute('class', this.options.class + ' ' + this.options.class)
    } else {
      this.root.classList.add(this.options.class)
    }
  }

  append (container) {
    container = container || this.options.container
    if (this.options.container) {
      container.appendChild(this.root)
    }
  }

  set (progress) {
    this.bar.setAttribute('style', 'width: ' + progress)
  }

  show (delay) {
    delay = delay || this.options.delay

    clearTimeout(this.showTimeout)
    this.showTimeout = setTimeout(() => {
      this.root.classList.add('show')
    }, this.options.delay)

    this.visible = true

    return this
  }

  showNow () {
    this.root.classList.add('show')

    this.visible

    return this
  }

  hide () {
    clearTimeout(this.showTimeout)
    this.root.classList.remove('show')
    this.visible = false
    return this
  }
};

export default Loading
