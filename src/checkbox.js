'use strict'

import init from './component/init'
import merge from './module/merge'
import events from './component/events'
import control from './component/control'
import emitter from './module/emitter'
import bind from './module/bind'
import insert from './element/insert'
import build from './element/build'
import css from './module/css'

import icon from './skin/material/icon/checkbox.svg'
// element related modules

let defaults = {
  prefix: 'material',
  class: 'checkbox',
  type: 'control',
  modules: [events, control, emitter, bind],
  build: ['$wrapper.material-checkbox', {},
    ['input$input', {}],
    ['span$control.checkbox-control']
  ],
  binding: [
    ['element.control.click', 'click', {}],
    ['element.label.click', 'toggle', {}],
    // for accessibility purpose
    // ['element.input.click', 'toggle', {}],
    ['element.input.focus', 'focus'],
    ['element.input.blur', 'blur']
  ],
  bind: {
    'element.control.click': 'click',
    'element.label.click': 'toggle',
    // for accessibility purpose
    'element.input.click': 'toggle',
    'element.input.focus': 'focus',
    'element.input.blur': 'blur'
  }
}
/**
 * Checkbox control class
 * @class
 * @extends Control
 * @since 0.0.1
 * @example
 * var chkbox = checkbox({
 *   label: 'Primary raised button',
 *   type: 'raised',
 *   primary: true
 * }).on('click', function(e) {
 *   console.log('button click', e);
 * }).insert(document.body);
 */
class Checkbox {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor(options) {
    this.options = merge(defaults, options || {})
    // init and build
    this.init()
    this.build()
    this.bind(this.options.bind)

    return this
  }

  /**
   * Constructor
   * @param  {Object} options The class options
   * @return {Object} This class instance
   */
  init() {
    init(this)
    // init options and merge options to defaults

    return this
  }

  /**
   * build the component using the super method
   * @return {Object} The class instance
   */
  build() {
    this.element = build(this.options.build)
    this.wrapper = this.element.wrapper

    this.element.control.innerHTML = icon

    this.label(this.options.label)

    this.element.input.setAttribute('type', 'checkbox')
    this.element.input.setAttribute('name', this.options.name)
    this.element.input.setAttribute('value', this.options.value)

    if (this.options.disabled) {
      this.disabled = this.options.disabled
      this.element.input.setAttribute('disabled', 'disabled')
      css.add(this.wrapper, 'is-disabled')
    }

    if (this.options.checked) {
      this.check(true)
    }

    if (this.options.value) {
      this.set('value', this.value)
    }

    // insert if container options is given
    if (this.options.container) {
      insert(this.wrapper, this.options.container)
    }

    return this
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   * @return {Object} The class instance
   */
  set(prop, value) {
    switch (prop) {
      case 'checked':
        this.check(value)
        break
      case 'value':
        this.setValue(value)
        break
      case 'label':
        this.setLabel(value)
        break
      default:
        this.check(prop)
    }

    return this
  }

  insert(container, context) {
    insert(this.wrapper, container, context)

    return this
  }

  /**
   * [click description]
   * @param  {event} e [description]
   * @return {[type]}   [description]
   */
  click(e) {
    this.toggle(e)
    this.element.input.focus()

    return this
  }

  /**
   * Set checkbox value
   * @param {boolean} value [description]
   */
  setValue(value) {
    console.log('setValue', value)
    this.value = value
    this.element.input.setAttribute('value', value)

    return this
  }
}

export default Checkbox