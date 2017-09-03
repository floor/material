'use strict';

import merge from './module/merge';
import events from './component/events';
import Emitter from './module/emitter';
import controller from './component/controller';
import bind from './module/bind';
import insert from './component/insert';
import css from './module/css';
// element related modules
import element from './component/element';

var defaults = {
  prefix: 'naterial',
  class: 'item',
  node: null,
  component: ['name'],
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
    // init and build
    this.init(options);
    this.build();

    if (this.options.bind) {
      this.bind(this.options.bind);
    }

    return this;
  }

  /**
   * init
   * @return {Object} The class options
   */
  init(options) {
    console.log('init item');
    // init options and merge options to defaults
    options = options || {};
    this.options = merge(defaults, options);



    // implement modules
    Object.assign(this, events, Emitter, bind, insert);

    this.controller = controller;

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
    this.wrapper = element.createElement(tag);

    css.add(this.wrapper, this.options.prefix + '-' + this.options.class);
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