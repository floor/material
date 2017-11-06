'use strict'

import create from './element/create'
import classify from './component/classify'
import css from './module/css'
import events from './component/events'
import insert from './element/insert'
import offset from './element/offset'

import attach from './module/attach'
import emitter from './module/emitter'

import List from './list'
import Item from './item'
import Divider from './divider'

const defaults = {
  prefix: 'material',
  class: 'menu',
  tag: 'input',
  events: [
    ['wrapper.click', 'hide'],
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
  build (options) {
    this.wrapper = create(tag, options.css)
    this.mask = create(tag, this.options.class + '-mask')

    classify(this.wrapper, options)

    if (this.options.list) {
      this.list = new List({
        // wrapper: this.wrapper,
        list: this.options.list,
        target: '.material-item',
        height: 600,
        label: 'Flat',
        select: (item) => {
          this.selected = item
          this.hide()
        }
      }).insert(this.wrapper)
    }

    this.emit('built', this.wrapper)

    return this
  }

  insert () {
    insert(this.mask, document.body)
    insert(this.wrapper, document.body)
  }

  setup () {
    // this.subscribe('click', () => {
    //   console.log('click');
    //   this.close();
    // });
    //
    window.addEventListener('resize', () => this.position())
  }

  /**
   * [show description]
   * @param  {[type]} e [description]
   * @return {[type]}   [description]
   */
  show (e) {
    css.add(this.mask, 'mask-show')

    if (e) this.caller = e.target

    css.add(this.wrapper, this.options.class + '-show')
    this.position(this.caller)
  }

  /**
   * [position description]
   * @return {[type]} [description]
   */
  position () {
    if (!this.caller) return
    var offs = offset(this.caller)

    var offsw = offset(this.wrapper)

    this.wrapper.style.top = offs.top + 'px'
    this.wrapper.style.left = offs.left - offsw.width + offs.width + 'px'
    // this.wrapper.style.right = offs.right + offs.width + offsw.width  + 'px'
  }

  /**
   * [hide description]
   * @return {[type]} [description]
   */
  hide () {
    console.log('hide')
    css.remove(this.wrapper, this.options.class + '-show')
    css.remove(this.mask, 'mask-show')
  }
}

export default Menu
