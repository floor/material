'use strict';

// base class
import Component from 'component';

import Text from 'text';
import Image from 'image';

import classify from 'component/classify';
import merge from 'module/merge';

// modules
import control from 'control';
import ripple from 'component/ripple';

var defaults = {
  base: 'ui',
  type: 'control', // push, file
  tag: 'span',
  layout: {
    axis: 'x',
    sections: [{
      component: Text,
      name: 'text',
      type: 'button'
    }, {
      component: Image,
      name: 'icon',
      code: 'mdi-content-inbox'
    }]
  },
  // components: [{
  //   tag: 'label.ui-text'
  // }],
  // ripple: {
  //   duration: '300',
  //   equation: 'ease-out'
  // },
  bind: {
    'click': '_onClick',
    'mousedown': ['_onMouseDown', '_showRipple'],
    'mouseup': ['_onMouseUp', '_hideRipple'],
    'mouseout': ['_onMouseOut', '_hideRipple']
  }
};

/**
 * Button control class
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
class Button {

  /**
   * The init method of the Button class
   * @param  {Object} options [description]
   * @private
   * @return {Object} The class instance
   */
  constructor(options) {
    console.log('constructor options', options);

    this.options = merge(defaults, options);
    console.log('this.options', this.options);


    this.init();
    this.build();


    // if (this.options.bind) {
    //   this.bind(this.options.bind);
    // }

    return this;
  }


  init(options) {

    options = options || this.options;

    Object.assign(this, classify);
    Object.assign(this, control);
    Object.assign(this, ripple);
    this._name = this.constructor.name.toLowerCase();
  }


  /**
   * Build button's method
   * @override
   * @return {void}
   */
  build(options) {
    options = options || this.options;

    this._component = new Component(options);

    this.element = this._component.element;

    this._component.addClass(this.options.prefix + '-' + this._name);
  }

  /**
   * [_onElementMouseDown description]
   * @param  {event} e
   * @return {void}
   */
  press(e) {
    e.preventDefault();

    if (this.state === 'disabled') return;

    this.emit('press', e);

    return this;
  }

  on(name, cb) {
    return this._component.on(name, cb);
  }


  insert(container, context, debug) {
    this._component.insert(container, context, debug);
  }

  style(style) {
    this._component.style(style);
  }

  /**
   * _onClick
   * @param  {Event} e The related event
   */
  _onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    this.press(e);
  }

  /**
   * _onMouseDown description
   * @param  {Event} e The related event
   */
  _onMouseDown(e) {
    //console.log('_onMouseDown');
    e.preventDefault();
    e.stopPropagation();
    this.addClass('is-active');
  }

  /**
   * _onMouseDown description
   * @param  {Event} e The related event
   */
  _onMouseUp(e) {
    //console.log('_onMouseUp');
    // e.preventDefault();
    // e.stopPropagation();

    this.removeClass('is-active');
  }

  /**
   * _onMouseDown description
   * @param  {Event} e The related event
   */
  _onMouseOut(e) {
    e.preventDefault();
    e.stopPropagation();
    this.removeClass('is-active');
  }
}

module.exports = Button;
