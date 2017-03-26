'use strict';

//import control from '../control';
import Component from '../component';
import merge from '../module/merge';

var defaults = {
  name: 'field',
  type: 'control',
  value: null,
  error: true,
  prefix: 'ui',
  tag: 'div',
  attr: ['accesskey', 'class', 'contenteditable', 'contextmenu',
    'dir', 'draggable', 'dropzone', 'hidden', 'id', 'lang',
    'spellcheck', 'style', 'tabindex', 'title', 'translate', 'type'
  ],
  components: [{
    tag: 'label'
  }, {
    tag: 'input',
    props: {
      type: 'text'
    }
  }, {
    idx: 'underline',
    tag: 'span.field-underline'
  }],
  bind: {
    'change': '_onChange',
    'component.input.focus': '_onInputFocus',
    'component.input.blur': '_onInputBlur',
    //'component.input.keypress': '_onInputKeyPress',
    'component.input.keyup': '_onInputKeyPress',
    'component.input.onChange': '_onChange',
    // 'component.input.keydown': '_onInputKeyPress'

  }
};

/**
 * Field class
 * @class
 * @extends {Control}
 */
class Field extends Component {

  /**
   * init
   * @param  {Object} options The class options
   * @return {Object} The class instance
   */
  init(options) {
    super.init(defaults);
    //console.log('options', this.options);
    //this.options = [this.options, options].reduce(Object.assign, {});
    this.options = merge(this.options, options);



    this.name = this.options.name;

    //Object.assign(this, control);

    return this;
  }

  /**
   * [build description]
   * @return {Object} The class instance
   */
  build() {
    //create a new div as input element
    super.build();

    var opts = this.options;

    this._initInput();

    this.addClass('ui-field');

    if (this.disabled) {
      this.addClass('is-disabled');
    }

    if (opts.klss) {
      this.addClass(opts.klss);
    }

    if (opts.label !== false) {
      this.setLabel();
    }
    // if (opts.error) {
    //  this.initError();
    // }
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   */
  set(prop, value) {

    switch (prop) {
      case 'value':
        this.setValue(value);
        break;
      default:
        this.setValue(prop);

    }

    return this;
  }

  /**
   * [_initLabel description]
   * @return {Object} The class instance
   */
  setLabel() {
    var label = this.options.label;
    var text;

    if (label === null || label === false) {
      text = '';
    } else if (this.options.label) {
      text = label;
    } else {
      text = this.options.name;
    }

    this.component.label.text(text);
  }


  /**
   * Getter
   * @param {string} prop
   * @param {string} value
   */
  get(prop) {
    var value;

    switch (prop) {
      case 'value':
        value = this.getValue();
        break;
      case 'name':
        value = this.name;
        break;
      default:
        return this.getValue();
    }

    return value;
  }

  /**
   * [getValue description]
   * @return {Object} The class instance
   */
  getValue() {
    //console.log('getValue', this);
    return this.component.input.element.value;
  }

  /**
   * [setValue description]
   * @param {string} value [description]
   */
  setValue(value) {
    //console.log('setValue', value, this.component.input);
    //
    this.component.input.element.value = value;

    if (value) {
      this.removeClass('is-empty');
    } else {
      this.addClass('is-empty');
    }

    this.emit('change', value);
  }


  /**
   * [_initInput description]
   * @return {Object} The class instance
   */
  _initInput() {

    if (!this.options.value) {
      this.addClass('is-empty');
    }

    if (this.readonly) {
      this.input.setAttribute('readonly', 'readonly');
      this.input.setAttribute('tabindex', '-1');
    }

    return this.input;
  }

  /**
   * _initUnderline
   * @return {Object} The class instance
   */
  _initUnderline() {
    this.underline = new Component({
      tag: 'span.field-underline'
    }).insert(this.element);
  }

  /**
   * error
   * @return {Object} The class instance
   */
  initError() {
    this.error = new Component({
      tag: 'span.error-message'
    }).insert(this.element);
  }

  /**
   * [_initName description]
   * @param  {string} name The input name
   */
  _initName(name) {
    var opts = this.options;

    if (opts.name) {
      this.input.setAttribute('name', name);
    }
  }

  /**
   * [_initValue description]
   * @return {Object} The class instance
   */
  _initValue() {
    var opts = this.options;

    //create a new div as input element
    if (opts.value) {
      this.setValue(opts.value);
    }
  }

  /**
   * [_onFocus description]
   * @return {Object} The class instance
   */
  _onInputFocus(e) {
    //console.log('_onInputFocus');
    if (this.readonly) return;
    this.setState('focus');
  }

  /**
   * [_onFocus description]
   * @return {Object} The class instance
   */
  _onInputKeyPress(e) {
    //console.log('_onInputKeyPress', e);

    if (this.get('value') === '') {
      this.addClass('is-empty');
    } else {
      this.removeClass('is-empty');
    }

    this.emit('change', this.getValue());
  }

  /**
   * [_onBlur description]
   * @return {Object} The class instance
   */
  _onInputBlur() {
    //console.log('_onInputBlur');
    if (this.readonly) return;
    this.setState(null);
  }

  /**
   * [_onBlur description]
   * @return {Object} The class instance
   */
  _onChange(value) {
    //console.log('_onChange', value);
  }

  /**
   * [setError description]
   * @param {string} error Error description
   */
  setError(error) {
    if (error) {
      this.addClass('field-error');
      if (this.error)
        this.error.set('html', error);
    } else {
      if (this.error)
        this.removeClass('field-error');
      if (this.error)
        this.error.set('html', '');
    }
  }
}

module.exports = Field;
