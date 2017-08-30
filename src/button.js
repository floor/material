'use strict';

// base class
import Text from './text';
import Image from './image';

import events from './component/events';
import Emitter from './module/emitter';
import css from './module/css';
import merge from './module/merge';
import insert from './element/insert';
import bind from './module/bind';

// modules
import control from './control';
import ripple from './component/ripple';

var defaults = {
  prefix: 'material',
  tag: 'button',
  ripple: {
    duration: '500',
    equation: 'ease-out'
  },
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
    this.options = merge(defaults, options);

    this.init();
    this.build();

    if (this.options.bind) {
      this.bind(this.options.bind);
    }

    return this;
  }

  /**
   * [init description]
   * @param  {[type]} options [description]
   * @return {[type]}         [description]
   */
  init(options) {
    Object.assign(
      this,
      control,
      ripple,
      events,
      Emitter,
      bind
    );

    this.class = this._name = this.constructor.name.toLowerCase();
    this.name = this.options.name;
    this.label = this.options.text || this.options.label;

    return this;
  }

  /**
   * Build button's method
   * @override
   * @return {void}
   */
  build(options) {
    options = options || this.options;

    var tag = this.options.tag || 'div';
    this.element = document.createElement(tag);

    css.add(this.element, this.options.prefix + '-' + this.class);

    if (this.options.css) {
      css.add(this.element, this.options.css);
    }

    if (this.options.icon) {
      this.buildIcon(this.options.type, this.options.icon || this.options.name);
    }


    if (this.options.name) {
      console.log('name', this.options.name);
      this.element.dataset.name = this.options.name;
    }

    if (this.label) {
      this.element.title = this.label;
    }

    this.buildLabel();

    if (this.options.type) {
      css.add(this.element, 'type-' + this.options.type);
    }

    if (this.options.style) {
      var styles = this.options.style.split(/\ /);
      for (var i = 0; i < styles.length; i++) {
        css.add(this.element, 'style-' + styles[i]);
      }
    }

    if (this.options.color) {
      css.add(this.element, this.options.color + '-color');
    }

    if (this.options.content) {
      this.element.innerHTML = this.options.content;
    }

    // insert if container options is given
    if (this.options.container) {
      //console.log(this.name, opts.container);
      insert(this.element, this.options.container);
    }

    return this;
  }

  /**
   * [initLabel description]
   * @return {[type]} [description]
   */
  buildLabel(label) {
    label = label || this.label;

    if (this.options.label === null) return;

    let text = this.options.label || this.options.text;

    this.label = document.createElement('label');
    css.add(this.label, this.class + '-label');
    this.label.textContent = text;
    insert(this.label, this.element);
  }

  /**
   * [_initIcon description]
   * @param  {string} type
   * @return {string}
   */
  buildIcon(type, name) {

    var position = 'top';
    if (this.options.type === 'text-icon') {
      position = 'bottom';
    }

    var tag = 'i';
    this.icon = document.createElement(tag);

    insert(this.icon, this.element);

    css.add(this.icon, this.class + '-icon');

    css.add(this.element, 'icon-text');

    if (name)
      css.add(this.icon, name);
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   * @return {Object} The class instance
   */
  set(prop, value) {

    switch (prop) {
      case 'disabled':
        this.setDisabled(value);
        break;
      case 'value':
        this.setValue(value);
        break;
      case 'label':
        this.setLabel(value);
        break;
      default:
        this.setValue(prop);
    }

    return this;
  }

  setDisabled(value) {
    this.disabled = value;

    if (this.disabled) {
      css.add(this.element, 'is-disabled');
    } else {
      css.remove(this.element, 'is-disabled');
    }
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

  insert(container, context) {
    insert(this.element, container, context);

    return this;
  }

  /**
   * _onClick
   * @param  {Event} e The related event
   */
  _onClick(e) {
    // e.preventDefault();
    // e.stopPropagation();

    if (this.disabled) return;
    if (this.options.upload) return;

    this.press(e);
  }


  // /**
  //  * _onMouseDown description
  //  * @param  {Event} e The related event
  //  */
  // _onMouseDown(e) {
  //   //console.log('_onMouseDown');
  //   e.preventDefault();
  //   e.stopPropagation();
  //   css.add(this.element, 'is-active');
  // }

  /**
   * _onMouseDown description
   * @param  {Event} e The related event
   */
  _onMouseUp(e) {
    //console.log('_onMouseUp');
    // e.preventDefault();
    // e.stopPropagation();

    css.remove(this.element, 'is-active');
  }

  /**
   * _onMouseDown description
   * @param  {Event} e The related event
   */
  _onMouseOut(e) {
    e.preventDefault();
    e.stopPropagation();
    css.remove(this.element, 'is-active');
  }
}

module.exports = Button;