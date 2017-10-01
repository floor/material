'use strict'

import init from './component/init'
import insert from './element/insert'
import classify from './component/classify'
import css from './module/css'
import events from './component/events'
import create from './element/create'
import merge from './module/merge'
import emitter from './module/emitter'

const defaults = {
  prefix: 'material',
  class: 'drawer',
  modifier: 'width',
  state: 'closed',
  position: 'left',
  tag: 'div',
  modules: [emitter, events]
}

/**
 * Class representing a UI Container. Can add components.
 *
 * @extends Component
 * @return {parent} The class instance
 * @example new Container({
 *   container: document.body
 * });
 */
class Drawer {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = merge(defaults, options || {})

    init(this)

    this.build(this.options)

    this.emit('ready')

    return this
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build (options) {
    this.wrapper = create('aside')

    classify(this.wrapper, options)

    if (options.position) { css.add(this.wrapper, 'position-' + options.position) }

    if (options.size) {
      if (options.position === 'top' || options.position === 'bottom') {
        this.wrapper.style = 'height: ' + options.size + 'px;'
      } else {
        this.wrapper.style = 'width: ' + options.size + 'px;'
      }
    }

    if (options.container) { insert(this.wrapper, options.container) }

    if (!this.options.state) {
      this.state = 'opened'
    }

    this.emit('built', this.wrapper)

    return this
  }

  /**
   * [toggle description]
   * @return {Object} The class instance
   */
  toggle () {
    if (this.state === 'opened') {
      this.close()
    } else {
      this.open()
    }

    return this
  }

  /**
   * [minimize description]
   * @return {Object} The class instance
   */
  close () {
    css.remove(this.wrapper, 'show')
    css.remove(this.underlay, 'show')
    this.state = 'closed'

    this.emit(this.state)

    return this
  }

  /**
   * [normalize description]
   * @return {Object} The class instance
   */
  open () {
    this.emit('open')
    if (!this.underlay) { this.underlay = create('div', 'drawer-underlay') }

    insert(this.underlay, this.wrapper.parentNode, 'top')
    this.underlay.addEventListener('click', (e) => {
      this.close()
    })
    setTimeout(() => {
      css.add(this.underlay, 'show')
    }, 10)

    css.add(this.wrapper, 'show')
    this.state = 'opened'
    this.emit(this.state)

    return this
  }

  /**
   * [insert description]
   * @param  {?} container [description]
   * @param  {?} context   [description]
   * @return {?}           [description]
   */
  insert (container, context) {
    insert(this.wrapper, container, context)

    return this
  }
}

export default Drawer
