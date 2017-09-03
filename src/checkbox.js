'use strict';


import init from './component/init';
import controller from './component/controller';
import merge from './module/merge';
import events from './component/events';
import control from './component/control';
import emitter from './module/emitter';
import bind from './module/bind';
import insert from './element/insert';
//import Element from './element/element';
import build from './element/build';
import css from './module/css';
// element related modules

let defaults = {
  prefix: 'material',
  class: 'checkbox',
  type: 'control',
  modules: [events, control, emitter, bind],
  build: ['wrapper', 'div', 'material-checkbox', {},
    [
      ['input', 'input'],
      ['control', 'span', 'checkbox-control'],
      ['label', 'label', 'checkbox-label']
    ]
  ],
  binding: [
    ['element.control.click', 'click', {}],
    ['element.label.click', 'toggle', {}],
    // for accessibility purpose
    ['element.input.click', 'toggle', {}],
    ['element.input.focus', 'focus'],
    ['element.input.blur', 'blur']
  ]
};

/**
 * Checkbox control class
 * @class
 * @extends Control
 * @since 0.0.1
 * @example
 * var button = new Button({
 *   label: 'Primary raised button',
 *   type: 'raised',
 *   primary: true
 * }).on('press', function(e) {
 *   console.log('button press', e);
 * }).insert(document.body);
 */
class Checkbox {

  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance 
   */
  constructor(options) {
    this.options = merge(defaults, options);
    // init and build
    this.init(this.options);
    this.build(this.options);

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
    init(this);
    // init options and merge options to defaults
    options = options || this.options;

    this.name = this.options.name;
    this.value = this.options.value;
    this.checked = this.options.checked;
    this.disabled = this.options.disabled;

    return this;
  }

  /**
   * build the component using the super method
   * @return {Object} The class instance
   */
  build(options) {
    this.element = build(this.options.build);
    this.wrapper = this.element.wrapper;

    let text = this.options.label || this.options.text;
    this.element.label.textContent = text;

    this.element.input.setAttribute('name', this.name);
    this.element.input.setAttribute('value', this.value);

    if (this.disabled) {
      this.element.input.setAttribute('disabled', 'disabled');
    }

    if (this.checked) {
      this.element.input.setAttribute('checked', 'checked');
    }

    this.set(this.value);

    // insert if container options is given
    if (this.options.container) {
      insert(this.wrapper, this.options.container);
    }

    return this;
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   * @return {Object} The class instance
   */
  set(prop, value) {
    switch (prop) {
      case 'checked':
        this.check(value);
        break;
      case 'value':
        this.setValue(value);
        break;
      case 'label':
        this.setLabel(value);
        break;
      default:
        this.check(prop);
    }

    return this;
  }

  insert(container, context) {
    insert(this.wrapper, container, context);

    return this;
  }

  click(ev) {
    console.log('_onInputFocus', this.wrapper);
    //css.add(this.element.wrapper, 'is-focused');
    this.toggle();
    this.element.input.focus();
  }

  /**
   * [_onInputFocus description]
   * @return {[type]} [description]
   */
  focus(ev) {
    console.log('_onInputFocus', this.wrapper);
    css.add(this.wrapper, 'is-focused');
    //this.element.input.focus();
  }

  /**
   * [_onInputBlur description]
   * @return {[type]} [description]
   */
  blur(ev) {
    console.log('blur', this.wrapper);
    css.remove(this.wrapper, 'is-focused');
  }

  /**
   * Set checkbox value
   * @param {boolean} value [description]
   */
  setValue(value) {
    console.log('setValue', value);
    this.value = value;
    this.element.input.setAttribute('value', value);
  }
}

export default Checkbox;