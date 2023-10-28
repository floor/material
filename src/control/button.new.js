import emitter from '../module/emitter'
import dataset from '../view/dataset'

const defaults = {
  class: 'button',
  tag: 'button',
  styles: ['style', 'color']
}

class Button {
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
    Object.assign(this, emitter)
    // console.log('options', options)

    this.init()

    return this
  }

  init () {
    this.build()
    this.setup()
    this.attach()

    if (this.options.container) {
      this.append(this.options.container)
    }
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build () {
    this.element = document.createElement(this.options.tag)

    if (this.options.class !== 'button') {
      this.element.classList.add('button')
    }

    this.element.classList.add(this.options.class)
    this.styleAttributes()

    if (this.options.text) {
      this.element.innerHTML = this.options.text
    }

    if (this.options.label) {
      this.buildLabel()
    }

    return this
  }

  setup () {
    if (this.options.data) {
      dataset(this.element, this.options.data)
    }

    if (this.options.type) {
      this.element.setAttribute('type', this.options.type)
    } else {
      this.element.setAttribute('type', 'button')
    }

    if (this.options.name) {
      this.element.setAttribute('name', this.options.name)
    }

    this.element.setAttribute('aria-label', this.options.text || this.options.label || this.options.class)

    if (this.options.tooltip) {
      this.element.setAttribute('data-tooltip', this.options.tooltip)
    }

    if (this.options.case) {
      this.element.classList.add(this.options.case + '-case')
    }
  }

  append (container) {
    if (this.options.container) {
      this.options.container.appendChild(this.element)
    }
  }

  buildLabel () {
    if (this.options.label) {
      this.label = document.createElement('label')
      this.label.innerHTML = this.options.label
      this.element.appendChild(this.label)
    }
  }

  buildIcon () {
    if (this.options.icon) {
      this.label = document.createElement('label')
      this.label.innerHTML = this.options.label
      this.element.appendChild(this.label)
    }
  }

  styleAttributes () {
    if (this.options.style) {
      this.element.classList.add('style-' + this.options.style)
    }

    if (this.options.color) {
      this.element.classList.add('color-' + this.options.color)
    }

    if (this.options.bold) {
      this.element.classList.add('bold')
    }
  }

  attach () {
    this.element.addEventListener('click', (ev) => {
      this.emit('click', ev)
    })
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
        this.element.value = value
        break
      case 'label':
        if (this.ui.label) {
          this.ui.label.innerHTML = value
        }
        break
      case 'icon':
        if (this.ui.label) {
          this.ui.icon.innerHTML = value
        }
        break
      default:
        this.element.value = value
    }

    return this
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   * @return {Object} The class instance
   */
  get (prop, value) {
    switch (prop) {
      case 'value':
        return this.element.value
      case 'label':
        return this.ui.label.innerHTML
      default:
        return this.element.value
    }
  }

  disable () {
    this.element.disabled = true
  }

  enable () {
    this.element.disabled = false
  }

  destroy () {
    this.element.parentNode.removeChild(this.element)
  }
}

export default Button
