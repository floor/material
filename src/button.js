import EventEmitter from './mixin/emitter'
import build from './module/build'
import display from './mixin/display'
import bindEvents from './module/events'
import dataset from './module/dataset'
import ripple from './module/ripple'

const DEFAULT_TYPE = 'button'
const DEFAULT_CLASS = 'button'

class Button extends EventEmitter {
  static isComponent () {
    return true
  }

  static defaults = {
    class: DEFAULT_CLASS,
    tag: 'button',
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

  constructor (options) {
    super()

    this.init(options)
    this.build()
    this.setup()
    this.bindEvents()
  }

  init (options) {
    this.options = { ...Button.defaults, ...options }
    Object.assign(this, build, display, bindEvents)
  }

  setup () {
    this.setAttributes()
    this.styleAttributes()
    this.buildElements()

    if (this.options.text) {
      this.element.innerHTML = this.element.innerHTML + this.options.text
    }
  }

  buildElements () {
    this.buildIcon()
    this.buildLabel()
  }

  setAttributes () {
    const { type, name, value, title, text, label, tooltip, data, case: caseOption } = this.options

    this.element.setAttribute('type', type ?? DEFAULT_TYPE)
    if (name) this.element.setAttribute('name', name)
    if (value) this.element.setAttribute('value', value)
    if (title) this.element.setAttribute('title', title)
    this.element.setAttribute('aria-label', text ?? label ?? DEFAULT_CLASS)
    if (tooltip) this.element.setAttribute('data-tooltip', tooltip)
    if (data) dataset(this.element, data)
    if (caseOption) this.element.classList.add(`${caseOption}-case`)
    if (this.options.ripple) ripple(this.element)
  }

  styleAttributes () {
    const { style, size, color, bold } = this.options
    if (style) this.element.classList.add(`style-${style}`)
    if (size) this.element.classList.add(`${size}-size`)
    if (color) this.element.classList.add(`color-${color}`)
    if (bold) this.element.classList.add('bold')
  }

  buildLabel () {
    if (!this.options.label) return

    this.label = document.createElement('label')
    this.label.classList.add('label')
    this.label.innerHTML = this.options.label

    this.element.appendChild(this.label)
  }

  buildIcon () {
    if (!this.options.icon) return

    this.icon = document.createElement('i')
    this.icon.classList.add('icon')
    this.icon.innerHTML = this.options.icon

    this.element.appendChild(this.icon)
  }

  set (prop, value) {
    // console.log('set', this.element, prop, value)
    switch (prop) {
      case 'value':
        this.element.value = value
        break
      case 'label':
        if (!this.label) this.buildLabel()
        this.label.innerHTML = value
        break
      case 'text':
        this.element.innerHTML = value
        break
      case 'icon':
        if (this.icon) {
          this.icon.innerHTML = value
        }
        break
      case 'enable':
        this.element.disabled = false
        break
      case 'disable':
        this.element.disabled = true
        break
      default:
        // console.log('prop', prop)
        this.element.innerHTML = prop
    }

    return this
  }

  setLabel (value) {
    if (this.label) {
      this.label.innerHTML = value
    }
  }

  setText (value) {
    if (this.label) {
      this.setLabel(value)
    } else {
      this.element.innerHTML = value
    }
  }

  get (prop) {
    switch (prop) {
      case 'value':
        return this.element.value
      case 'label':
        return this.label?.innerHTML ?? this.element.value
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
