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
  width: '340',
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
  build () {
    this.root = create('aside')

    classify(this.root, this.options)

    if (this.options.position) { css.add(this.root, 'position-' + this.options.position) }

    if (this.options.size) {
      if (this.options.position === 'top' || this.options.position === 'bottom') {
        this.root.style = 'height: ' + this.options.size + 'px;'
      } else {
        this.root.style = 'width: ' + this.options.size + 'px;'
      }
    }

    if (this.options.container) { insert(this.root, this.options.container) }

    this.emit('built', this.root)

    return this
  }

  /**
   * [toggle description]
   * @return {Object} The class instance
   */
  toggle () {
    console.log('toggle', this.root);
    if (this.root.classList.contains('show')) {
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
    console.log('close');
    css.remove(this.root, 'show')
    css.remove(this.underlay, 'show')

    return this
  }

  /**
   * [normalize description]
   * @return {Object} The class instance
   */
  open () {
    console.log('open');

    css.add(this.root, 'show')

    if (this.options.type === 'temporary') {
      this.showUnderlay()
    }

    
    return this
  }

  showUnderlay() {
    console.log('showUnderlay');

    if (!this.underlay) { 
      this.underlay = create('div', 'drawer-underlay')
      insert(this.underlay, this.root.parentNode, 'top')
    }

    this.underlay.addEventListener('click', (e) => {
      console.log('underlay click close');
      this.close()
    })
    setTimeout(() => {
      css.add(this.underlay, 'show')
    }, 10)

  }

  /**
   * [insert description]
   * @param  {?} container [description]
   * @param  {?} context   [description]
   * @return {?}           [description]
   */
  insert (container, context) {
    insert(this.root, container, context)

    return this
  }
}

export default Drawer
