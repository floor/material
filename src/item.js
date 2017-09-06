'use strict';

import init from './component/merge';
import merge from './module/merge';
import create from './element/create';
import events from './component/events';
import emitter from './module/emitter';
import bind from './module/bind';
import insert from './component/insert';
// element related modules


var defaults = {
  prefix: 'material',
  class: 'item',
  node: null,
  module: [events, emitter, bind, insert]
};

/**
 * The item class is used for example as item list
 *
 * @class
 * @extends {Component}
 * @return {Object} The class instance
 * @example new Item(object);
 */
class Item {

  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance 
   */
  constructor(options) {
    this.options = merge(defaults, options);
    init(this);
    this.build();

    if (this.options.bind) {
      this.bind(this.options.bind);
    }

    return this;
  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */

  /**
   * build the component using the super method
   * @return {Object} The class instance
   */
  build() {
    var tag = this.options.tag || 'div';
    this.wrapper = create(tag, this.options.prefix + '-' + this.options.class);

  }

  /**
   * [focus description]
   * @return {void}
   */
  set(value) {
    this.wrapper.innerHTML(value);

    return this;
  }
}

export default Item;