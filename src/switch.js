'use strict';

//import control from '../control';
import init from './component/init';
import merge from './module/merge';
import build from './element/build';
import emitter from './module/emitter';
import insert from './component/insert';
import bind from './module/bind';
import css from './module/css';
import classify from './component/classify';

import Component from './component';

let defaults = {
  prefix: 'material',
  class: 'switch',
  type: 'control',
  label: null,
  checked: false,
  error: false,
  value: false,
  modules: [emitter, bind, insert],
  build: ['wrapper', 'div', 'material-switch', {},
    [
      ['input', 'input', 'switch-input', { type: 'checkbox' }],
      ['control', 'span', 'switch-control', {},
        [
          ['track', 'span', 'switch-track', {},
            [
              ['knob', 'span', 'switch-knob', {}]
            ]
          ]
        ]
      ],
      ['label', 'label', 'switch-label'],
    ]
  ],
  bind: {
    'element.control.click': 'toggle',
    //'label.click': 'toggle',
    // for accessibility purpose
    'element.input.focus': '_onInputFocus',
    'element.input.blur': '_onInputBlur'
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
   * @param  {Object} options
- Component options
   * @return {Object} Class instance 
   */
  constructor(options) {
    this.options = merge(defaults, options);

    this.init(this);
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

    this.value = this.options.value;

    return this;

  }

  /**
   * build method
   * @return {Object} The class instance
   */
  build(options) {

    this.element = build(options.build);
    this.wrapper = this.element.wrapper;

    classify(this.wrapper, options);

    console.log('wrapper', this.wrapper);

    // var tag = this.options.tag || 'div';
    // this.wrapper = create(tag, this.options.prefix + '-' + this.options.class);


    if (options.disabled) {
      this.element.input.setAttribute('disabled', 'disabled');
      this.disabled = true;
      css.add(this.wrapper, 'is-disabled');
    }

    if (this.value) {
      this.element.input.setAttribute('checked', 'checked');
    }

    let text = options.label || options.text || '';

    this.element.label.textContent = text;

    if (this.value) {
      this.check();
    }

    // insert if container options is given
    if (options.container) {
      //console.log(this.name, opts.container);
      this.insert(options.container);
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
    css.add(this.wrapper, 'is-checked');
    this.element.input.checked = true;
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
    css.remove(this.wrapper, 'is-checked');
    this.element.input.checked = false;
    this.emit('change', this.value);

    return this;
  }
  disable() {

    this.input.setAttribute('disabled', 'disabled');
    css.add(this.wrapper, 'is-disabled');
    this.disabled = true;
  }

  enable() {
    this.element.input.setAttribute('disabled', null);
    css.remove(this.wrapper, 'is-disabled');
    this.disabled = false;
  }
}

export default Switch;