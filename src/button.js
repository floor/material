'use strict';

import init from './component/init';
import events from './component/events';
import classify from './component/classify';
import ripple from './component/ripple';

import emitter from './module/emitter';
import create from './element/create';
import css from './module/css';
import merge from './module/merge';
import insert from './element/insert';
import bind from './module/bind';
// modules
import control from './control';

const defaults = {
  prefix: 'material',
  class: 'button',
  tag: 'button',
  modules: [events, control, emitter, bind, ripple],
  build: [],
  bind: {
    'wrapper.click': 'click'
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

    this.init();
    this.emit('ready');

    return this;
  }

  /**
   * [init description]
   * @param  {?} options [description]
   * @return {?}         [description]
   */
  init() {
    init(this);
    this.build();
    this.setup();
    this.bind(this.options.bind);
    this.emit('init');
  }

  /**
   * Build button's method
   * @override
   * @return {void}
   */
  build() {

    var tag = this.options.tag || 'div';
    this.wrapper = create(tag, this.options.prefix + '-' + this.options.class);

    classify(this.wrapper, this.options);

    if (this.options.icon) {
      this.buildIcon(this.options.type, this.options.icon || this.options.name);
    }

    this.buildLabel();

    if (this.options.type) {
      css.add(this.wrapper, 'type-' + this.options.type);
    }

    // insert if container options is given
    if (this.options.container) {
      insert(this.wrapper, this.options.container);
      this.emit('injected', this.wrapper);
    }

    this.emit('built', this.wrapper);

    return this;
  }

  insert(container, context) {
    insert(this.wrapper, container, context);

    return this;
  }

  setup() {
    if (this.options.name) {
      //console.log('name', this.options.name);
      this.wrapper.dataset.name = this.options.name;
    }

    if (this.label) {
      this.wrapper.title = this.label;
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


  }

  /**
   * [initLabel description]
   * @return {?} [description]
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
    this.icon = create(tag, this.options.class + '-icon');
    css.add(this.wrapper, 'icon-text');
    insert(this.icon, this.wrapper);

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
        this.disable(value);
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

  /**
   * [disable description]
   * @param  {?} boolean [description]
   * @return {?}         [description]
   */
  disable() {
    this.disabled = true;
    css.add(this.wrapper, 'is-disabled');

    return this;
  }

  /**
   * [disable description]
   * @param  {?} boolean [description]
   * @return {?}         [description]
   */
  enable() {
    this.disabled = false;
    css.remove(this.wrapper, 'is-disabled');

    return this;
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
}

export default Button;