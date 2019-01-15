'use strict'

// dialog related modules
import events from './component/events'
import emitter from './module/emitter'
import controller from './component/controller'
import attach from './module/attach'
import insert from './component/insert'
import event from './element/event.js'
import css from './module/css'
import { _isArray } from './module/utils'

import {
  Text,
  Button,
  Toolbar,
  Layout
} from 'material'

let defaults = {
  prefix: 'material',
  class: 'dialog',
  tag: 'div',
  events: [
    ['root.click', 'close']
  ]
}

class Dialog {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.init(options)
    this.build()
    this.attach()

    this.root.style.display = 'none'

    return this
  }

  /**
   * Constructor
   * @param  {Object} options The class options
   * @return {Object} This class instance
   */
  init (options) {
    // init options
    this.options = Object.assign({}, defaults, options || {})

    // implement modules
    Object.assign(this, events, emitter, attach, insert)

    this.controller = controller

    return this
  }

  /**
   * build the component using the super method
   * @return {Object} The class instance
   */
  build () {
    this.root = document.createElement('div')

    css.add(this.root, 'material-dialog')
    if (this.options.css) {
      css.add(this.root, this.options.css)
    }

    if (this.options.theme) {
      css.add(this.root, this.options.theme + '-theme')
    }

    this.surface = document.createElement('div')

    css.add(this.surface, 'dialog-surface')

    this.insertElement(this.surface, this.root)

    if (this.options.title) {
      this.buildTitle()
    }

    if (this.options.content) {
      this.buildContent()
    }

    this.buildActions()

    event.add(this.surface, 'click', function (ev) {
      ev.stopPropagation()
    })
  }

  buildTitle () {
    this.title = new Text({
      type: 'title',
      css: 'dialog-title',
      text: this.options.title
    })

    this.insertElement(this.title.root, this.surface)

    console.log('buildTitle', this.title)
  }

  buildContent () {
    console.log('buildContent', typeof this.options.content)
    if (typeof this.options.content === 'string') {
      console.log('text content', this.options.content)
      this.content = new Text({
        type: 'content',
        css: 'dialog-content',
        text: this.options.content
      })

      this.insertElement(this.content.root, this.surface)
    } else if (_isArray(this.options.content)) {
      this.content = new Layout(this.options.content, this.surface)
      console.log('layout content', this.content)
    } else {
      console.log('other content', this.content)
    }
  }

  buildActions () {
    if (this.options.actions) {
      this.actions = new Layout(this.options.actions, this.surface)

      css.add(this.actions.get('root'), 'dialog-actions')
    } else {
      var actions
      if (this.options.accept || this.options.cancel) {
        actions = new Toolbar({ css: 'dialog-actions' })
        this.insertElement(actions.root, this.surface)
      }

      if (this.options.cancel) {
        this.cancel = new Button(this.options.cancel)
        .on('click', () => {
          this.emit('canceled')
          this.close()
        })
        this.insertElement(this.cancel.root, actions.root)
      }

      if (this.options.accept) {
        this.accept = new Button(this.options.accept)
        .on('click', () => {
          this.emit('accepted')
          this.close()
        })
        this.insertElement(this.accept.root, actions.root)
      }
    }
  }

  close () {
    css.add(this.root, 'dialog-closing')

    var delayMillis = 200 // 1 second
    setTimeout(() => {
      this.root.style.display = 'none'
      css.remove(this.root, 'dialog-closing')
      css.remove(this.root, 'dialog-show')
    }, delayMillis)

    this.previousActive.focus()
  }

  show () {
    this.previousActive = document.activeElement

    this.root.style.display = 'flex'
    // css.add(this.root, 'dialog-showing');

    var delayMillis = 100 // 1 second

    setTimeout(() => {
      css.add(this.root, 'dialog-show')
      // css.remove(this.root, 'dialog-showing');
    }, delayMillis)

    // var button = this.root.querySelector('button')

    // if (button) button.focus()
  }
}

export default Dialog
