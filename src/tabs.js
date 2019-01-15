'use strict'

import create from './component/create'
import insert from './component/insert'
import emitter from './module/emitter'

import offset from './element/offset'

import List from './list'
import Button from './button'

const defaults = {
  prefix: 'material',
  class: 'tabs',
  tag: 'div',
  indicator: {
    prefix: 'material',
    class: 'indicator',
    tag: 'div'
  }
}

class Tabs {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.init(options)
    this.build()

    return this
  }

  init (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, insert, emitter)
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build () {
    this.root = create(this.options)

    if (this.options.list) {
      this.list = new List({
        // root: this.root,
        list: this.options.list,
        target: '.material-button',
        height: 600,
        label: 'Flat',

        render: (info) => {
          var item

          item = new Button({
            name: info.name,
            text: info.text || info.name
          })

          return item
        },
        select: (item) => {
          console.log('click')
          this.selected = item
          this.click(item)
        }
      }).insert(this.root)
    }

    this.indicator = create(this.options.indicator)
    this.insertElement(this.indicator, this.root)

    if (this.options.container) {
      this.insert(this.options.container)
    }

    return this
  }

  click (item) {
    var or = offset(this.root)
    var o = offset(item)
    this.indicator.setAttribute('style', 'width: ' + o.width + 'px; left: ' + (o.left - or.left) + 'px;')
    this.emit('select', item.dataset.name)
  }
}

export default Tabs
