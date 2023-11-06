import EventEmitter from './mixin/emitter'

import * as css from './module/css'
import build from './module/build'
import attach from './module/attach'
import display from './mixin/display'
import Element from './element'
import Button from './button'

class Navigation extends EventEmitter {
  static defaults = {
    class: 'navigation',
    tag: 'nav',
    events: [
      ['element.click', 'toggle']
    ]
  }

  constructor (options) {
    super()

    this.init(options)
    this.build()
    this.attach()
    this.setup()
  }

  init (options) {
    this.options = { ...Navigation.defaults, ...options }
    Object.assign(this, build, attach, display)
  }

  setup () {
    console.log('setup', this.options)
    if (this.options.type) css.add(this.element, 'type-' + this.options.type)
    if (this.options.type === 'rail') this.show()
    if (this.options.items) this.render(this.options.items)
  }

  render (items) {
    if (items && Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        this.add(items[i])
      }
    }
  }

  add (obj) {
    if (typeof obj !== 'object') return this
    let item
    if (obj.type === 'divider') {
      item = new Element({ tag: 'li', class: 'divider' })
    } else if (obj.type === 'divider') {
      item = new Element({ tag: 'li', class: 'divider' })
    } else {
      obj.container = this.ui.list
      obj.class = 'item'
      item = new Button(obj).on('click', (ev) => {
        // console.log('select', ev.target.name)
        this.emit('select', ev.target.name)
      })
    }

    return this
  }
}

export default Navigation
