'use strict';

import emitter from './module/emitter';
import controller from './component/controller';
import insert from './component/insert';

import css from './module/css';
import merge from './module/merge';
//import bind from './module/bind';
import style from './element/style';

import defaults from './layout/options';
import component from './layout/component';

/**
 * The Layout view
 * @class
 */
class Layout {

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

    Object.assign(this, emitter, component, insert);


    this.wrapper = this.options.wrapper;
    this.container = this.options.container;

    this.component = {};
    this.components = [];
    this.settings = this.options.settings || {};

    this.controller = controller;

    // window.addEventListener('resize', () => {
    //   this.emit('resize');
    // });

    return this;
  }

  /**
   * Build
   * @return {Object} [description]
   */
  build(options) {
    options = options || this.options;

    if (!this.wrapper) {
      this.wrapper = document.createElement(options.tag);
    }

    css.add(this.wrapper, 'material' + '-' + this.options.class);
    css.add(this.wrapper, this.options.class + '-' + options.name);
    //component.addClass(component.class + '-' + component.name);
    //console.log('build', options, this.wrapper);

    this.resizer = {};

    options.container = this.wrapper;

    if (this.container) {
      this.insert(this.container, this.context);
    }

    this._render(options);

    return this;
  }

  get(value) {
    return this.component[value];
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
   * @param  {?} component [description]
   * @param  {?} type    [description]
   * @param { ?} level   [description]
   * @return {?}         [description]
   */
  _renderComponents(component, level) {
    var components = component.components;

    var wrapper = component.wrapper;

    var container = component.container;
    //console.log('_renderComponents', components, type, level);
    for (var i = 0, len = components.length; i < len; i++) {
      var property = components[i];

      // console.log('property', property.name);

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
      options.type = options.type || property.type;
      options.position = i + 1;
      options.nComp = components.length;

      if (i === components.length - 1) {
        options.last = true;
      }

      // options.flex = options.flex || comp.flex;
      // options.hide = options.hide || comp.hide;
      // options.theme = options.theme || comp.theme;

      //console.log('_initComponent', options);
      var component = this._initComponent(options);

      if (component.options.name) {
        css.add(wrapper, component.class + '-' + component.options.name);
      }
      // component.addClass(this.options.class + '-' + 'component');
      // component.addClass('component-' + property.name);

      property.container = component.content || component.wrapper;

      //console.log('property.components', options.name, property);

      if (property.components) {
        this._render(property, level);
      }
    }
  }

  /**
   * [_resize description]
   * @return {?} [description]
   */
  _resize() {
    console.log('resize');
  }

  _initPosition(element, position) {
    if (!position) return;
    //console.log('_initPosition', element, position);
    style.set(element, {
      position: position
    });
  }

  /**
   * [_initStyles description]
   * @param  {?} element [description]
   * @param  {?} styles  [description]
   * @return {?}         [description]
   */
  _initStyles(element, styles) {
    if (!styles) return;
    //console.log('_initStyles', element, styles);
    style.set(element, styles);
  }

  /**
   * [_initFlexDirection description]
   * @param  {Element} container Init direction for the given container
   * @param  {string} direction (horizontal,vertical)
   */
  _initDisplay(element, display, direction) {
    if (!element || !display) return;
    //console.log('_initFlex', element, direction);

    var modifier;
    direction = direction || this.options.direction;

    if (direction === 'horizontal') {
      element.className += ' ' + 'flex-raw';
    } else if (direction === 'vertical') {
      element.className += ' ' + 'flex-column';
    }
  }
}

export default Layout;