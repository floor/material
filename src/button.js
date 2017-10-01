'use strict'

import init from './component/init'
import classify from './component/classify'
import ripple from './component/ripple'
import emitter from './module/emitter'
import create from './element/create'
import css from './module/css'
import merge from './module/merge'
import insert from './element/insert'
import bind from './module/bind'

// modules
import control from './component/control'

const defaults = {
  prefix: 'material',
  class: 'button',
  tag: 'button',
  modules: [control, emitter, bind, ripple],
  build: [],
  bind: {
    'wrapper.click': 'click'
  }
}

/**
 * Button component
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
    this.options = merge(defaults, options || {})

    this.init()
    this.build()
    this.setup()
    this.bind(this.options.bind)

    this.emit('ready')

    return this
  }

  /**
   * [init description]
   * @param  {?} options [description]
   * @return {?}         [description]
   */
  init () {
    init(this)

    this.element = this.element || {}

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
    this.wrapper = create(tag, this.options.prefix + '-' + this.options.class)

    classify(this.wrapper, this.options)

    this.options.label = this.options.label || this.options.text

    this.label(this.options.label)
    this.icon(this.options.icon)

    if (this.options.type) {
      css.add(this.wrapper, 'type-' + this.options.type)
    }

    // insert if container options is given
    if (this.options.container) {
      insert(this.wrapper, this.options.container)
      this.emit('injected', this.wrapper)
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

    if (this.options.style) {
      var styles = this.options.style.split(' ')
      for (var i = 0; i < styles.length; i++) {
        css.add(this.wrapper, 'style-' + styles[i])
      }
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
    switch(prop) {
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

return this }

  /**
   * [_onElementMouseDown description]
   * @param  {event} e
   * @return {void}
   */
  click (e) {
    e.preventDefault()

    if (this.disabled === true) return
    if (this.options.upload) return

    // this.publish('click');
    this.emit('click', e)

    return this
  }
}

export default Button
