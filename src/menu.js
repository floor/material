'use strict'

import classify from './module/classify'
import css from './module/css'
import events from './mixin/events'
import insert from './element/insert'
import offset from './element/offset'

import create from './element/create'

import attach from './module/attach'
import emitter from './module/emitter'

import List from './list'
import Item from './item'
import Divider from './divider'

const defaults = {
  prefix: 'material',
  class: 'menu',
  tag: 'div',
  events: [
    ['root.click', 'hide'],
    ['mask.click', 'hide']
  ]
}

/**
 * This Class represents a menu.
 *
 * @return {parent} The class instance
 * @example new Container({
 *   container: document.body
 * });
 */
class Menu {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.init(options)
    this.build()
    this.setup()

    this.attach()

    this.emit('ready')

    return this
  }

  /**
   * [init description]
   * @return {[type]} [description]
   */
  init (options) {
    this.options = Object.assign({}, defaults, options || {})

    Object.assign(this, emitter, events, attach, insert)
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build () {
    this.element = create(this.options.tag, this.options.css)
    this.mask = create(this.options.tag, this.options.class + '-mask')

    if (this.options.position) {
      this.element.style.position = this.options.position
    }

    classify(this.element, this.options)

    if (this.options.list) {
      this.list = new List({
        // root: this.element,
        list: this.options.list,
        target: '.material-item',
        height: 600,
        label: 'Flat',
        select: (item) => {
          this.selected = item
          this.hide()
        }
      }).insert(this.element)
    }

    this.emit('built', this.element)

    return this
  }

  insert () {
    insert(this.mask, document.body)
    insert(this.element, document.body)
  }

  setup () {
    // this.subscribe('click', () => {
    //   console.log('click');
    //   this.close();
    // });
    //
    window.addEventListener('resize', () => this.position())
  }

  show (e) {
    css.add(this.mask, 'mask-show')

    if (e) this.caller = e.target

    css.add(this.element, this.options.class + '-show')
    this.position(this.caller)
  }

  position () {
    if (!this.caller) return
    var offs = offset(this.caller)

    var offsw = this.offset = offset(this.element)

    // console.log('offset')
    // console.log('caller', this.caller, offs, screen.width)

    this.element.style.top = offs.top + 'px'
    this.element.style.left = offs.left - offsw.width + offs.width + 'px'
    // this.element.style.right = offs.right + offs.width + offsw.width  + 'px'
  }

  hide () {
    // console.log('hide')
    css.remove(this.element, this.options.class + '-show')
    css.remove(this.mask, 'mask-show')
  }
}

export default Menu
