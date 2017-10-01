'use strict'

// import control from '../control';
import init from './component/init'
import control from './component/control'
import merge from './module/merge'
import build from './element/build'
import emitter from './module/emitter'
import insert from './component/insert'
import bind from './module/bind'
import css from './module/css'
import classify from './component/classify'

let defaults = {
  prefix: 'material',
  class: 'switch',
  type: 'control',
  label: null,
  checked: false,
  error: false,
  value: false,
  disabled: false,
  modules: [emitter, control, bind, insert],
  build: ['$wrapper.material-switch', {},
    ['input$input$switch-input', { type: 'checkbox' }],
    ['span$control.switch-control', {},
      ['span$track.switch-track', {},
        ['span$knob.switch-knob', {}]
      ]
    ],
    ['label$label.switch-label']
  ],
  bind: {
    'element.control.click': ['toggle', 'focus'],
    'element.label.click': ['toggle', 'focus'],
    // for accessibility purpose
    'element.input.click': 'toggle',
    'element.input.focus': 'focus',
    'element.input.blur': 'blur'
  }
}

/**
 * Switch class
 * @class
 * @extends Control
 */
class Switch {
  /**
   * Constructor
   * @param  {Object} options
  - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = merge(defaults, options || {})

    this.init(this)
    this.build(this.options)

    if (this.options.bind) { this.bind(this.options.bind) }

    return this
  }

  /**
   * Constructor
   * @param  {Object} options The class options
   * @return {Object} This class instance
   */
  init (options) {
    init(this)
    // init options and merge options to defaults
    options = options || this.options

    this.value = this.options.value

    return this
  }

  /**
   * build method
   * @return {Object} The class instance
   */
  build (options) {
    this.element = build(options.build)
    this.wrapper = this.element.wrapper

    classify(this.wrapper, options)

    if (options.disabled) {
      this.disable()
    }

    if (this.value) {
      this.element.input.setAttribute('checked', 'checked')
    }

    let text = options.label || options.text || ''

    this.element.label.textContent = text

    if (this.value) {
      this.check()
    }

    // insert if container options is given
    if (options.container) {
      // console.log(this.name, opts.container);
      this.insert(options.container)
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
      case 'value':
        this.setValue(value)
        break
      case 'disabled':
        if (value === true) {
          this.disable()
        } else if (value === false) {
          this.enable()
        }
        break
      default:
        this.setValue(prop)
    }

    return this
  }

  get () {
    return this.value
  }

  /**
   * set switch value
   * @param {boolean} value [description]
   */
  getValue () {
    return this.value
  }

  /**
   * set switch value
   * @param {boolean} value [description]
   */
  setValue (value) {
    if (value) {
      this.check()
    } else {
      this.unCheck()
    }
  }

  /**
   * [toggle description]
   * @return {Object} The class instance
   */
  toggle () {
    if (this.disabled) return this

    if (this.value) {
      this.unCheck(true)
    } else {
      this.check()
    }

    return this
  }

  /**
   * setTrue
   */
  check () {
    if (this.disabled) return this

    this.value = true
    css.add(this.wrapper, 'is-checked')
    this.element.input.checked = true
    this.emit('change', this.value)

    return this
  }

  /**
   * setFlas
   */
  unCheck () {
    if (this.disabled) return this

    this.value = false
    css.remove(this.wrapper, 'is-checked')
    this.element.input.checked = false
    this.emit('change', this.value)

    return this
  }
}

export default Switch
