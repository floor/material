// import control from '../control';
// import control from './component/control'
import build from '../element/build'
import emitter from '../module/emitter'
import insert from '../component/insert'
import attach from '../module/attach'

let defaults = {
  prefix: 'material',
  class: 'switch',
  type: 'control',
  label: null,
  checked: false,
  error: false,
  value: false,
  disabled: false,
  build: ['$root.switch', {},
    ['input$input$switch-input', { type: 'checkbox' }],
    ['span$control.control', {},
      ['span$track.track', {},
        ['span$knob.knob', {}]
      ]
    ],
    ['label$label.label']
  ],
  events: [
    ['element.control.click', 'toggle'],
    // ['element.label.click', 'toggle'],
    // for accessibility purpose
    ['element.input.click', 'toggle'],
    ['element.input.focus', 'focus'],
    ['element.input.blur', 'blur']
    // ['element.input.keydown', 'keydown']
  ]
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
    this.init(options)
    this.build()
    this.attach()

    return this
  }

  /**
   * Constructor
   * @param  {Object} options The class options
   * @return {Object} This class instance
   */
  init (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, emitter, attach, insert)

    this.value = this.options.value

    return this
  }

  /**
   * build method
   * @return {Object} The class instance
   */
  build () {
    this.element = build(this.options.build)
    this.root = this.element.root

    // classify(this.root, this.options)

    if (this.options.disabled) {
      this.disable()
    }

    if (this.value) {
      this.element.input.setAttribute('checked', 'checked')
    }

    this.element.input.setAttribute('aria-label', this.options.name)

    let text = this.options.label || this.options.text || ''

    this.element.label.textContent = text
    this.element.label.setAttribute('for', this.options.name)
    if (this.options.checked) {
      this.check(true)
    }

    if (this.options.container) {
      this.insert(this.options.container)
    }
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   * @return {Object} The class instance
   */
  set (prop, value, silent) {
    switch (prop) {
      case 'value':
        this.setValue(value, silent)
        break
      case 'disabled':
        if (value === true) {
          this.disable()
        } else if (value === false) {
          this.enable()
        }
        break
      default:
        this.setValue(prop, silent)
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
  setValue (value, silent) {
    // console.log('setValue', value)
    this.check(value, silent)
  }

 /**
   * [toggle description]
   * @return {Object} The class instance
   */
  toggle () {
    if (this.disabled) return

    this.focus()

    if (this.checked) {
      this.check(false)
    } else {
      this.check(true)
    }

    this.emit('change')

    return this
  }

  /**
   * Set checkbox value
   * @param {boolean} value [description]
   */
  check (checked, silent) {
    console.log('check', checked, silent)
    if (checked === true) {
      this.root.classList.add('is-checked')
      this.element.input.checked = true
      this.checked = true
      this.value = true
    } else {
      this.root.classList.remove('is-checked')
      this.element.input.checked = false
      this.checked = false
      this.value = false
    }
    return this
  }

  /**
   * [_onInputFocus description]
   * @return {?} [description]
   */
  focus () {
    if (this.disabled === true) return this

    this.root.classList.add('is-focused')
    if (this.element.input !== document.activeElement) { this.element.input.focus() }
    return this
  }

  /**
   * [_onInputBlur description]
   * @return {?} [description]
   */
  blur () {
    this.root.classList.remove('is-focused')
    return this
  }
}

export default Switch
