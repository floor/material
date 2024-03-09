import create from './mixin/create'
import insert from './mixin/insert'
import emitter from './module/emitter'

import offset from './element/offset'

import List from './list'
import Button from './button'
import Element from './element'

class Tabs {
  static defaults = {
    prefix: 'material',
    class: 'tabs',
    tag: 'div',
    indicator: {
      prefix: 'material',
      class: 'indicator',
      tag: 'div'
    }
  }

  constructor (options) {
    this.init(options)
    this.build()

    return this
  }

  init (options) {
    this.options = { ...Tabs.defaults, ...options }
    Object.assign(this, insert, emitter)
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build () {
    this.element = create(this.options)
    this.tab = { }
    if (this.options.list) {
      this.list = new List({
        tag: 'div',
        container: this.element,
        list: this.options.list,
        target: '.material-button',
        height: 600,
        label: 'Flat',

        render: (info) => {
          let item
          if (info.type === 'divider') {
            item = new Element({ class: 'divider' })
          } else {
            item = new Button({
              name: info.name,
              text: info.text || info.name,
              tooltip: info.tootip
            })
          }

          this.tab[info.name] = item

          return item
        },
        select: (item) => {
          this.selected = item
          this.click(item)
        }
      })
    }

    this.indicator = create(this.options.indicator)
    this.insertElement(this.indicator, this.element)

    if (this.options.container) {
      this.insert(this.options.container)
    }

    return this
  }

  select (tab) {
    // console.log('select', tab, this.tab)
    this.selected = this.tab[tab]
    this.click(this.selected.element, true)
  }

  click (item, silent) {
    // console.log('clickitem', item, this.element);
    const or = offset(this.element)
    const o = offset(item)
    this.indicator.setAttribute('style', 'width: ' + o.width + 'px; left: ' + (o.left - or.left) + 'px;')

    if (!silent) { this.emit('select', item.dataset.name) }
  }
}

export default Tabs
