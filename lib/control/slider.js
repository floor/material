'use strict';

//import control from '../control';
import Component from '../component';
import DragDrop from 'material/dist/vendor/dragdrop';

let defaults = {
  // base: 'field',
  prefix: 'ui',
  type: 'control',
  label: null,
  checked: false,
  error: false,
  value: false,
  range: [0, 100],
  step: 5,
  components: [{
    tag: 'label.slider-label'
  }, {
    tag: 'input',
    props: {
      type: 'hidden'
    }
  }, {
    ident: 'control',
    tag: 'span.slider-control'
  }],
  // bind: {
  //  'control.click': 'toggle',
  //  'label.click': 'toggle',
  //  // for accessibility purpose
  //  //'input.click': 'toggle',
  //  'input.focus': '_onInputFocus',
  //  'input.blur': '_onInputBlur'
  // }
};

/**
 * Switch class
 * @class
 * @extends Control
 */
class Slider extends Component {

  /**
   * Constructor
   * @param  {Object} options The class options
   * @return {Object} This class instance
   */
  init(options) {
    super.init(defaults);
    this.options = [this.options, options].reduce(Object.assign, {});

    this.name = this.options.name;
    this.value = this.options.value;

    return this;
  }

  /**
   * build method
   * @return {Object} The class instance
   */
  build() {
    super.build();

    let text = this.options.label || this.options.text;

    if (this.options.disabled) {
      this.addClass('is-disabled');
    }

    this.options.label = this.options.label || this.options.text;
    this.setLabel(this.options.label);

    this.initInput();
    this.initControl();

    // this.initInput();
    // this.initControl();
    // this.wrapper = new Component({
    //  tag: 'div.switch-wrapper'
    // }).insert(this.element);

    if (this.value) {
      this.check();
    }
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
    console.log('getValue', this);
    return this.component.input.element.value;
  }

  /**
   * [setValue description]
   * @param {string} value [description]
   */
  setValue(value) {
    //console.log('setValue', value, this.component.input);
    this.component.input.element.value = value;
    this.emit('change', value);
  }

  /**
   * [initControl description]
   * @return {[type]} [description]
   */
  initControl() {

    this.track = new Component({
      tag: 'span.slider-track'
    }).insert(this.component.control);


    this.trackvalue = new Component({
      tag: 'span.slider-track-value'
    }).insert(this.component.control);

    this.component.control.addEvent('click', (ev) => {
      console.log('clicked at ', ev.layerX);
      var position = ev.layerX - 3;
      this.knob.style({
        left: position + 'px'
      });
      this.updateControl(position);
    });

    this.knob = new Component({
      tag: 'span.slider-knob'
    }).insert(this.component.control);

    this.vindicator = new Component({
      tag: 'span.slider-vindicator'
    }).insert(this.component.control);

    this.knob.addEvent('click', (ev) => {
      ev.stopPropagation();
    });

    DragDrop.bind(this.knob.element, {
      //anchor: anotherElement,
      boundingBox: 'offsetParent',
      dragstart: (ev) => {
        //console.log('dragstart', ev);
        this.component.control.addClass('dragging');
      },
      dragend: () => {
        var position = parseInt(this.knob.style('left'));
        this.component.control.removeClass('dragging');
        this.updateControl(position);

      },
      drag: () => {
        var position = parseInt(this.knob.style('left'));
        this.knob.style({
          'top': '2px'
        });
        this.updateControl(position);

      }
    });
  }

  updateControl(position) {


    var size = parseInt(this.track.style('width'));



    if (position > size) {
      position = size;
      this.knob.style({
        left: position + 'px'
      });
    };
    var ratio = (size / position);
    var value = Math.round((this.options.range[1] / ratio));

    this.trackvalue.style({
      width: position + 'px'
    });

    this.vindicator.style({
      left: position - 10 + 'px'
    });

    this.vindicator.text(value);

    //console.log('track knob', position, size);

    //console.log('ratio', ratio, Math.round(value));
    this.setValue(value);
    if (value > this.options.range[0]) {
      this.knob.addClass('notnull');
    } else {
      this.knob.removeClass('notnull');
    }
    this.knob.style({
      'top': '2px'
    });
  }

  /**
   * [initInput description]
   * @return {[type]} [description]
   */
  initInput() {
    // this.input = new Component({
    //   tag: 'input',
    //   type: 'checkbox'
    // }).insert(this.element);

    if (this.options.disabled) {
      this.component.input.setAttribute('disabled', 'disabled');
    }

    if (this.value) {
      this.component.input.setAttribute('checked', 'checked');
    }
  }

  setLabel(text) {
    //console.log('setLabel', this.options);
    text = text || this.options.label || this.options.text;

    if (text !== null && this.component.label) {
      this.component.label.text(text);
    }
  }

}

module.exports = Slider;
