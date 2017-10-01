'use strict'

import merge from './module/merge'
import create from './element/create'
import css from './module/css'
import insert from './element/insert'
import emitter from './module/emitter'

const defaults = {
  prefix: 'material',
  class: 'container',
  type: null,
  element: {
    tag: 'span',
    type: null
  }
}

/**
 * Class representing a UI Container. Can add components.
 *
 * @extends Component
 * @return {parent} The class instance
 * @example new Container({
 *   container: document.body
 * });
 */
class Container {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    // init and build
    this.init(options)
    this.build()

    if (this.options.bind) {
      this.bind(this.options.bind)
    }

    return this
  }

  /**
   * Init class
   * @params {Object} options The instance options
   * @return {Object} This class instance
   */
  init (options) {
    // init options and merge options to defaults
    options = options || {}
    this.options = merge(defaults, options || {})

    this.options.name = this.options.name

    // implement modules
    Object.assign(this, emitter)

    // this.controller = controller;

    return this
  }

  /**
   * [build description]
   * @return {Object} This class  instance
   */
  build (props) {
    var tag = this.options.tag || 'div'

    this.wrapper = create(tag, this.options.prefix + '-' + this.options.class)

    if (this.options.name) {
      css.add(this.wrapper, this.options.class + '-' + this.options.name)
    }

    if (this.options.css) {
      css.add(this.wrapper, this.options.css)
    }

    if (this.options.container) {
      // console.log(this.options.name, opts.container);
      insert(this.wrapper, this.options.container)
    }

    return this
  }

  insert (container, context) {
    insert(this.wrapper, container, context)
    return this
  }
}

export default Container
