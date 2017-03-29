'use strict';

import Emitter from './module/emitter';
import Layout from './layout';
import Controller from './component/controller';
import bind from './module/bind';
import merge from './module/merge';
// element related modules
import element from './component/element';

// dependencies
import attribute from './component/attribute';
import classify from './component/classify';
import events from './component/events';

import style from './component/style';
import dom from './module/dom';
import storage from './component/storage';

// options
let defaults = require('./component/options');

/**
 * Base class for all ui components
 * @class
 * @namespace Material
 * @param {Object} options - The component options
 * @return {Object} The class Instance
 */
module.exports = class Component {

  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance 
   */
  constructor(options) {
    //super();

    //this.emit('init');
    //this.options = merge(defaults, options);

    this.init(options);
    this.build();

    if (this.options.bind) {
      this.bind(this.options.bind);
    }

    return this;
  }

  /**
   * Initialized component
   * @return {Object} The class instance
   */
  init(options) {
    this._name = this.constructor.name.toLowerCase();

    options = options || this.options;
    //this.options = [defaults, options].reduce(Object.assign, {});
    //
    options = options || {};
    this.options = merge(defaults, options);

    this.name = this.options.name;

    // merge options

    // implement module
    Object.assign(this,
      Emitter,
      storage,
      events,
      classify,
      style,
      attribute,
      bind
    );

    this.document = window.document;

    this.controller = new Controller();

    return this;
  }


  setOptions(options) {

    console.log(this.options, options);

    Object.assign(this.options, [defaults, options].reduce(Object.assign, {}));
  }


  getOptions() {

    return this.options;
  }



  /**
   * Build Method
   * @return {Object} This class instance
   */
  build() {
    var opts = this.options;

    this.emit('create');

    var tag = opts.tag || 'div';
    this.element = element.createElement(tag);

    this.initAttributes();
    this.setState(this.options.state);
    this.classify(this._name, this.options);

    this.emit('created');

    if (this.options.layout) {
      console.log('layout', this.options.layout);
      this.options.layout.container = this.element;

      this.layout = new Layout(this.options.layout);
    } else if (this.options.components) {
      this.buildComponents();
    }

    this.content = element;

    // insert if container options is given
    if (opts.container) {
      //console.log(this.name, opts.container);
      this.insert(opts.container);
    }

    this.controller.register(this);

    return this;
  }

  /**
   * build component inner components
   * @return {[type]} [description]
   */
  buildComponents() {

      //console.log('buildComponents', this._name);

      this.component = {};
      this.components = [];

      var opts = this.options.components;

      for (var i = 0; i < opts.length; i++) {
        var options = opts[i];
        this.addComponent(options);
      }
    }
    /**
     * Add inner component
     * @param {optios} options Inner compoonent options
     */
  addComponent(options) {
    var idx = this.identifyComponent(options);
    var properties = options.props || options.properties || {};

    properties.tag = options.tag;

    //console.log('prop', idx, properties, this.element);

    var component = this.component[idx] = new Component(properties);
    component.insert(this.element);

    this.components.push(component);
  }

  /**
   * Give the inner comenent a unique identifier based on the tag
   * if it already existe, it add an index. For example input, input2
   * this can be overrided using idx or ident
   * @param  {options} options [description]
   * @return {idx}         The given idx
   */
  identifyComponent(options) {
    var tags = options.tag.split(/\./);
    var tag = tags[0];

    let identity = options.idx || options.ident || options.identity || tag;

    let index = 0;
    let idx = identity;

    while (this.component[idx]) {
      index++;
      idx = identity + index;
    }

    return idx;
  }

  /**
   * Inject method insert element to the domtree using Dom methods
   * @param {HTMLElement} container [description]
   * @param  {string} context - Injection context
   * @return {Object} This class intance
   */
  insert(container, context) {

    this.emit('insert');
    this.container = container;

    if (container && container.element) {
      container = container.element;
    } else if (container instanceof HTMLElement) {
      container = container;
    } else {
      throw new Error("Can't insert " + container + " is not a HTMLElement object");
    }

    context = context || 'bottom';

    var contexts = ['top', 'bottom', 'after', 'before'];
    var methods = ['prepend', 'append', 'after', 'before'];

    var index = contexts.indexOf(context);
    if (index === -1) {
      return;
    }

    var method = methods[index];

    this.emit('insert');

    // insert component element to the dom tree using Dom
    dom[method](container, this.element);

    this.isInjected = true;
    this.emit('injected');
    return this;
  }

  /**
   * [show description]
   * @return {Object} The class instance
   */
  show() {
    this.emit('show');
    this.element.show();

    return this;
  }

  /**
   * [hide description]
   * @return {Object} The class instance
   */
  hide() {
    this.emit('hide');
    this.element.hide();

    return this;
  }

  /**
   * [dispose description]
   * @return {Object} The class instance
   */
  dispose() {
    var el = this.element;
    return (el.parentNode) ? el.parentNode.removeChild(el) : el;
  }

  /**
   * empty
   * @return {void}
   */
  empty() {
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }
  }

  /**
   * [destroy description]
   * @return {Object} this class
   */
  destroy() {
    this.element.parentNode.removeChild(this.element);

    return this;
  }

}
