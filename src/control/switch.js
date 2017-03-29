'use strict';

//import control from '../control';
import Component from '../component';
import merge from '../module/merge';

import Emitter from '../module/emitter';
import Controller from '../component/controller';
import bind from '../module/bind';
import insert from '../component/insert';
import css from '../module/css';
// element related modules
import element from '../component/element';

// dependencies
//import attribute from '../component/attribute';
//import classify from '../component/classify';
//import events from '../component/events';

let defaults = {
  // base: 'field',
  prefix: 'material',
  type: 'control',
  label: null,
  checked: false,
  error: false,
  value: false,
  bind: {
    'control.click': 'toggle',
    //'label.click': 'toggle',
    // for accessibility purpose
    'input.focus': '_onInputFocus',
    'input.blur': '_onInputBlur'
  }
};

/**
 * Switch class
 * @class
 * @extends Control
 */
class Switch {

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
   * Constructor
   * @param  {Object} options The class options
   * @return {Object} This class instance
   */
  init(options) {

    // init options and merge options to defaults
    options = options || {};
    this.options = merge(defaults, options);

    this._name = this.constructor.name.toLowerCase();

    // implement modules
    Object.assign(this, Emitter, bind, insert);

    this.document = window.document;

    this.controller = new Controller();
    this.value = this.options.value;

    return this;

  }

  /**
   * build method
   * @return {Object} The class instance
   */
  build() {

    var tag = this.options.tag || 'div';
    this.element = element.createElement(tag);

    css.add(this.element, this.options.prefix + '-' + this._name);

    let text = this.options.label || this.options.text;

    if (this.options.disabled) {
      this.disabled = true;
      css.add(this.element, 'is-disabled');
    }

    this.initInput();
    this.initControl();
    // this.wrapper = new Component({tag: 'div.switch-wrapper'}).insert(this.element);

    if (this.options.label !== null) {
      this.label = new Component({
        tag: 'span.switch-label'
      }).insert(this.element);
      this.label.text(text);
    }

    if (this.value) {
      this.check();
    }

    // insert if container options is given
    if (this.options.container) {
      //console.log(this.name, opts.container);
      this.insert(this.options.container);
    }
  }

  /**
   * [initControl description]
   * @return {[type]} [description]
   */
  initControl() {
    this.control = new Component({
      tag: 'span.switch-control'
    }).insert(this.element);

    this.track = new Component({
      tag: 'span.switch-track'
    }).insert(this.control);

    this.knob = new Component({
      tag: 'span.switch-knob'
    }).insert(this.track);

  }

  /**
   * [initInput description]
   * @return {[type]} [description]
   */
  initInput() {
    this.input = new Component({
      tag: 'input',
      type: 'checkbox',
      name: this.options.name
    }).insert(this.element);

    if (this.options.disabled) {
      this.input.setAttribute('disabled', 'disabled');
    }

    if (this.value) {
      this.input.setAttribute('checked', 'checked');
    }
  }


  _onInputFocus(e) {

  }


  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   * @return {Object} The class instance
   */
  set(prop, value) {

    switch (prop) {
      case 'value':
        this.setValue(value);
        break;
      case 'state':
        if (value === 'enabled') {
          this.enable();
        } else if (value === 'disabled') {
          this.disable();
        }
      default:
        this.setValue(prop);
    }

    return this;
  }

  get() {
    return this.value;
  }


  /**
   * set switch value
   * @param {boolean} value [description]
   */
  getValue(value) {
    return this.value;
  }

  /**
   * set switch value
   * @param {boolean} value [description]
   */
  setValue(value) {
    if (value) {
      this.check();
    } else {
      this.unCheck();
    }
  }

  /**
   * [toggle description]
   * @return {Object} The class instance
   */
  toggle() {
    console.log('toggle');

    if (this.value) {
      this.unCheck(true);
    } else {
      this.check();
    }

    return this;
  }


  /**
   * setTrue
   */
  check() {
    if (this.disabled) {
      return this;
    }
    this.value = true;
    css.add(this.element, 'is-checked');
    this.input.element.checked = true;
    this.emit('change', this.value);

    return this;
  }

  /**
   * setFlas
   */
  unCheck() {
    if (this.disabled) {
      return this;
    }

    this.value = false;
    css.remove(this.element, 'is-checked');
    this.input.element.checked = false;
    this.emit('change', this.value);

    return this;
  }
  disable() {

    this.input.setAttribute('disabled', 'disabled');
    css.add(this.element, 'is-disabled');
    this.disabled = true;
  }

  enable() {
    this.input.setAttribute('disabled', null);
    css.remove(this.element, 'is-disabled');
    this.disabled = false;
  }
}

module.exports = Switch;
