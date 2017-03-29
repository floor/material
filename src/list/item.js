'use strict';

//import Component from './component';
import merge from '../module/merge';
import insert from '../component/insert';
import css from '../module/css';
// import bind from '../module/bind';


var defaults = {
  prefix: 'material',
  tag: {
    default: 'span',
    display4: 'h1',
    display3: 'h1',
    display2: 'h1',
    display1: 'h1',
    headline: 'h1',
    title: 'h2',
    subheading2: 'h3',
    subheading1: 'h4',
    body: 'p',
    body2: 'aside',
    caption: 'span'
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
module.exports = class Item {

  /**
   * init
   * @return {Object} The class options
   */
  constructor(options) {

    this.init(options);
    this.build();

    return this;
  }

  /**
   * [init description]
   * @param  {[type]} options [description]
   * @return {[type]}         [description]
   */
  init(options) {

    // merge options
    this.options = merge(defaults, options);

    // define _name
    this._name = this.constructor.name.toLowerCase();

    // assign modules
    Object.assign(this, insert);

  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */
  build(options) {
    options = options || this.options;

    // define main tag
    var tag = options.tag[options.type] || options.tag.default;

    this.element = document.createElement(tag);

    if (options.text) {
      this.set(options.text);
    }

    css.add(this.element, this.options.prefix + '-' + this._name);

    if (options.type) {
      css.add(this.element, this._name + '-' + options.type);
    }

    if (this.options.container) {
      this.insert(this.options.container);
    }
  }

  /**
   * Get or set text value of the element
   * @param {string} value The text to set
   * @returns {*}
   */
  set(value) {
    if (value) {
      if (this.element.innerText) {
        this.element.innerText = value;
      } else {
        this.element.textContent = value;
      }

      return this;
    }

    return this;
  }
};
