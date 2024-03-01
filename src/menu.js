import EventEmitter from './mixin/emitter'
// menu related modules
import build from './module/build'
import events from './module/events'
import display from './mixin/display'
import position from './mixin/position'

import Element from './element'
import Button from './button'

class Menu extends EventEmitter {
  static defaults = {
    class: 'menu',
    modal: false,
    position: {
      align: 'right',
      vAlign: 'bottom',
      offsetX: 10,
      offsetY: 10
    },
    layout: [
      [Element, 'list', { tag: 'ul', class: 'items' }]
    ],
    events: [
      ['element.click', 'onClick'],
      ['element.show', 'close'],
      ['element.mouseenter', 'onMouseEnter'],
      ['element.mouseleave', 'close'],
      ['options.target.mouseleave', 'close']
    ]
  }

  constructor (options) {
    super()

    this.init(options)
    this.build(this.constructor)
    this.setup()

    this.render(this.options.items)

    return this
  }

  init (options) {
    this.options = Object.assign({}, Menu.defaults, options || {})
    Object.assign(this, build, display, position)
  }

  setup () {
    events.attach(this.options.events, this)
    this.closeTimeout = null
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
      item = new Element(obj).classList.add('item')
    }

    return this
  }

  onMouseEnter () {
    clearTimeout(this.closeTimeout)
  }

  onClick (ev) {
    // console.log('onClick', ev.target, ev.target.getAttribute('name'))
    const name = ev.target.getAttribute('name')
    if (name) {
      this.emit('select', name)
    }
    this.destroy()
  }

  close () {
    this.closeTimeout = setTimeout(() => {
      this.destroy()
    }, 200)
  }
}

export default Menu
