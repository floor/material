'use strict'

import create from './element/create'
import classify from './component/classify'
import ripple from './component/ripple'
import emitter from './module/emitter'
import insert from './element/insert'
import attach from './module/attach'

// modules
import control from './component/control'

const defaults = {
  prefix: 'material',
  class: 'button',
  tag: 'button',
  build: [],
  events: [
    ['wrapper.click', '_handleClick']
  ]
}

/**
 * Class acting as a button.
 * @class
 * @since 0.0.1
 * @example
 * var button = new Button({
 *   label: 'Button raised',
 *   type: 'raised',
 *   color: 'primary'
 * }).on('click', function(e) {
 *   console.log('button click', e);
 * }).insert(document.body);
 */
class Button {
  /**
   * The init method of the Button class
   * @param  {Object} options [description]
   * @private
   * @return {Object} The class instance
   */
  constructor (options) {
    this.init(options)
    this.build()
    this.setup()
    this.attach()

    this.emit('ready')

    return this
  }

  /**
   * [init description]
   * @param  {?} options [description]
   * @return {?}         [description]
   */
  init (options) {
    this.options = Object.assign({}, defaults, options || {})

    Object.assign(this, control, emitter, attach, ripple)

    this.element = this.element || {}
    ripple(this)
    this.emit('init')
  }

  /**
   * Build button's method
   * @override
   * @return {void}
   */
  build () {
    this.element = {}

    var tag = this.options.tag || 'div'
    this.wrapper = create(tag)

    classify(this.wrapper, this.options)

    this.options.label = this.options.label || this.options.text

    this.label(this.options.label)
    this.icon(this.options.icon)

    // insert if container options is given
    if (this.options.container) {
      insert(this.wrapper, this.options.container)
    }

    this.emit('built', this.wrapper)

    return this
  }

  /**
   * [insert description]
   * @param  {?} container [description]
   * @param  {?} context   [description]
   * @return {?}           [description]
   */
  insert (container, context) {
    insert(this.wrapper, container, context)

    return this
  }

  /**
   * [setup description]
   * @return {?} [description]
   */
  setup () {
    this.element.input = this.wrapper

    if (this.options.name) {
      // console.log('name', this.options.name);
      this.wrapper.dataset.name = this.options.name
    }

    if (this.options.label) {
      this.wrapper.title = this.options.label
    }


    if (this.options.content) {
      this.wrapper.innerHTML = this.options.content
    }
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   * @return {Object} The class instance
   */
  set (prop, value) {
    switch (prop) {
      case 'disabled':
        this.disable(value)
        break
      case 'value':
        this.setValue(value)
        break
      case 'label':
        this.setLabel(value)
        break
      default:
        this.setValue(prop)
    }

    return this
  }

  /**
   * [_onElementMouseDown description]
   * @param  {event} e
   * @return {void}
   */
  _handleClick (e) {
    e.preventDefault()

    if (this.disabled === true) return
    if (this.options.upload) return

    // this.publish('click');
    this.emit('click', e)

    return this
  }
}

export default Button
