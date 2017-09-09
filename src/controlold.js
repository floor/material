'use strict';

const defaults = {
  //prefix: 'ui',
  //disabled: false
  error: false
};

/**
 * control class
 *
 * @class
 */
export default {

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   */
  set: function(prop, value) {

    switch (prop) {
      case 'value':
        this.setValue(value);
        break;
      default:
        this.setValue(prop);
    }

    return this;
  },

  /**
   * Getter
   * @param {string} prop
   * @param {string} value
   */
  get: function(prop) {
    var value;

    switch (prop) {
      case 'value':
        value = this.getValue();
        break;
      case 'name':
        value = this.options.name;
        break;
      default:
        return this.getValue();
    }

    return value;
  },

  /**
   * [getValue description]
   * @return {Object} The class instance
   */
  getValue: function() {
    console.log('getValue', this);
    return this.element.input.value;
  },

  /**
   * [setValue description]
   * @param {string} value [description]
   */
  setValue: function(value) {
    //console.log('setValue', value, this.component.input);
    this.element.input.value = value;
    this.emit('change', value);
  },

  /**
   * [isEnable description]
   * @return {boolean}
   */
  isEnable() {
    if (this.state === 'disabled') {
      return false;
    } else {
      return true;
    }
  },

  /**
   * build checkbox label
   * @param  {?} label [description]
   * @return {?}       [description]
   */
  setLabel(text) {
    //console.log('setLabel', this.options);
    text = text || this.options.label || this.options.text;

    if (text !== null && this.component.label) {
      this.component.label.text(text);
    }
  },

  focus() {
    this.wrapper.focus();
  },

  blur() {
    this.wrapper.blur();
  }
};