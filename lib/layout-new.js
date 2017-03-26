'use strict';

import Component from './component';
import Emitter from './module/emitter';
import classify from './component/classify';
import merge from './module/merge';
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
    //super.init(defaults);

    this.options = merge(defaults, options);
    console.log('this.options', this.options);


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

    Object.assign(this, classify, Emitter);


    this._name = this.constructor.name.toLowerCase();



    Object.assign(this, component, resizer);

    this.section = {};
    this.sections = [];

    // this.settings = this.controller.getSettings('app-' + this.options.appname);
    // //console.log('settings', this.settings);

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



    this._component = new Component(options);



    this.element = this._component.element;





    this._component.addClass(this.options.prefix + '-' + this._name);


    this.addClass('ui-layout');
    this.addClass('layout-standard');


    //console.log('build', options, this.element);

    // if (this.options.theme) {
    //   this.addClass('theme-' + layout.theme);
    // }

    // this.settings = this.options.settings || {};

    // this.component = {};
    // this.components = [];
    this.resizer = {};

    options.container = this.element;
    //options.component = this;

    this.render(options);

    return this;
  }

  /**
   * [_process description]
   * @param  {Object} node Layout structure
   * @return {string} type type of node e. tab
   */
  render(section, type, level) {
    level = level++ || 1;

    var options = section.options;


    this._initDirection(section.container, section.axis);

    if (section.sections) {
      //console.log('element', this.element);
      this.renderSection(section, type, level);
    }

    return this;

  }


  renderSection(section, type, level) {
    var sections = section.sections;
    var container = section.container;
    console.log('renderSection', sections, type, level);
    for (var i = 0, len = sections.length; i < len; i++) {
      var property = sections[i];

      //console.log('property', property.name);

      var options = property.options || {};

      options.container = container;
      // manage shortcut

      options.flex = options.flex || property.flex;
      options.hide = options.hide || property.hide;
      options.theme = options.theme || property.theme;
      options.size = options.size || property.size;

      if (section.axis == 'y' && options.size) {
        options.height = options.size;
      } else if (options.size) {
        options.width = options.size;
      }

      options.component = property.component || Component;

      options.type = property.type || options.type;
      options.name = options.name || property.name;
      options.text = options.text || property.text;
      options.position = i + 1;
      options.nComp = sections.length;

      if (i === sections.length - 1) {
        options.last = true;
      }

      // options.flex = options.flex || comp.flex;
      // options.hide = options.hide || comp.hide;
      // options.theme = options.theme || comp.theme;

      var component = this._initComponent(options);

      component.addClass(this._name + '-' + 'section');
      component.addClass('section-' + property.name);

      property.container = component.element;

      console.log('property.sections', options.name, property);

      if (property.sections) {
        this.render(property, null, level);
      }
    }
  }

  insert(container, context, debug) {
    this._component.insert(container, context, debug);
  }

  style(style) {
    this._component.style(style);
  }
  _resize() {
    console.log('resize');
  }

  /**
   * [_initFlexDirection description]
   * @param  {Element} container Init direction for the given container
   * @param  {string} axis (x,y)
   */
  _initDirection(element, axis) {
    if (!element) return;
    var modifier;
    axis = axis || 'x';

    if (axis === 'x') {
      element.className += ' ' + 'flex-raw';
    } else if (axis === 'y') {
      element.className += ' ' + 'flex-column';
    }
  }
}
