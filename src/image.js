'use strict';

import Component from './component';
import classify from './component/classify';
import merge from './module/merge';

var defaults = {
  prefix: 'ui',
  component: ['name'],
  element: {
    tag: 'span'
  }
};

/**
 * The item class is used for example as item list
 *
 * @class
 * @extends {Component}
 * @return {Object} The class instance
 * @example new Item(object);
 */
module.exports = class Image {

  /**
   * init
   * @return {Object} The class options
   */
  constructor(options) {
    console.log('field options', options);
    //super.init(defaults);

    this.options = merge(defaults, options);
    console.log('this.options', this.options);


    this.init();
    this.build();

    return this;
  }

  init(options) {
    Object.assign(this, classify);

    this._name = this.constructor.name.toLowerCase();
  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */
  build(options) {
    options = options || this.options;

    this._component = new Component(options);

    this.element = this._component.element;

    if (options.text) {
      this.set(options.text);
    }

    this._component.addClass(this.options.prefix + '-' + this._name);
    this._component.addClass(this._name + '-' + options.type);



    // super.build();

    // var text = this.options.text || this.options.label;

    // console.log('-!-', this.options.type);

    // if (this.options.type) {

    //   this.addClass(this._name + '-' + this.options.type);
    // }

    // if (text) {
    //   this.set(text);
    // }

    // return this;
  }

  insert(container, context, debug) {
    this._component.insert(container, context, debug);
  }

  style(style) {
    this._component.style(style);
  }

  /**
   * [focus description]
   * @return {void}
   */
  set(value) {
    this._component.text(value);

    return this;
  }
};
