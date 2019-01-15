'use strict'

import create from './element/create'
import insert from './element/insert'

import focus from './component/focus'
import emitter from './module/emitter'
import css from './module/css'
import attach from './module/attach'

var defaults = {
  prefix: 'material',
  class: 'textfield',
  type: 'control',
  tag: 'div',
  events: [
    // 'change': '_onChange',
    ['element.input.focus', 'focus'],
    ['element.input.blur', 'blur'],
    // ['input.keypress', '_handleInputKeyPress',
    ['element.input.keyup', '_handleInputKeyPress']
    // ['input.change', '_onChange']
    // 'input.keydown': '_handleInputKeyPress'

  ]
}

/**
 * Textfield class
 * @class
 */
class Textfield {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})

    this.init()
    this.build()
    this.attach()

    return this
  }

  /**
   * init
   * @param  {Object} options The class options
   * @return {Object} The class instance
   */
  init () {
    Object.assign(this, focus, emitter, attach)

    this.element = {}
    this.value = this.options.value

    return this
  }

  /**
   * [build description]
   * @return {Object} The class instance
   */
  build () {
    // create a new div as input element
    var tag = this.options.tag || 'div'
    this.root = create(tag, this.options.prefix + '-' + this.options.class)

    this.buildLabel()
    this.buildInput()
    this.buildUnderline()

    if (this.disabled) {
      css.add(this.root, 'is-disabled')
    }

    // insert if container this.options is given
    if (this.options.container) {
      // console.log(this.name, opts.container);
      insert(this.root, this.options.container)
    }
  }

  buildLabel () {
    this.label = create('label', this.options.class + '-label')
    insert(this.label, this.root)

    if (this.options.label !== false) {
      this.setLabel()
    }
  }

  /**
   * [_initInput description]
   * @return {Object} The class instance
   */
  buildInput () {
    this.element.input = create('input', this.options.class + '-input')
    this.element.input.setAttribute('type', 'text')
    insert(this.element.input, this.root)

    if (!this.options.value) {
      css.add(this.root, 'is-empty')
    }

    if (this.readonly) {
      this.element.input.setAttribute('readonly', 'readonly')
      this.element.input.setAttribute('tabindex', '-1')
    }

    return this.element.input
  }

  /**
   * _initUnderline
   * @return {Object} The class instance
   */
  buildUnderline () {
    this.underline = create('span', this.options.class + '-underline')
    insert(this.underline, this.root)
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   */
  set (prop, value) {
    switch (prop) {
      case 'value':
        this.setValue(value)
        break
      case 'label':
        this.setLabel(value)
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

  /**
   * [buildLabel description]
   * @return {Object} The class instance
   */
  setLabel (label) {
    label = label || this.options.label
    var text

    if (label === null || label === false) {
      text = ''
    } else if (this.options.label) {
      text = label
    } else {
      text = this.options.name
    }

    this.label.textContent = text
  }


  disable () {
    this.disabled = true

    this.element.input.setAttribute('disabled', 'disabled')
    css.add(this.root, 'is-disabled')
    return this
  }

  enable () {
    this.disabled = false

    this.element.input.removeAttribute('disabled')
    css.remove(this.root, 'is-disabled')
    return this
  }


  /**
   * Getter
   * @param {string} prop
   * @param {string} value
   */
  get (prop) {
    var value

    switch (prop) {
      case 'value':
        value = this.getValue()
        break
      case 'name':
        value = this.name
        break
      default:
        return this.getValue()
    }

    return value
  }

  /**
   * [getValue description]
   * @return {Object} The class instance
   */
  getValue () {
    // console.log('getValue', this);
    return this.element.input.value
  }

  /**
   * [setValue description]
   * @param {string} value [description]
   */
  setValue (value) {
    this.element.input.value = value

    if (value) {
      css.remove(this.root, 'is-empty')
    } else {
      css.add(this.root, 'is-empty')
    }

    this.emit('change', value)
  }

  /**
   * Setter for the state of the component
   * @param {string} state active/disable etc...
   */
  setState (state) {
    if (this.state) {
      css.remove(this.root, 'state-' + this.state)
    }

    if (state) {
      css.add(this.root, 'state-' + state)
    }

    this.state = state
    this.emit('state', state)

    return this
  }

  /**
   * [_initValue description]
   * @return {Object} The class instance
   */
  _initValue () {
    var opts = this.options

    // create a new div as input element
    if (opts.value) {
      this.setValue(opts.value)
    }
  }

  /**
   * [_onFocus description]
   * @return {Object} The class instance
   */
  _handleInputKeyPress (e) {
    // console.log('_handleInputKeyPress', e);

    if (this.get('value') === '') {
      css.add(this.root, 'is-empty')
    } else {
      css.remove(this.root, 'is-empty')
    }

    this.emit('change', this.getValue())
  }

  /**
   * [setError description]
   * @param {string} error Error description
   */
  setError (error) {
    if (error) {
      this.addClass('field-error')
      if (this.error) { this.error.set('html', error) }
    } else {
      if (this.error) { this.removeClass('field-error') }
      if (this.error) { this.error.set('html', '') }
    }
  }

  insert (container, context) {
    insert(this.root, container, context)
  }
}

export default Textfield
