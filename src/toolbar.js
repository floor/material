'use strict'

import init from './component/init'
import classify from './component/classify'
import events from './component/events'
import insert from './component/insert'

import create from './element/create'

import attach from './module/attach'
import emitter from './module/emitter'

const defaults = {
  prefix: 'material',
  class: 'toolbar',
  tag: 'div',
  modules: [emitter, events, attach, insert]
}

/**
 * Base class for all ui components
 * @class
 * @param {Object} options - The component options
 * @return {Object} The class Instance
 */

/**
 * Class representing a UI Container. Can add components.
 *
 * @extends Component
 * @return {parent} The class instance
 * @example new Container({
 *   container: document.body
 * });
 */
class Component {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor(options) {
    this.options = Object.assign({}, defaults, options || {})

    init(this)
    this.build()

    this.attach()

    this.emit('ready')

    return this
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build() {
    var tag = this.options.tag || 'div'
    this.wrapper = create(tag, this.options.css)

    classify(this.wrapper, this.options)

    if (this.options.container) {
      this.insert(this.options.container)
    }

    this.emit('built', this.wrapper)

    return this
  }
}

export default Component