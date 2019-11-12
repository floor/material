import emitter from '../module/emitter'
import attach from '../module/attach'
import dataset from '../view/dataset'

const defaults = {
  class: 'textfield',
  tag: 'div',
  attributes: ['type', 'name', 'autocomplete', 'required'],
  events: [
    ['input.keyup', 'onKeyup']
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
    this.root = document.createElement(this.options.tag)
    this.root.classList.add(this.options.class)

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
      this.label = document.createElement('span')
      this.label.innerHTML = this.options.label
      this.root.appendChild(this.label)
    }
  }

  buildInput () {
    this.input = document.createElement('input')
    this.root.appendChild(this.input)

    this.initAttributes()

    if (this.options.focus) {
      this.input.focus()
    }
  }

  initAttributes () {
    for (var i = 0; i < this.options.attributes.length; i++) {
      var attribute = this.options.attributes[i]
      // console.log('attribute', attribute)
      if (attribute === 'required') {
        this.input.setAttribute(attribute, attribute)
      } else if (this.options[attribute] && this.options[attribute] !== 'undefined') {
        this.input.setAttribute(attribute, this.options[attribute])
      }
    }
  }

  onKeyup (ev) {
    // console.log('change', this.value, this.input.value)
    if (this.value !== this.input.value) {
      this.emit('change', ev)
    }
  }

  set (value) {
    // console.log('set', value)
    this.value = value
    this.input.value = value
  }

  get () {
    return this.input.value
  }
}

export default Text
