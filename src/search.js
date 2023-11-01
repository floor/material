import EventEmitter from './mixin/emitter'

import build from './module/build'
import display from './mixin/display'
import bindEvents from './module/events'

import Element from './element'
import Button from './button'

class Search extends EventEmitter {
  static defaults = {
    class: 'search-input',
    minChar: 4,
    timeout: 200,
    layout: [
      [Element, 'input', { tag: 'input', class: 'input'} ],
      [Button, 'clear', { class: 'clear'} ]
    ],
    events: [
      ['ui.input.input', 'onInput'],
      ['ui.clear.click', 'onClear']
    ]
  }

  constructor (options) {
    super()

    this.init(options)
    this.build()
    this.bindEvents()

    this.input = this.ui.input
  }

  init (options) {
    this.options = { ...Search.defaults, ...options }
    Object.assign(this, build, display, bindEvents)
  }

  set (value) {
    if (value) this.input.value = value
    else this.input.value = ''
  }

  focus () {
    this.ui.input.focus()
  }

  onInput () {
    if (this.ui.input.value.length < this.options.minChar) return

    clearTimeout(this.timeout)

    this.timeout = setTimeout(() => {
      this.emit('change', this.ui.input.value)
    }, this.options.timeout)
  }

  onClear () {
    this.set(null)
    this.focus()
    this.emit('cancel')
  }
}

export default Search
