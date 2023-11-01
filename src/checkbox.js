import events from './mixin/events'
import control from './mixin/control'
import label from './mixin/label'

import insert from './element/insert'
import build from './element/build'

import emitter from './module/emitter'
import attach from './module/attach'
import * as css from './module/css'

import icon from './skin/material/icon/checkbox.svg'
// element related modules

const defaults = {
  prefix: 'material',
  class: 'checkbox',
  type: 'control',
  // modules: [events, control, emitter, attach],
  build: ['$root.material-checkbox', {},
    ['input$input', {}],
    ['span$control.checkbox-control']
  ],
  events: [
    ['element.control.click', 'click', {}],
    ['element.label.click', 'toggle', {}],
    // for accessibility purpose
    // ['element.input.click', 'toggle', {}],
    ['element.input.focus', 'focus'],
    ['element.input.blur', 'blur'],
    ['element.input.keydown', 'keydown', {}]
  ]
}

class Checkbox {
  constructor (options) {
    this.init(options)
    this.build()
    this.attach()

    return this
  }

  init (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, events, control, emitter, attach)

    return this
  }

  build () {
    this.element = build(this.options.build)
    this.element = this.element.root

    this.element.control.innerHTML = icon

    const text = this.options.text || this.options.label

    this.element.label = label(this.element, text, this.options)

    this.element.input.setAttribute('type', 'checkbox')
    this.element.input.setAttribute('name', this.options.name)
    this.element.input.setAttribute('aria-label', this.options.name)

    if (this.options.value) {
      this.element.input.setAttribute('value', this.options.value)
    }

    if (this.options.disabled) {
      this.disabled = this.options.disabled
      this.element.input.setAttribute('disabled', 'disabled')
      css.add(this.element, 'is-disabled')
    }

    if (this.options.checked) {
      this.check(true)
    }

    if (this.options.value) {
      this.set('value', this.value)
    }

    // insert if container options is given
    if (this.options.container) {
      insert(this.element, this.options.container)
    }

    return this
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

  insert (container, context) {
    insert(this.element, container, context)

    return this
  }

  click (e) {
    this.toggle(e)
    this.element.input.focus()

    return this
  }

  setValue (value) {
    // console.log('setValue', value)
    this.value = value
    this.element.input.setAttribute('value', value)

    return this
  }
}

export default Checkbox
