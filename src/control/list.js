// menu related modules
import emitter from '../module/emitter'
import attach from '../module/attach'
import build from '../module/build'
import display from '../module/display'

import Layout from '../layout'
import Element from '../element'
import Button from './text'

const defaults = {
  class: 'list',
  layout: [
    [Element, 'main', { tag: 'ul' }]
  ],
  item: [Text, { tag: 'li' }],
  events: [
    ['ui.main.click', 'select']
  ]
}

class List {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})
    // implement modules
    Object.assign(this, emitter, build, attach, display)

    this.build()

    return this
  }

  add (items) {
    for (var i = 0; i < list.length; i++) {
      if (i < list.length - 1) {
        text = text + list[i] + this.options.seprator
      } else {
        text = text + list[i]
      }
    }

    // console.log('set', text)
    if (text === undefined) return

    var label = this.options.label || ''

    this.element.innerHTML = label + text

    if (this.options.spaceAfter) {
      this.element.innerHTML = this.element.innerHTML + ' '
    }
  }

  select()

  setText (text) {
    // console.log('setText', text)
    this.element.innerHTML = text
  }
}

export default List
