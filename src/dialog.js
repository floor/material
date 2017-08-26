'use strict';

import Layout from './layout';
import Component from './component';
import Text from './text';
import Button from './button';
import merge from './module/merge';
import events from './component/events';
import Emitter from './module/emitter';
import Controller from './component/controller';
import bind from './module/bind';
import insert from './component/insert';
//import Element from './element/element';
import build from './element/build';
import css from './module/css';
import event from './element/event.js';
// element related modules


let defaults = {
  prefix: 'material',
  bind: {
    'element.click': 'close'
  }
};

class Dialog {

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

    this.element.style.display = 'none';

    return this;
  }

  /**
   * Constructor
   * @param  {Object} options The class options
   * @return {Object} This class instance
   */
  init(options) {
    // init options and merge options to defaults
    options = options || {};
    this.options = merge(defaults, options);

    this.class = this._name = this.constructor.name.toLowerCase();
    this.name = this.options.name;
    this.value = this.options.value;
    this.checked = this.options.checked;
    this.disabled = this.options.disabled;

    // implement modules
    Object.assign(this, events, Emitter, bind, insert);

    this.controller = new Controller();



    return this;

  }

  /**
   * build the component using the super method
   * @return {Object} The class instance
   */
  build() {
    var tag = this.options.tag || 'div';
    //this.element = new Element(this.options.element);
    this.element = document.createElement(tag);

    css.add(this.element, 'material-dialog');
    if (this.options.class)
      css.add(this.element, this.options.class);

    this.surface = document.createElement(tag);

    css.add(this.surface, 'dialog-surface');

    this.insertElement(this.surface, this.element);

    this.options.layout.element = this.surface;
    this.layout = new Layout(this.options.layout);


    event.add(this.surface, 'click', function(ev) {
      ev.stopPropagation();
    });


    // this.element = element.createElement(tag);

  }

  close() {
    css.add(this.element, 'dialog-closing');

    var delayMillis = 200; //1 second
    var self = this;
    setTimeout(function() {
      self.element.style.display = 'none';
      css.remove(self.element, 'dialog-closing');
      css.remove(self.element, 'dialog-show');
    }, delayMillis);
  }

  show() {
    this.element.style.display = 'flex';
    //css.add(this.element, 'dialog-showing');

    var delayMillis = 100; //1 second

    var self = this;
    setTimeout(function() {
      css.add(self.element, 'dialog-show');
      //css.remove(self.element, 'dialog-showing');
    }, delayMillis);


  }

}

module.exports = Dialog;