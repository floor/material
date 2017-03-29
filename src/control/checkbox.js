'use strict';

import control from '../control';
import Component from '../component';

let defaults = {
  prefix: 'material',
  type: 'control',
  label: null,
  checked: false,
  error: false,
  value: false,
  components: [{
    tag: 'input',
    props: {
      type: 'checkbox'
    }
  }, {
    ident: 'control',
    tag: 'span.checkbox-control'
  }, {
    tag: 'label.checkbox-label'
  }],
  bind: {
    'component.control.click': 'toggle',
    'component.label.click': 'toggle',

    // for accessibility purpose
    'component.input.click': 'toggle',
    'component.input.focus': '_onInputFocus',
    'component.input.blur': '_onInputBlur'
  }
};

/**
 * Checkbox control class
 * @class
 * @extends Control
 * @since 0.0.1
 * @example
 * var button = new Button({
 *   label: 'Primary raised button',
 *   type: 'raised',
 *   primary: true
 * }).on('press', function(e) {
 *   console.log('button press', e);
 * }).insert(document.body);
 */
class Checkbox extends Component {

  /**
   * Constructor
   * @param  {Object} options The class options
   * @return {Object} This class instance
   */
  init(options) {
    super.init(options);
    this.options = [defaults, options].reduce(Object.assign, {});

    this.name = this.options.name;
    this.value = this.options.value;

    Object.assign(this, control);

    return this;
  }

  /**
   * build the component using the super method
   * @return {Object} The class instance
   */
  build() {
    super.build();

    //console.log('options', this.options);

    this.setLabel();

    if (disabled) {

    }

    if (this.value) {
      this.component.input.setAttribute('checked', 'checked');
    }

    var disabled = this.options.disabled;
    if (this.options.disabled) {
      this.component.input.setAttribute('disabled', 'disabled');
      this.addClass('is-disabled');
    }

    this.setValue(this.value);
  }

  /**
   * [_onInputFocus description]
   * @return {[type]} [description]
   */
  _onInputFocus() {
    this.addClass('is-focused');
  }

  /**
   * [_onInputBlur description]
   * @return {[type]} [description]
   */
  _onInputBlur() {
    this.removeClass('is-focused');
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   * @return {Object} The class instance
   */
  set(prop, value) {

    switch (prop) {
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
   * Set checkbox value
   * @param {boolean} value [description]
   */
  setValue(value) {
    console.log('setValue', value);
    if (value) {
      this.check();
    } else {
      this.unCheck();
    }
  }

  /**
   * [toggle description]
   * @return {Object} The class instance
   */
  toggle() {
    if (this.disabled) return;

    this.component.input.element.focus();

    if (this.value) {
      this.unCheck(true);
    } else {
      this.check();
    }

    return this;
  }

  /**
   * setTrue
   */
  check() {

    this.value = true;
    this.addClass('is-checked');
    this.component.input.element.checked = true;
    this.emit('change', this.value);
  }

  /**
   * setFlas
   */
  unCheck() {
    this.value = false;
    this.removeClass('is-checked');
    this.component.input.element.checked = false;
    this.emit('change', this.value);
  }
}

module.exports = Checkbox;
