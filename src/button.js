'use strict';

import init from './component/init';
import events from './component/events';
import classify from './component/classify';

import emitter from './module/emitter';
import create from './element/create';
import css from './module/css';
import merge from './module/merge';
import insert from './element/insert';
import bind from './module/bind';
// modules
import control from './control';
import ripple from './component/ripple';

var defaults = {
  prefix: 'material',
  class: 'button',
  tag: 'button',
  ripple: {
    duration: '500',
    equation: 'ease-out'
  },
  modules: [control, ripple, events, emitter, bind],
  bind: {
    'wrapper.click': 'click',
    'wrapper.mousedown': ['_onMouseDown', '_showRipple'],
    'wrapper.mouseup': ['_onMouseUp', '_hideRipple'],
    'wrapper.mouseout': ['_onMouseOut', '_hideRipple']
  }
};

/**
 * Button component
 * @class
 * @since 0.0.1
 * @example
 * var button = new Button({
 *   label: 'Button raised',
 *   type: 'raised',
 *   color: 'primary'
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

    init(this);
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
  init() {

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
    this.wrapper = create(tag, this.options.prefix + '-' + this.options.class);


    classify(this.wrapper, this.options);



    if (this.options.name) {
      //console.log('name', this.options.name);
      this.wrapper.dataset.name = this.options.name;
    }

    if (this.label) {
      this.wrapper.title = this.label;
    }

    if (this.options.icon) {
      this.buildIcon(this.options.type, this.options.icon || this.options.name);
    }

    this.buildLabel();

    if (this.options.type) {
      css.add(this.wrapper, 'type-' + this.options.type);
    }

    if (this.options.style) {
      var styles = this.options.style.split(/\ /);
      for (var i = 0; i < styles.length; i++) {
        css.add(this.wrapper, 'style-' + styles[i]);
      }
    }

    if (this.options.content) {
      this.wrapper.innerHTML = this.options.content;
    }

    // insert if container options is given
    if (this.options.container) {
      //console.log(this.name, opts.container);
      insert(this.wrapper, this.options.container);
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

    this.label = create('label', this.options.class + '-label');

    if (text) {
      this.label.textContent = text;
    }

    insert(this.label, this.wrapper);
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

    insert(this.icon, this.wrapper);

    css.add(this.icon, this.options.class + '-icon');

    css.add(this.wrapper, 'icon-text');

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
      css.add(this.wrapper, 'is-disabled');
    } else {
      css.remove(this.wrapper, 'is-disabled');
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

    console.log('emit press', e);
    this.emit('press', e);

    return this;
  }

  insert(container, context) {
    insert(this.wrapper, container, context);

    return this;
  }

  /**
   * _onClick
   * @param  {Event} e The related event
   */
  click(e) {
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
  //   css.add(this.wrapper, 'is-active');
  // }

  /**
   * _onMouseDown description
   * @param  {Event} e The related event
   */
  _onMouseUp(e) {
    //console.log('_onMouseUp');
    // e.preventDefault();
    // e.stopPropagation();

    css.remove(this.wrapper, 'is-active');
  }

  /**
   * _onMouseDown description
   * @param  {Event} e The related event
   */
  _onMouseOut(e) {
    e.preventDefault();
    e.stopPropagation();
    css.remove(this.wrapper, 'is-active');
  }
}

export default Button;