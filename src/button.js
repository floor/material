import EventEmitter from './mixin/emitter'

import build from './module/build'
import display from './mixin/display'
import bindEvents from './module/events'

import dataset from './module/dataset'
import ripple from './module/ripple'

class Button extends EventEmitter{
  static isComponent () {
    return true
  }

  static defaults = {
    class: 'button',
    tag: 'button',
    modules: [build, bindEvents],
    styles: ['style', 'color'],
    ripple: true,
    stopPropagation: false,
    events: [
      ['element.click', 'click'],
      ['element.mousedown', 'mousedown'],
      ['element.mouseup', 'mouseup'],
      ['element.mouseleave', 'mouseup'],
      ['element.touchstart', 'mousedown'],
      ['element.touchend', 'mouseup']
    ]
  }

  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    super()

    this.init(options)
    this.build()
    this.setup()
    this.bindEvents()

    if (this.options.container) {
      this.append(this.options.container)
    }

    return this
  }

  init (options) {
    this.options = Object.assign({}, Button.defaults, options || {})
    Object.assign(this, build, display, bindEvents)

  }

  setup () {
    this.styleAttributes()

    this.buildIcon()
    this.buildLabel()

    if (this.options.text) {
      this.element.innerHTML = this.element.innerHTML + this.options.text
    }

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

    if (this.options.value) {
      this.element.setAttribute('value', this.options.value)
    }

    if (this.options.title) {
      this.element.setAttribute('title', this.options.title)
    }

    this.element.setAttribute('aria-label', this.options.text || this.options.label || this.options.class)

    if (this.options.tooltip) {
      this.element.setAttribute('data-tooltip', this.options.tooltip)
    }

    if (this.options.case) {
      this.element.classList.add(this.options.case + '-case')
    }

    if (this.options.ripple) ripple(this.element)
  }

  append (container) {
    container = container || this.options.container
    if (this.options.container) {
      container.appendChild(this.element)
    }
  }

  buildLabel () {
    if (!this.options.label) return

    if (this.options.label) {
      this.label = document.createElement('label')
      this.label.classList.add('label')
      this.label.innerHTML = this.options.label

      this.element.appendChild(this.label)
    }
  }

  buildIcon () {
    if (!this.options.icon) return

    if (this.options.icon) {
      this.icon = document.createElement('i')
      this.icon.classList.add('icon')
      this.icon.innerHTML = this.options.icon

      this.element.appendChild(this.icon)
    }
  }

  styleAttributes () {
    if (this.options.style) {
      this.element.classList.add('style-' + this.options.style)
    }

    if (this.options.size) {
      this.element.classList.add(this.options.size + '-size')
    }

    if (this.options.color) {
      this.element.classList.add('color-' + this.options.color)
    }

    if (this.options.bold) {
      this.element.classList.add('bold')
    }
  }

  set (prop, value) {
    // console.log('set', this.element, prop, value)
    switch (prop) {
      case 'value':
        this.element.value = value
        break
      case 'label':
        if (this.label) {
          this.label.innerHTML = value
        }
        break
      case 'text':
        this.element.innerHTML = value
        break
      case 'icon':
        if (this.icon) {
          this.icon.innerHTML = value
        }
        break
      default:
        // console.log('prop', prop)
        this.element.innerHTML = prop
    }

    return this
  }

  setLabel (value) {
    // console.log('setLabel', value)
    this.label.innerHTML = value
  }

  setText (value) {
    // console.log('setText', value)
    if (this.label) {
      this.setLabel(value)
    } else {
      this.element.innerHTML = value
    }
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
        return this.label.innerHTML
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

  click (ev) {
    if (this.options.stopPropagation === true) {
      ev.stopPropagation()
    }

    this.emit('click', ev)
  }

  mousedown (ev) {
    this.element.classList.add('pushed')
  }

  mouseup (ev) {
    this.element.classList.remove('pushed')
  }
}

export default Button
