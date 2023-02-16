
import emitter from '../module/emitter'
import attach from '../module/attach'
import dataset from '../view/dataset'
import attributes from './module/attributes'

const defaults = {
  class: 'textfield',
  attributes: ['type', 'name', 'title', 'maxlength', 'pattern', 'min', 'max', 'placeholder', 'readonly', 'autocomplete', 'required', 'disabled'],
  events: [
    ['input.input', 'onInput'],
    ['input.focus', 'onFocus'],
    ['input.blur', 'onBlur'],
    ['input.click', 'onClick']
  ]
}

class Text {
  static isComponent () {
    return true
  }
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, emitter, attach, dataset)
    // console.log('options', options)

    this.build()
    this.attach()

    return this
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build () {
    var tag = this.options.tag || 'div'

    this.root = document.createElement(tag)
    this.root.classList.add('textfield')

    if (this.options.class !== 'textfield') {
      this.root.classList.add(this.options.class)
    }

    this.buildLabel()
    this.buildInput()

    if (this.options.value) {
      this.set(this.options.value)
    }

    if (this.options.data) {
      dataset(this.root, this.options.data)
    }

    if (this.container) {
      this.container.appendChild(this.root)
    }

    return this
  }

  buildLabel () {
    if (this.options.label) {
      this.label = document.createElement('label')
      this.label.classList.add('label')
      this.label.innerHTML = this.options.label
      this.root.appendChild(this.label)
    }
  }

  buildInput () {
    let tag = 'input'
    if (this.options.type === 'multiline') {
      tag = 'textarea'
    }
    this.input = document.createElement(tag)
    this.input.classList.add('input')
    this.root.appendChild(this.input)

    attributes(this.input, this.options)

    if (this.options.focus) {
      this.input.focus()
    }
  }

  onInput (ev) {
    // console.log('onInput', this.value, this.input.value)

    this.emit('change', ev)
  }

  onFocus (ev) {
    this.root.classList.add('focused')
    this.emit('focus', ev)
  }

  onBlur (ev) {
    this.root.classList.remove('focused')
    this.emit('blur', ev)
  }

  onClick (ev) {
    console.log('click')
    this.emit('click', ev)
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   * @return {Object} The class instance
   */
  set (prop, value) {
    // console.log('set', this.root, prop, value)
    switch (prop) {
      case 'value':
        this.setValue(value)
        break
      case 'label':
        this.setLabel(value)
        break
      default:
        // console.log('prop', prop)
        this.setValue(prop)
    }

    return this
  }

  setValue (value) {
    // console.log('set', typeof value, value)
    if (value && value !== 'undefined') {
      this.value = value
      this.input.value = value
    } else {
      this.input.value = ''
    }
  }

  setLabel (value) {
    // console.log('setLabel', value)
    if (this.label) {
      this.label.innerHTML = value
    }
  }

  setText (value) {
    this.setLabel(value)

    if (this.options.placeholder) {
      this.input.placeholder = value
    }
  }

  hide () {
    this.root.classList.add('hide')
  }

  show () {
    this.root.classList.remove('hide')
  }

  get () {
    return this.input.value
  }
}

export default Text
