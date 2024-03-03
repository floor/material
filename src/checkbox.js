import EventEmitter from './mixin/events'
// import control from './mixin/control'
import build from './module/build'
import events from './module/events'
import * as css from './module/css'

import icon from './skin/material/icon/checkbox.svg'

import Element from './element'

class Checkbox {
  static uid = "material-checkbox";

  static defaults = {
    class: 'checkbox',
    layout: [
      [Element, 'input', { type: 'checkbox' }],
      [Element, 'control', { type: 'checkbox' }],
      [Element, 'label', { tag: 'label' }]
    ],
    events: [
      ['ui.control.click', 'click'],
      ['ui.label.click', 'toggle'],
      // for accessibility purpose
      // ['element.input.click', 'toggle'],
      ['ui.input.focus', 'focus'],
      ['ui.input.blur', 'blur'],
      ['ui.input.keydown', 'keydown']
    ]
  }

  constructor (options) {
    this.init(options)
    this.build()
    this.setup()
  }

  init (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, build, attach)

    return this
  }

  setup () {
    this.element = build(this.options.build)
    this.element = this.element.root

    this.ui.control.innerHTML = icon

    const text = this.options.text || this.options.label

    this.ui.label.innerHTML = text

    this.ui.input.setAttribute('type', 'checkbox')
    this.ui.input.setAttribute('name', this.options.name)
    this.ui.input.setAttribute('aria-label', this.options.name)

    if (this.options.value) {
      this.ui.input.setAttribute('value', this.options.value)
    }

    if (this.options.disabled) {
      this.disabled = this.options.disabled
      this.ui.input.setAttribute('disabled', 'disabled')
      css.add(this.element, 'is-disabled')
    }

    if (this.options.checked) {
      this.check(true)
    }

    if (this.options.value) {
      this.set('value', this.value)
    }

    events.attach(this.options.events, this)
  }

  set (prop, value) {
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

  check (checked) {
    if (checked === true) {
      css.add(this.element, 'is-checked')
      this.ui.input.checked = true
      this.checked = true
      this.emit('change', this.checked)
    } else {
      css.remove(this.element, 'is-checked')
      this.ui.input.checked = false
      this.checked = false
      this.emit('change', this.checked)
    }
    return this
  }

  click (e) {
    this.toggle(e)
    this.ui.input.focus()

    return this
  }

  setValue (value) {
    // console.log('setValue', value)
    this.value = value
    this.ui.input.setAttribute('value', value)

    return this
  }
}

export default Checkbox
