'use strict';

import Emitter from './module/emitter';
import Controller from './component/controller';
import insert from './component/insert';

import css from './module/css';
import merge from './module/merge';
import bind from './module/bind';

import style from './element/style';

//import container from './layout/container';
import component from './layout/component';
import resizer from './layout/resizer';

import defaults from './layout/options';

/**
 * The Layout view
 * @class
 */
module.exports = class Layout {

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

    // if (this.options.bind) {
    //   this.bind(this.options.bind);
    // }

    return this;
  }

  /**
   * initiate class
   * @param  {Object} options The class options
   * @return {Object} The class instance
   */
  init(options) {
    options = options || this.options;

    Object.assign(this, Emitter, component, resizer, insert);

    this._name = this.constructor.name.toLowerCase();
    this.element = this.options.element;
    this.container = this.options.container;

    this.component = {};
    this.components = [];
    this.settings = this.options.settings || {};

    // this.settings = this.controller.getSettings('app-' + this.options.appname);
    // //console.log('settings', this.settings);

    this.controller = new Controller();

    window.addEventListener('resize', () => {
      this.emit('resize');
    });

    return this;
  }

  /**
   * Build
   * @return {Object} [description]
   */
  build(options) {
    options = options || this.options;

    if (!this.element) {
      this.element = document.createElement(options.tag);
    }

    console.log('build', this.element);

    css.add(this.element, 'material' + '-' + this._name);
    css.add(this.element, this._name + '-' + options.name);
    //component.addClass(component._name + '-' + component.name);
    //console.log('build', options, this.element);

    this.resizer = {};

    options.container = this.element;

    if (this.container) {
      this.insert(this.container, this.context);
    }

    this._render(options);

    return this;
  }

  /**
   * [_process description]
   * @param  {Object} node Layout structure
   * @return {string} type type of node e. tab
   */
  _render(component, level) {
    level = level++ || 1;

    var options = component.options;

    this._initPosition(component.container, component.position);
    this._initStyles(component.container, component.styles);
    this._initDisplay(component.container, component.display, component.direction);

    if (component.components) {
      this._renderComponents(component, level);
    }

    return this;
  }

  /**
   * [renderSection description]
   * @param  {[type]} component [description]
   * @param  {[type]} type    [description]
   * @param  {[type]} level   [description]
   * @return {[type]}         [description]
   */
  _renderComponents(component, level) {
    var components = component.components;
    var container = component.container;
    //console.log('_renderComponents', components, type, level);
    for (var i = 0, len = components.length; i < len; i++) {
      var property = components[i];

      //console.log('property', property.name);

      var options = property.options || {};

      options.container = container;
      // manage shortcut

      options.flex = options.flex || property.flex;
      options.hide = options.hide || property.hide;
      options.theme = options.theme || property.theme;
      options.size = options.size || property.size;

      if (component.direction == 'vertical' && options.size) {
        options.height = options.size;
      } else if (options.size) {
        options.width = options.size;
      }


      if (!property.component) {
        //console.log('property component', this.options.component);
      }

      options.component = property.component || this.options.component;

      //options.type = property.type || options.type;
      options.name = options.name || property.name;
      options.text = options.text || property.text;
      options.position = i + 1;
      options.nComp = components.length;

      if (i === components.length - 1) {
        options.last = true;
      }

      // options.flex = options.flex || comp.flex;
      // options.hide = options.hide || comp.hide;
      // options.theme = options.theme || comp.theme;

      console.log('_initComponent', options);
      var component = this._initComponent(options);

      css.add(component.element, component._name + '-' + component.options.name);
      // component.addClass(this._name + '-' + 'component');
      // component.addClass('component-' + property.name);

      property.container = component.element;

      //console.log('property.components', options.name, property);

      if (property.components) {
        this._render(property, level);
      }
    }
  }

  /**
   * [_resize description]
   * @return {[type]} [description]
   */
  _resize() {
    console.log('resize');
  }

  _initPosition(element, position) {
    if (!position) return;
    console.log('_initPosition', element, position);
    style.set(element, {
      position: position
    });
  }

  _initStyles(element, styles) {
    if (!styles) return;
    console.log('_initStyles', element, styles);
    style.set(element, styles);
  }

  /**
   * [_initFlexDirection description]
   * @param  {Element} container Init direction for the given container
   * @param  {string} direction (horizontal,vertical)
   */
  _initDisplay(element, display, direction) {
    if (!element || !display) return;
    console.log('_initFlex', element, direction);

    var modifier;
    direction = direction || this.options.direction;

    if (direction === 'horizontal') {
      element.className += ' ' + 'flex-raw';
    } else if (direction === 'vertical') {
      element.className += ' ' + 'flex-column';
    }
  }
}
