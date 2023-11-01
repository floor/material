import EventEmitter from './mixin/emitter'
// menu related modules
import build from './module/build'
import bindEvents from './module/events'
import display from './mixin/display'

import Element from './element'
import Button from './button'

class Menu extends EventEmitter {
  static defaults = {
    class: 'menu',
    transition: 200,
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
    this.bindEvents()

    this.render(this.options.items)
  }

  init (options) {
    this.options = Object.assign({}, Menu.defaults, options || {})
    Object.assign(this, build, bindEvents, display)
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
    const offs = target.getBoundingClientRect()

    const offsw = this.offset = this.ui.surface.getBoundingClientRect()

    this.ui.surface.style.top = (offs.top - 4) + 'px'
    this.ui.surface.style.left = offs.left - offsw.width + offs.width + 'px'

    return this
  }

  close () {
    // console.log('close')
    this.destroy()
  }
}

export default Menu
