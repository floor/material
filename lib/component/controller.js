'use strict';

import mediator from '../module/mediator';
import merge from '../module/merge';
import Cookies from '../module/cookies';

let instance = null;

/**
 * 
 */
class Controller {

  /** 
   * Setting up block level variable to store class state
   * , set's to null by default.
   * credits: http://amanvirk.me/singleton-classes-in-es6/
   */
  constructor() {
    if (!instance) {
      instance = this;
    };

    this.components = this.components || [];
    this.component = this.component || {};

    Object.assign(this, mediator);

    this.init();


    return instance;
  }

  init() {

    this.subscribe('settings', (message) => {
      //console.log('settings', message);
      this.setSettings(message.key, message.value);
    });

  }

  setSettings(key, value) {
    var text = Cookies.get(key);

    var current = {};

    if (text) {
      current = JSON.parse(text);
    }

    console.log('settings value', current, value);
    //settings = [settings, value].reduce(Object.assign, {});
    var settings = merge(current, value);

    console.log('settings ' + key, settings);

    Cookies.set(key, JSON.stringify(settings));

  }

  getSettings(key) {
    var json = Cookies.get(key);

    if (!json) {
      return null;
    }
    var value = JSON.parse(json);

    console.log('settings' + key, value);

    return value;

  }


  /**
   * [register description]
   * @param  {component} component [description]
   * @return {Object} The class instance
   */
  register(component) {
    //console.log('register', component._name);
    this.components.push(component);

    this.component[component.name] = this.component[component.name] || [];

    this.component[component.name].push(component);

    return this;
  }

  /**
   * [focus description]
   * @param  {component} component [description]
   * @return {Object} The class instance
   */
  focus(component) {
    if (component === null) {
      return;
    }

    if (this.active !== component) {
      if (this.active)
        this.blur(this.active);

      this.active = component;
      component.emit('focus');
    }

    return;
  }

  /**
   * [blur description]
   * @param  {component} component [description]
   * @return {Object} The class instance
   */
  blur(component) {
    component.emit('blur', component);

    return;
  }
}

module.exports = Controller;
