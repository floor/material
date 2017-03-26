'use strict';

import Layout from './layout';
import merge from './module/merge';
import defaults from './form/options';

import dom from './module/dom';
import insert from './component/insert';
import css from './module/css';
import Emitter from './module/emitter';
import bind from './module/bind';
import Controller from './component/controller';

// import Layout from './layout';
// 
// import bind from './module/bind';
// import merge from './module/merge';
// // element related modules
// import element from './component/element';

// // dependencies
// import attribute from './component/attribute';
// import classify from './component/classify';
// import events from './component/events';

// import style from './component/style';
// import dom from './module/dom';
// import storage from './component/storage';

/**
 * Form class
 *
 * @class
 * @extends {Component}
 * @return {Class} This class instance
 */
class Form {

  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance 
   */
  constructor(options) {
    console.log('form constructor');

    this.init(options);
    this.build();

    return this;
  }

  /**
   * Initialize View
   * @return {void}
   */
  init(options) {
    // initOPtions

    // init intanciate name
    this._name = this.constructor.name.toLowerCase();

    this._initOptions(options);

    // merge options

    // implement module
    Object.assign(this,
      Emitter,
      bind,
      insert
    );

    this.document = window.document;

    this.controller = new Controller();


    //need to remove the options template to have a reference

    if (this.options.render) {
      this.render = options.render;
    }

    this.name = 'form';

    this.key = {};

    return this;
  }

  _initOptions(options) {
    options = options || this.options;
    this.options = merge(defaults, options);
    console.log('form options', this.options);
  }

  /**
   * [_initForm description]
   * @return {Object} This class instance
   */
  build(options) {
    options = options || this.options;

    this.element = document.createElement('form');
    css.add(this.element, 'material-form');

    this._initLayout(options.layout);

    return this;
  }

  /**
   * Instanciate layout
   * @param  {[type]} options [description]
   * @return {[type]}         [description]
   */
  _initLayout(options) {
    console.log('_initLayout', options);
    //
    // complete layout options
    options.container = this.element;
    options.controls = this.options.controls;
    //console.log('control keys', this.options.controls);

    this.layout = new Layout(options);

    //console.log('control', this.layout.controls);
    this._initControls(this.layout.controls);
  }

  /**
   * [_initControls description]
   * @param  {[type]} controls [description]
   * @return {[type]}          [description]
   */
  _initControls(controls) {
    if (!controls) return;

    for (var i = 0; i < controls.length; i++) {
      var control = controls[i];
      control.setAttribute('data-key', control.name);
      //console.log('keys', control.name, control);

      this.key[control.name] = control;

      control.on('change', function(value) {
        //console.log('change', this.name, value);
      });
    }
  }

  /**
   * [_onSubmit description]
   * @return {void}
   */
  _onSubmit(e) {
    e.preventDefault();
  }

  /**
   * [initControl description]
   * @param  {[type]} key     [description]
   * @param  {[type]} section [description]
   * @return {[type]}         [description]
   */
  initControl(key, section) {
    var name = key.name || 'undefined';

    var control = this.render(key);

    if (control) {
      this.key[name] = control;
      control.insert(section);
      control.addEvent('keyup', function() {
        console.log('change', name, control.get('value'));
      });

      control.setAttribute('data-key', name);
    }
  }

  /**
   * Getter
   *
   * @param {string} prop
   * @param {string} value
   * @return {Object|void}
   */
  set(prop, value) {
    switch (prop) {
      case 'info':
        return this.setInfo(value);
      case 'schema':
        return this.setSchema(value);
      default: //default will replace the old method see up
        return this.setInfo(info);
    }
  }

  /**
   * [setInfo description]
   * @param {[type]} info [description]
   */
  setInfo(info) {
    this.info = this.original = info;


    this.parseInfo(info);

  }

  /**
   * [parseInfo description]
   * @param  {[type]} obj  [description]
   * @param  {[type]} name [description]
   * @param  {[type]} i    [description]
   * @return {[type]}      [description]
   */
  parseInfo(obj, name, i) {
    //console.log('parseInfo', name, i);
    var count = i || 0;
    count = count + 1;
    var k;

    if (obj instanceof Object) {
      for (k in obj) {
        if (obj.hasOwnProperty(k)) {
          //console.log('key', k, count);
          //recursive call to scan property
          var n = null;
          if (name) {
            n = name + '.' + k;
          } else {
            n = k;
          }
          //console.log('recall', n, count - 1);
          this.parseInfo(obj[k], n, count);
        }
      }
    } else {
      //console.log('key value', name, obj);
      if (this.key[name] && this.key[name].set) {
        //console.log('control', this.key[name]);
        this.key[name].set(obj);
      }

      //not an Object so obj[k] here is a value
    };

  };

  /**
   * Getter
   *
   * @param {string} prop
   * @param {string} value
   * @return {Object|void}
   */
  get(prop, value) {
    switch (prop) {
      case 'key':
        return this.getValue(value);
      case 'info':
        return this.getInfo();
      case 'original':
        return this.original;
      case 'options':
        return this.options;
      default: //default will replace the old method see up
        return this.getInfo();
        /*case 'model':
          return this.getSelectedModel();*/
    }
  }


  /**
   * Get Value for the given key
   * @param  {string} name defined in dot notation
   * @param  {Object} info
   * @return {Mixin} The Value of the given key
   */
  getValue(name, info) {
    var keys = name.split(/\./);
    var value = null;

    if (!name || !info) {
      return;
    }

    //_log.debug('getValueFromKey', name, info);

    if (keys.length === 1) {
      value = info[keys[0]];
    }
    if (keys.length === 2 && info[keys[0]]) {
      if (info[keys[0]]) {
        value = info[keys[0]][keys[1]];
      }
    }
    if (keys.length === 3) {
      if (info[keys[0]]) {
        if (info[keys[0]][keys[1]]) {
          value = info[keys[0]][keys[1]][keys[2]];
        }
      }
    }

    return value;
  }

  getInfo() {
    return this.info;
  }
}

module.exports = Form;
