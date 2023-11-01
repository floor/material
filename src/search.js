import EventEmitter from './mixin/emitter'

import build from './module/build'
import bindEvents from './module/events'

import Button from './button'
import cancel from './skin/material/icon/cancel.svg'

class Search extends EventEmitter {
  static defaults = {
    class: 'search-input',
    minChar: 4,
    iconCancel: cancel,
    timeout: 200,
    events: [
      ['input.input', 'onInput'],
      ['input.cancel', 'onCancel']
    ]
  }

  constructor (options) {
    super()

    this.init(options)
    this.build()
    this.buildSearch()
    this.bindEvents()
  }

  init (options) {
    this.options = Object.assign({}, Search.defaults, options || {})
    Object.assign(this, build, bindEvents)
  }

  buildSearch () {
    if (this.options.icon) {
      this.icon = document.createElement('i')
      this.icon.classList.add('icon')
      this.icon.innerHTML = this.options.icon
      this.element.appendChild(this.icon)
    }

    this.input = document.createElement('input')
    this.input.classList.add('input')
    this.element.appendChild(this.input)

    this.cancel = new Button({
      container: this.element,
      class: 'clear',
      icon: this.options.iconCancel
    })
  }

  onInput () {
    if (this.input.value.length < this.options.minChar) return

    clearTimeout(this.timeout)

    this.timeout = setTimeout(() => {
      this.emit('change', this.input.value)
    }, this.options.timeout)
  }

  onCancel () {
    this.input.value = ''
    this.input.focus()
    this.emit('cancel')
  }
}

export default Search
