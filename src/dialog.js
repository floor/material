'use strict'

// dialog related modules
import merge from './module/merge'
import events from './component/events'
import emitter from './module/emitter'
import controller from './component/controller'
import bind from './module/bind'
import insert from './component/insert'
import event from './element/event.js'
import css from './module/css'

import Layout from './layout'

let defaults = {
  prefix: 'material',
  class: 'dialog',
  bind: {
    'wrapper.click': 'close'
  }
}

class Dialog {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor(options) {
    // init and build
    this.init(options)
    this.build()

    if (this.options.bind) {
      this.bind(this.options.bind)
    }

    this.wrapper.style.display = 'none'

    return this
  }

  /**
   * Constructor
   * @param  {Object} options The class options
   * @return {Object} This class instance
   */
  init(options) {
    // init options and merge options to defaults
    options = options || {}
    this.options = merge(defaults, options || {})

    // implement modules
    Object.assign(this, events, emitter, bind, insert)

    this.controller = controller

    return this
  }

  /**
   * build the component using the super method
   * @return {Object} The class instance
   */
  build() {
    var tag = this.options.tag || 'div'
    // this.wrapper = new Element(this.options.element);
    this.wrapper = document.createElement(tag)

    css.add(this.wrapper, 'material-dialog')
    if (this.options.css) {
      css.add(this.wrapper, this.options.css)
    }

    this.surface = document.createElement(tag)

    css.add(this.surface, 'dialog-surface')

    this.insertElement(this.surface, this.wrapper)

    this.options.layout.wrapper = this.surface
    this.layout = new Layout(this.options.layout)

    event.add(this.surface, 'click', function(ev) {
      ev.stopPropagation()
    })

    // this.wrapper = element.createElement(tag);
  }

  close() {
    css.add(this.wrapper, 'dialog-closing')

    var delayMillis = 200 // 1 second
    setTimeout(() => {
      this.wrapper.style.display = 'none'
      css.remove(this.wrapper, 'dialog-closing')
      css.remove(this.wrapper, 'dialog-show')
    }, delayMillis)
  }

  show() {
    this.wrapper.style.display = 'flex'
    // css.add(this.wrapper, 'dialog-showing');

    var delayMillis = 100 // 1 second

    setTimeout(() => {
      css.add(this.wrapper, 'dialog-show')
      // css.remove(this.wrapper, 'dialog-showing');
    }, delayMillis)
  }
}

export default Dialog