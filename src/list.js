'use strict'

import { Item, Divider } from '../index'

import init from './component/init'
import emitter from './module/emitter'
import insert from './element/insert'
import merge from './module/merge'
import css from './module/css'
import bind from './module/bind'

const defaults = {
  prefix: 'material',
  class: 'list',
  functions: ['render', 'select'],
  modules: [emitter, bind],
  target: '.material-item',
  bind: {
    'wrapper.click': 'onSelect'
  }
}

/**
 * List view class
 * @class
 * @param {Object} options Default options for view
 * @extends {View}
 * @since 0.0.4
 * @author Jerome Vial
 *
 * @type {prime}
 */
class List {
  /**
   * init
   * @return {Object} The class options
   */
  constructor (options) {
    this.options = merge(defaults, options || {})

    this.init(this.options)
    this.build(this.options)
    this.bind(this.options.bind)

    return this
  }

  /**
   * [_initView description]
   * @return  Class instance
   */
  init (options) {
    init(this)

    this.options.class = options.class
    this.name = options.name

    this.filters = []
    this.data = []
    this.items = []

    // assign modules
    Object.assign(this, emitter, bind)

    // init function
    this._initFunction(options.functions)

    return this
  }

  /**
   * [_initFunction description]
   * @param  {?} functions [description]
   * @return {?}           [description]
   */
  _initFunction (functions) {
    for (var i = 0; i < functions.length; i++) {
      var name = functions[i]
      if (this.options[name]) {
        this[name] = this.options[name]
      }
    }
  }

  /**
   * [_initList description]
   * @param  {Object} options this class options
   * @return {Object} The class instance
   */
  build (options) {
    // define main tag
    var tag = this.options.tag || 'div'

    this.wrapper = document.createElement(tag)
    css.add(this.wrapper, 'material-' + this.options.class)

    if (options.name) {
      css.add(this.wrapper, options.class + '-' + options.name)
    }

    if (this.options.list) {
      this.set('list', this.options.list)
    }

    if (this.options.container) {
      insert(this.wrapper, this.options.container)
    }

    // this.wrapper.addEventListener("click", function(e) {
    //   // console.log("list", this, e);
    //   // e.target was the clicked element
    // });

    return this
  }

  /**
   * [onSelect description]
   * @param  {?} e [description]
   * @return {?}   [description]
   */
  onSelect (e) {
    // console.log('onSelect', e.target, this.options.target);
    if (e.target && e.target.matches(this.options.target)) {
      // console.log("item clicked: ", e.target);
      css.remove(this.item, 'is-selected')
      css.add(e.target, 'is-selected')

      this.select(e.target, e, this.item)
      this.item = e.target
    }
  }

  /**
   * select
   * @param  {Element} item  [description]
   * @param  {event} event The caller event
   * @return        [description]
   */
  select (item, e, selected) {
    this.emit('select', item)
  }

  /**
   * [render description]
   * @param  {?} info [description]
   * @return {?}      [description]
   */
  render (info) {
    var item

    if (info.type === 'divider') {
      item = new Divider()
    } else {
      item = new Item({
        name: info.name,
        text: info.name
      })
    }

    return item
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   */
  set (prop, value, options) {
    switch (prop) {
      case 'list':
        this.setList(value, options)
        break
      default:
        this.setList(prop, options)
    }

    return this
  }

  /**
   * Set list
   * @param {Array} list List of info object
   * @return {Object} The class instance
   */
  setList (list) {
    for (var i = 0; i < list.length; i++) {
      this.addItem(this.render(list[i]), i)
    }

    return this
  }

  /**
   * [add description]
   * @param {Object} item [description]
   */
  addItem (item /*, index */) {
    if (!item) {
      return
    }

    var where = 'bottom'
    insert(item.wrapper, this.wrapper, where)

    this.items.push(item)

    return item
  }

  empty () {
    this.wrapper.innerHTML = ''
    this.items = []
    this.item = null
  }

  /**
   * Reverse the list order
   * @return {Object} The class instance
   */
  reverse () {
    this.list.reverse()
    this.update(this.list)

    return this
  }
}

export default List
