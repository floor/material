'use strict';


import init from './component/init';
import classify from './component/classify';
import events from './component/events';
import insert from './component/insert';

import create from './element/create';

import bind from './module/bind';
import merge from './module/merge';
import emitter from './module/emitter';



// options
const defaults = {
  prefix: 'material',
  class: 'component',
  tag: 'div',
  modules: [emitter, events, bind, insert]
};

/**
 * Base class for all ui components
 * @class
 * @namespace Material
 * @param {Object} options - The component options
 * @return {Object} The class Instance
 */
export default class Component {

  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance 
   */
  constructor(options) {
    this.options = merge(defaults, options);

    init(this);
    this.build(this.options);

    if (this.options.bind) {
      this.bind(this.options.bind);
    }

    return this;
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build(options) {

    var tag = options.tag || 'div';
    this.wrapper = create(tag, options.css);

    classify(this.wrapper, options);

    if (options.container) {
      this.insert(options.container);
    }

    return this;
  }
}