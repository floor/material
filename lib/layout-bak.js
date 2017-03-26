'use strict';

import Component from './component';


//import container from './layout/container';
import component from './layout/component';
import resizer from './layout/resizer';

import defaults from './layout/options';

/**
 * The Layout view
 * @class
 */
class Layout extends Component {

  /**
   * initiate class
   * @param  {Object} options The class options
   * @return {Object} The class instance
   */
  init(options) {
    //console.log('options', options);
    super.init(defaults);

    this.options = [this.options, options].reduce(Object.assign, {});

    Object.assign(this, component, resizer);

    this.section = {};
    this.sections = [];

    this.settings = this.controller.getSettings('app-' + this.options.appname);
    //console.log('settings', this.settings);
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
    super.build(options);

    console.log('options', this.options);

    this.addClass('ui-layout');
    this.addClass('layout-standard');

    var options = this.options;

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

  }

  renderSection(section, type, level) {
    var sections = section.sections;
    var container = section.container;
    //console.log('renderSection', section, type, level);
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

      //console.log('property.sections', property);

      if (property.sections) {
        this.render(property, null, level);
      }
    }
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

module.exports = Layout;
