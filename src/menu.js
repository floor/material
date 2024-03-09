import EventEmitter from './mixin/emitter'
// menu related modules
import build from './module/build'
import events from './module/events'
import display from './mixin/display'
import position from './mixin/position'

import Element from './element'

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
      ['select', 'destroy'],
      ['underlay.click', 'close']
    ]
  }

  constructor (options) {
    super()

    this.init(options)
    this.build(this.constructor)
    this.buildUnderlay()
    this.setup()

    this.render(this.options.items)

    return this
  }

  init (options) {
    this.options = { ...Menu.defaults, ...options }
    Object.assign(this, build, display, position)

    this.menus = []
  }

  buildUnderlay () {
    if (!this.options.parentName) {
      this.underlay = new Element({
        class: 'menu-underlay'
      })

      this.options.container.appendChild(this.underlay)
    }
  }

  setup () {
    events.attach(this.options.events, this)
    this.closeTimeout = null

    document.addEventListener('click', this.handleDocumentClick)
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
      obj.tag = 'li'
      obj.class = obj.class ? obj.class + ' item' : 'item'
      item = new Element(obj)

      item.addEventListener('mouseenter', () => {
        if (this.menu) {
          this.menu.destroy()
        }
      })

      if (obj.items && Array.isArray(obj.items)) {
        item.classList.add('sub')

        item.addEventListener('mouseenter', () => {
          this.menu = new Menu({
            class: 'floating',
            target: item,
            container: this.options.container,
            parentName: obj.name,
            items: obj.items
          }).position(item, {
            align: 'left',
            vAlign: 'inline',
            offsetX: 8,
            offsetY: 8
          }).show()

          this.menu.on('select', (name) => {
            this.emit('select', `${obj.name}:${name}`)
          }).on('destroy', () => {
            this.menu = null
          })

          this.menus.push(this.menu)
        })
      }
    }
    this.ui.list.appendChild(item)
    return this
  }

  onClick (ev) {
    if (ev.target.classList.contains('sub')) return
    const name = ev.target.getAttribute('name')
    if (name) {
      this.emit('select', name)
    }
  }

  destroyMenu (menu) {
  // Trouver l'index de menuToDestroy dans this.menus
    const index = this.menus.indexOf(menu)

    // Si trouvé, supprimer le menu du tableau
    if (index > -1) {
      this.menus.splice(index, 1)
    }

    // Appeler la méthode destroy sur le menuToDestroy
    menu.destroy()
  }

  close () {
    // console.log('')
    this.menus.forEach(menu => {
      menu.destroy()
    })
    this.menus = []
    this.destroy()
  }
}

export default Menu
