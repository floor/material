'use strict'

import style from '../element/style'
import css from '../module/css'

export default {

  /**
   * Instanciate the given object comp
   * @param  {Object} comp list component
   * @return {component}
   */
  _initComponent (options) {
    // console.log('_initComponent', options.name, options);
    options = options || {}

    var name = options.name || 'main'

    // options.container = comp.container;
    options.Component = options.component
    var component = this.component[name] = new options.component(options)

    this.components.push(component)

    // register component
    this._componentRegister(name, component)

    // settings
    // this._initComponentSettings(component);

    // style, size and event
    this._setComponentStyles(component)
    this._setComponentDisplay(component)

    return component
  },

  /**
   * [_componentRegister description]
   * @param  {string} name      [description]
   * @param  {component} component [description]
   */
  _componentRegister (name, component) {
    // console.log('_componentRegister', name, component.class);
    this.components = this.components || []
    this.components.push(component)
    var className = component.class

    this.controls = this.controls || []

    var controls = this.options.controls

    if (controls && controls.indexOf(className) >= 0) {
      this.controls.push(component)
    }
  },

  /**
   * [_initComponentSettings description]
   * @param  {component} component [description]
   */
  // _initComponentSettings(component) {
  //
  //  var name = component.getName();
  //  var element = component.wrapper;
  // },

  /**
   * [_initComponentSettings description]
   * @param  {component} component [description]
   */
  _setComponentStyles (component) {
    if (component.options.flex) {
      css.add(component.wrapper, 'flex-' + component.options.flex)
    } else {
      var size = component.options.size
      if (component.options.size && component.options.width) {
        style.set(component.wrapper, {
          width: size + 'px'
        })
      } else {
        style.set(component.wrapper, {
          height: size + 'px'
        })
      }
    }

    if (component.options.hide) {
      style.set(component.wrapper, {
        display: 'none'
      })
    }

    if (component.options.theme) {
      css.add(component.wrapper, 'theme' + '-' + component.options.theme)
    }
  },

  /**
   * [_initSize description]
   * @param  {component} component [description]
   */
  _setComponentDisplay (component) {
    var display = 'normalized'

    // var name = component.getName();
    // if (this.settings[name] && this.settings[name].display) {
    //  display = this.settings[name].display;
    // }

    if (!component.setDisplay) return
    component.setDisplay(display, 'width')

    if (component.options.flex) return

    this.emit('drag')

    this._attachComponentEvents(component)
  }

  /**
   * _setComponentSettings description
   * @param {Object} component Component object
   */
  // _setComponentSettings(component) {
  //  var display = 'normalized';

  //  var name = component.getName();
  //  var element = component.wrapper;

  //  if (component.options.flex) {

  //    if (this.settings[name] && this.settings[name].width) {
  //      //style('flex', 'none');
  //      element.addClass('flex-none');
  //      if (display === 'minimized') {

  //        style('width', 0);
  //      } else {

  //        if (this.settings[name].width < 32)
  //          this.settings[name].width = 32;

  //        element.style('width', this.settings[name].width || 160);
  //      }

  //      component.width = this.settings[name].width || 200;
  //      component._modifier = 'width';
  //    } else if (this.settings[name] && this.settings[name].height) {
  //      element.style('flex', 'none');
  //      element.style('height', this.settings[name].height);
  //      component.height = this.settings[name].height || 160;
  //      component._modifier = 'height';
  //    }
  //  }
  // },

}
