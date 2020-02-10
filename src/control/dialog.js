'use strict'

// dialog related modules
import emitter from '../module/emitter'
import attach from '../module/attach'
import display from '../view/display'

import Element from '../element'
import Text from './text'
import Button from './button'
import Layout from '../layout'

let defaults = {
  class: 'dialog',
  layout: [
    [Element, 'head', { class: 'head' },
      [Text, 'title', { class: 'title' }],
      [Button, 'close', { class: 'close' }]
    ],
    [Element, 'body', { class: 'body' },
      [Text, 'content', { class: 'content' }]
    ],
    [Element, 'foot', { class: 'foot' },
      [Button, 'ok', { class: 'ok', text: 'Ok' }]
    ]
  ],
  events: [
    ['ui.close', 'close'],
    ['ui.ok.click', 'ok'],
    ['ui.cancel.click', 'cancel']
  ]
}

class Dialog {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})

    // implement modules
    Object.assign(this, emitter, attach, display)

    this.build()
    this.attach()

    return this
  }

  /**
   * Constructor
   * @param  {Object} options The class options
   * @return {Object} This class instance
   */
  init (options) {
    // init options

  }

  /**
   * build the component using the super method
   * @return {Object} The class instance
   */
  build () {
    this.root = document.createElement('div')
    this.root.classList.add('dialog')

    if (this.options.class !== 'dialog') {
      this.root.classList.add(this.options.class)
    }

    if (this.options.display === 'show') {
      this.show()
    }

    this.surface = document.createElement('div')
    this.surface.classList.add('surface')
    this.root.appendChild(this.surface)

    this.layout = new Layout(this.options.layout, this.surface)
    this.ui = this.layout.component

    if (this.options.container) {
      this.options.container.appendChild(this.root)
    }
  }

  render () {
    if (this.options.title && this.ui.title) {
      this.ui.title.set(this.options.title)
    }

    if (this.options.content && this.ui.content) {
      this.ui.body.set(this.options.body)
    }

    if (this.options.cancel && this.ui.cancel) {
      this.ui.cancel.set(this.options.cancel)
    }

    if (this.options.ok && this.ui.ok) {
      this.ui.ok.set('text', this.options.ok)
    }
  }

  ok () {
    this.emit('ok')
  }

  cancel () {
    this.emit('cancel')
  }

  close () {
    this.hide()
  }

  emphase () {
    this.root.classList.add('emphase')
    var it
    it = setTimeout(() => {
      clearTimeout(it)
      this.root.classList.remove('emphase')
    }, 100)
  }

  set (prop, value) {
    if (this.ui[prop]) {
      this.ui[prop].set(value)
    }
  }
}

export default Dialog
