import EventEmitter from './mixin/emitter'
// menu related modules
import build from './module/build'
import events from './module/events'
import display from './mixin/display'

import Element from './element'
import Button from './button'

class Menu extends EventEmitter {
  static defaults = {
    class: 'menu',
    offset: 8,
    modal: false,
    layout: [
      [Element, 'surface', { class: 'surface' },
        [Element, 'list', { tag: 'ul', class: 'items' }]
      ]
    ],
    events: [
      ['element.click', 'close']
    ]
  }

  constructor (options) {
    super()

    this.init(options)
    this.build(this.constructor)
    this.setup()

    this.render(this.options.items)
  }

  init (options) {
    this.options = Object.assign({}, Menu.defaults, options || {})
    Object.assign(this, build, display)
  }

  setup () {
    events.attach(this.options.events, this)
  }

  render (items) {
    if (items && Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        this.add(items[i])
      }
    }

    return this
  }

  add (obj) {
    if (typeof obj !== 'object') return this
    let item
    if (obj.type === 'divider') {
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

  position (target) {
    if (!target) return
    const caller = target.getBoundingClientRect()
    const screen = this.ui.surface.getBoundingClientRect()
    const menu = this.ui.list.getBoundingClientRect()

    // Calculate top position
    let top = caller.top + caller.height
    if (top + menu.height > window.innerHeight) {
      top = window.innerHeight - menu.height - this.options.offset
    }
    this.ui.surface.style.top = top + 'px'

    // Calculate left position
    let left = caller.left - caller.width + menu.width - screen.width + caller.width
    if (left + menu.width > window.innerWidth) {
      left = window.innerWidth - menu.width - this.options.offset
    }
    this.ui.surface.style.left = left + 'px'

    return this
  }

  close () {
    // console.log('close')
    this.destroy()
  }
}

export default Menu
