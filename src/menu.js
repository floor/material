import {
  Control, Element, display
} from '../index'

import position from './mixin/position'

class Menu extends Control {
  static defaults = {
    class: 'menu',
    mixins: [display, position],
    underlay: true,
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
    super(options)

    this.setup()

    this.render(this.options.items)
  }

  setup () {
    this.menus = []
    this.closeTimeout = null
    this.closeDelay = 300

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
        if (obj.items && Array.isArray(obj.items)) {
          // Clear any pending close timeout when entering submenu trigger
          if (this.closeTimeout) {
            clearTimeout(this.closeTimeout)
            this.closeTimeout = null
          }
        } else {
          // For non-submenu items, schedule submenu close with delay
          if (this.menu) {
            if (this.closeTimeout) {
              clearTimeout(this.closeTimeout)
            }
            this.closeTimeout = setTimeout(() => {
              if (this.menu) {
                this.menu.destroy()
                this.menu = null
              }
              this.closeTimeout = null
            }, this.closeDelay)
          }
        }
      })

      if (obj.items && Array.isArray(obj.items)) {
        item.classList.add('sub')

        item.addEventListener('mouseenter', () => {
          // Clear any pending close timeout
          if (this.closeTimeout) {
            clearTimeout(this.closeTimeout)
            this.closeTimeout = null
          }

          // Destroy existing submenu before creating new one
          if (this.menu) {
            this.menu.destroy()
            this.menu = null
          }

          this.menu = new Menu({
            class: 'floating',
            target: item,
            container: this.options.container,
            underlay: false,
            parentName: obj.name,
            items: obj.items
          }).position(item, {
            align: 'left',
            vAlign: 'inline',
            offsetX: 8,
            offsetY: 8
          }).show()

          // When mouse enters the submenu, cancel any close timeout
          this.menu.element.addEventListener('mouseenter', () => {
            if (this.closeTimeout) {
              clearTimeout(this.closeTimeout)
              this.closeTimeout = null
            }
          })

          this.menu.on('select', (value, name) => {
            this.emit('select', `${obj.name}:${value}`, name)
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
    const value = ev.target.getAttribute('name')
    const name = ev.target.innerHTML
    if (value) {
      this.emit('select', value, name)
    }
  }

  destroyMenu (menu) {
    const index = this.menus.indexOf(menu)

    // Si trouvé, supprimer le menu du tableau
    if (index > -1) {
      this.menus.splice(index, 1)
    }

    menu.destroy()
  }

  close () {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout)
      this.closeTimeout = null
    }
    this.menus.forEach(menu => {
      menu.destroy()
    })
    this.menus = []
    this.destroy()
  }
}

export default Menu
