import EventEmitter from './mixin/emitter'

import * as css from './module/css'
import build from './module/build'
import attach from './module/attach'
import display from './mixin/display'
import Element from './element'
import Button from './button'
import Item from './item'

class Navigation extends EventEmitter {
  static defaults = {
    class: 'navigation',
    tag: 'nav',
    layout: [
      [Element, 'body', { class: 'body' }]
    ],
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
    this.items = []
  }

  setup () {
    console.log('setup', this.options)
    if (this.options.type) css.add(this.element, 'type-' + this.options.type)
    if (this.options.type === 'rail') this.show()
    if (this.options.items) this.render(this.options.items)
  }

  render (items) {
    console.log('render', items)
    if (items && Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        this.add(items[i])
      }
    }
  }

  add (obj) {
    if (typeof obj !== 'object') return this
    let item
    if (obj.type === 'header') {
      item = new Element({ tag: 'span', class: 'header' })
    } else if (obj.type === 'divider') {
      item = new Element({ tag: 'span', class: 'divider' })
    } else {
      obj.container = this.ui.body
      obj.class = 'item'
      obj.stopPropagation = true
      obj.class = 'item'
      item = new Item(obj)
      console.log('item', item, this.items)
      this.items.push(item)
    }

    return this
  }
}

export default Navigation
