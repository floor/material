// module
import dataset from '../view/dataset'
import attach from '../module/attach'
import emitter from '../module/emitter'
import attributes from './module/attributes'
import addClass from './module/addclass'

// ui
import Layout from '../layout'
import Element from '../element'

let defaults = {
  class: 'switch',
  attributes: ['type', 'name', 'required', 'checked'],
  layout: [
    [Element, 'input', { class: 'input', type: 'checkbox' }],
    [Element, 'control', { class: 'control' },
      [Element, 'track', { class: 'track' },
        [Element, 'knob', { class: 'knob' }]
      ]
    ]
  ],
  events: [
    ['ui.control.click', 'toggle'],
    // ['ui.label.click', 'toggle'],
    // for accessibility purpose
    ['ui.input.click', 'toggle'],
    ['ui.input.focus', 'focus'],
    ['ui.input.blur', 'blur']
  ]
}

class Switch {
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, emitter, attach, dataset)

    this.value = this.options.value

    this.build()
    this.setup()
    this.attach()

    return this
  }

  /**
   * build method
   * @return {Object} The class instance
   */
  build () {
    var tag = this.options.tag || 'span'
    this.root = document.createElement(tag)
    this.root.classList.add('switch')

    if (this.options.class !== 'switch') {
      addClass(this.root, this.options.class)
    }

    this.layout = new Layout(this.options.layout, this.root)
    this.ui = this.layout.component

    // console.log('ui', this.ui)

    this.styleAttributes()

    this.buildIcon()
    this.buildLabel()

    if (this.options.container) {
      this.options.container.appendChild(this.root)
    }
  }

  setup () {
    if (this.options.data) {
      dataset(this.root, this.options.data)
    }

    // console.log('attribute', this.ui.input, this.options)
    attributes(this.ui.input, this.options)

    if (this.options.checked) {
      this.check(true)
    }

    if (this.value) {
      this.element.input.setAttribute('checked', 'checked')
    }

    if (this.options.tooltip) {
      this.root.setAttribute('data-tooltip', this.options.tooltip)
    }

    this.ui.input.setAttribute('aria-label', this.options.name)

    if (this.options.case) {
      this.root.classList.add(this.options.case + '-case')
    }
  }

  buildLabel () {
    // console.log('buildLabel', this.options.label)
    if (!this.options.label) return

    this.ui.label = document.createElement('label')
    this.ui.label.classList.add('label')
    this.ui.label.innerHTML = this.options.label

    if (this.options.name) {
      this.ui.label.setAttribute('for', this.options.name)
    }

    this.root.insertBefore(this.ui.label, this.ui.input)
  }

  buildIcon () {
    if (!this.options.icon) return

    this.ui.icon = document.createElement('i')
    this.ui.icon.classList.add('icon')
    this.ui.icon.innerHTML = this.options.icon

    this.root.insertBefore(this.ui.icon, this.ui.input)
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
  set (prop, value, silent) {
    switch (prop) {
      case 'value':
        this.setValue(value, silent)
        break
      case 'text':
        this.setValue(value)
        break
      case 'disabled':
        if (value === true) {
          this.disable()
        } else if (value === false) {
          this.enable()
        }
        break
      default:
        this.setValue(prop, value)
    }

    return this
  }

  setLabel (value) {
    // console.log('setLabel', value)
    if (this.ui.label) {
      this.ui.label.innerHTML = value
    }
  }

  setText (value) {
    this.setLabel(value)
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
    // console.log('setValue', value, typeof silent, silent)
    this.check(value, silent)
  }

 /**
   * [toggle description]
   * @return {Object} The class instance
   */
  toggle () {
    // console.log('toggle')
    if (this.disabled) return

    this.focus()

    if (this.checked) {
      this.check(false)
    } else {
      this.check(true)
    }

    return this
  }

  /**
   * Set checkbox value
   * @param {boolean} value [description]
   */
  check (checked, silent) {
    // console.log('check', checked, silent)
    if (checked === true) {
      this.root.classList.add('is-checked')
      this.ui.input.checked = true
      this.checked = true
      this.value = true
      if (!silent) {
        this.emit('change', this.checked)
      }
    } else {
      this.root.classList.remove('is-checked')
      this.ui.input.checked = false
      this.checked = false
      this.value = false
      if (!silent) {
        this.emit('change', this.checked)
      }
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
    if (this.ui.input !== document.activeElement) { this.ui.input.focus() }
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
