'use strict'

import init from './component/init'
import insert from './element/insert'
import classify from './component/classify'
import css from './module/css'
import events from './component/events'
import create from './element/create'
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
  constructor(options) {
    this.options = Object.assign({}, defaults, options || {})

    init(this)

    this.build()

    this.emit('ready')

    return this
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build() {
    this.wrapper = create('aside')

    classify(this.wrapper, this.options)

    if (this.options.position) { css.add(this.wrapper, 'position-' + this.options.position) }

    if (this.options.size) {
      if (this.options.position === 'top' || this.options.position === 'bottom') {
        this.wrapper.style = 'height: ' + this.options.size + 'px;'
      } else {
        this.wrapper.style = 'width: ' + this.options.size + 'px;'
      }
    }

    if (this.options.container) { insert(this.wrapper, this.options.container) }

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
  toggle() {
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
  close() {
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
  open() {
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
  insert(container, context) {
    insert(this.wrapper, container, context)

    return this
  }
}

export default Drawer