'use strict';

import View from './view';
import defaults from './container/options';

import Component from './component';





/**
 * Form class
 *
 * @class
 * @extends {Component}
 * @return {Class} This class instance
 */
class Form extends View {

  /**
   * Initialize View
   * @return {void}
   */
  init(options) {
    //need to remove the options template to have a reference
    this.schema = options.schema;

    if (options.render) {
      this.render = options.render;
    }

    this.name = 'form';

    this.key = {};

    super.init(defaults);


    this.options = [this.options, options].reduce(Object.assign, {});
    // Object.assign(this.options, [defaults, options].reduce(Object.assign, {}));
    console.log('options', options, this.options);

  }

  /**
   * [_initForm description]
   * @return {Object} This class instance
   */
  build() {
    super.build();

    console.log('build', this.element);

    this.form = new Component({
      tag: 'form',
      name: this.name
        //method: 'post'
    }).insert(this.element);

    this.form.addClass('view-form');


    if (this.schema) {
      this._initSchema(this.schema);
    }



    console.log('form', this.form.element);

    return this;
  }

  /**
   * [_onSubmit description]
   * @return {void}
   */
  _onSubmit(e) {
    e.preventDefault();
  }



  /**
   * Initialize form model
   * @return {void}
   */
  _initSchema(schema) {

    var comps = {};
    var spec = {};
    var defs = {};

    schema = schema || this.schema;

    this._processSections(schema);

  }

  _processSections(schema) {
    var sections = schema.sections;

    this.sections = [];
    this.section = {};

    for (var i = 0; i < sections.length; i++) {
      var object = sections[i];
      var name = object.name || 'undefined';

      if (object.text) {
        new Component({
          tag: 'div',
          class: 'component-subheader'
        }).insert(this.form).text(object.text);
      }

      var section = new Component({
        tag: 'div',
        class: 'form-section'
      }).insert(this.form);

      section.setAttribute('data-section', name);


      // console.log('section', name, section.element);

      this._initKeys(object, section);
    }
  }

  _initKeys(object, section) {
    var keys = object.keys;

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      this.initControl(key, section);

    }

    //console.log('key object', this.key);


  }

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

  setInfo(info) {


    this.parseInfo(info);

  }

  parseInfo(obj, name, i) {
    console.log('parseInfo', name, i);
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
          console.log('recall', n, count - 1);
          this.parseInfo(obj[k], n, count);
        }
      }
    } else {
      console.log('key value', name, obj);
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
        return this.getValueFromKey(value, this.info);
      case 'info':
        return this.getInfo();
      case 'unsaved':
        return this.original;
      case 'type':
        return this.type;
      case 'options':
        return this.options;
      default: //default will replace the old method see up
        return this.getValueFromKey(prop, this.info);
        /*case 'model':
          return this.getSelectedModel();*/
    }
  }

}

module.exports = Form;
