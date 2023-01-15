import emitter from '../module/emitter'
import attach from '../module/attach'

import dataset from '../view/dataset'

const defaults = {
  class: 'button',
  tag: 'button',
  styles: ['style', 'color'],
  stopPropagation: false,
  events: [
    ['root.click', 'click'],
    ['root.mousedown', 'mousedown'],
    ['root.mouseup', 'mouseup'],
    ['root.mouseleave', 'mouseup'],
    ['root.touchstart', 'mousedown'],
    ['root.touchend', 'mouseup']
  ]

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
    Object.assign(this, emitter, attach)
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
    this.root = document.createElement(this.options.tag)

    if (this.options.class !== 'button') {
      this.root.setAttribute('class', 'button ' + this.options.class)
    } else {
      this.root.classList.add('button')
    }

    this.styleAttributes()

    this.buildIcon()
    this.buildLabel()

    if (this.options.text) {
      this.root.innerHTML = this.root.innerHTML + this.options.text
    }

    return this
  }

  setup () {
    if (this.options.data) {
      dataset(this.root, this.options.data)
    }

    if (this.options.type) {
      this.root.setAttribute('type', this.options.type)
    } else {
      this.root.setAttribute('type', 'button')
    }

    if (this.options.name) {
      this.root.setAttribute('name', this.options.name)
    }

    if (this.options.value) {
      this.root.setAttribute('value', this.options.value)
    }

    if (this.options.title) {
      this.root.setAttribute('title', this.options.title)
    }

    this.root.setAttribute('aria-label', this.options.text || this.options.label || this.options.class)

    if (this.options.tooltip) {
      this.root.setAttribute('data-tooltip', this.options.tooltip)
    }

    if (this.options.case) {
      this.root.classList.add(this.options.case + '-case')
    }
  }

  append (container) {
    container = container || this.options.container
    if (this.options.container) {
      container.appendChild(this.root)
    }
  }

  buildLabel () {
    if (!this.options.label) return

    if (this.options.label) {
      this.label = document.createElement('label')
      this.label.classList.add('label')
      this.label.innerHTML = this.options.label

      this.root.appendChild(this.label)
    }
  }

  buildIcon () {
    if (!this.options.icon) return

    if (this.options.icon) {
      this.icon = document.createElement('i')
      this.icon.classList.add('icon')
      this.icon.innerHTML = this.options.icon

      this.root.appendChild(this.icon)
    }
  }

  styleAttributes () {
    if (this.options.style) {
      this.root.classList.add('style-' + this.options.style)
    }

    if (this.options.size) {
      this.root.classList.add(this.options.size + '-size')
    }

    if (this.options.color) {
      this.root.classList.add('color-' + this.options.color)
    }

    if (this.options.bold) {
      this.root.classList.add('bold')
    }
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
        this.root.value = value
        break
      case 'label':
        if (this.label) {
          this.label.innerHTML = value
        }
        break
      case 'text':
        this.root.innerHTML = value
        break
      case 'icon':
        if (this.label) {
          this.icon.innerHTML = value
        }
        break
      default:
        // console.log('prop', prop)
        this.root.innerHTML = prop
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
      this.root.innerHTML = value
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
        return this.root.value
      case 'label':
        return this.label.innerHTML
      default:
        return this.root.value
    }
  }

  disable () {
    this.root.disabled = true
  }

  enable () {
    this.root.disabled = false
  }

  hide () {
    this.root.classList.add('hide')
  }

  show () {
    this.root.classList.remove('hide')
  }

  destroy () {
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root)
    }
  }

  click (ev) {
    if (this.options.stopPropagation === true) {
      ev.stopPropagation()
    }

    this.emit('click', ev)
  }

  mousedown (ev) {
    this.root.classList.add('pushed')
  }

  mouseup (ev) {
    this.root.classList.remove('pushed')
  }
}

export default Button
