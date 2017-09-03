'use strict';

//import control from '../control';
import Component from './component';
import DragDrop from 'material/dist/vendor/dragdrop';
import Emitter from './module/emitter';
import events from './component/events';
import insert from './element/insert';
import offset from './element/offset';
//import control from './control';
import merge from './module/merge';
import bind from './module/bind';
import create from './element/create';
import css from './module/css';


let defaults = {
  prefix: 'material',
  class: 'slider',
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
class Slider {

  /**
   * init
   * @return {Object} The class options
   */
  constructor(options) {
    this.options = merge(defaults, options);

    this.init(options);
    this.build();

    if (this.options.bind) {
      //console.log('vind', this.options.bind);
      this.bind(this.options.bind);
    }

    return this;
  }

  /**
   * Constructor
   * @param  {Object} options The class options
   * @return {Object} This class instance
   */
  init(options) {
    this.name = this.options.name;
    this.value = this.options.value || 1;
    this.disabled = this.options.disabled;



    Object.assign(
      this,
      events,
      Emitter,
      bind
    );

    return this;
  }



  /**
   * build method
   * @return {Object} The class instance
   */
  build() {
    var tag = this.options.tag || 'div';

    this.wrapper = create(tag, this.options.prefix + '-' + this.options.class);

    if (this.options.disabled) {
      css.add(this.wrapper, 'is-disabled');
    }

    this.options.label = this.options.label || this.options.text;
    this.buildLabel();

    this.initInput();
    this.buildControl();

    if (this.options.container) {
      insert(this.wrapper, this.options.container);
    }
  }


  /**
   * [initLabel description]
   * @return {[type]} [description]
   */
  buildLabel() {

    if (this.options.label === null) return;

    let text = this.options.label || this.options.text;

    this.label = document.createElement('label');
    css.add(this.label, this.options.class + '-label');
    this.label.textContent = text;
    insert(this.label, this.wrapper);
  }


  /**
   * [buildControl description]
   * @return {[type]} [description]
   */
  buildControl() {

    this.control = document.createElement('span');
    css.add(this.control, this.options.class + '-control');
    insert(this.control, this.wrapper);

    this.track = document.createElement('span');
    css.add(this.track, this.options.class + '-track');
    insert(this.track, this.control);


    this.trackvalue = new Component({
      tag: 'span',
      css: 'slider-track-value'
    }).insert(this.control);

    this.control.addEventListener('click', (ev) => {
      var position = ev.layerX - 3;
      this.knob.style({
        left: position + 'px'
      });
      this.updateControl(position);
    });

    this.knob = new Component({
      tag: 'span',
      css: 'slider-knob'
    }).insert(this.control);

    this.vindicator = new Component({
      tag: 'span',
      css: 'slider-vindicator'
    }).insert(this.control);

    this.knob.addEvent('click', (ev) => {
      ev.stopPropagation();
    });

    DragDrop.bind(this.knob.wrapper, {
      //anchor: anotherElement,
      boundingBox: 'offsetParent',
      dragstart: (ev) => {
        //console.log('dragstart', ev);
        css.add(this.control, 'dragging');
      },
      dragend: () => {
        var position = parseInt(this.knob.style('left'));
        css.remove(this.control, 'dragging');
        this.updateControl(position);

      },
      drag: () => {
        var position = parseInt(this.knob.style('left'));
        // this.knob.style({
        //   'top': '2px'
        // });

        this.updateControl(position);

      }
    });

    var delay = 10;

    var self = this;
    setTimeout(function() {
      self.setValue(self.value);
    }, delay);
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
    return this.input.value;
  }

  /**
   * [setValue description]
   * @param {string} value [description]
   */
  setValue(value) {
    this.input.value = value;
    this.updateKnob(value);
    //this.emit('change', value);
  }

  updateKnob(value) {
    console.log('updateKnob-', value, this.control);

    // var computedStyle = window.getComputedStyle(this.track.wrapper);

    var size = window.getComputedStyle(this.control, null).getPropertyValue("width");

    size = parseInt(size);

    //var size = this.component.control.wrapper.style.width;

    var range = this.options.range[1] - this.options.range[0];

    var ratio = value * 100 / range;

    var position = Math.round(size * ratio / 100);

    this.knob.style({
      left: position + 'px'
    });

    this.vindicator.style({
      left: position - 10 + 'px'
    });

    this.vindicator.text(value);

  }

  updateControl(position) {

    var size = parseInt(offset(this.track, 'width'));

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
    this.input.value = value;
    if (value > this.options.range[0]) {
      this.knob.addClass('notnull');
    } else {
      this.knob.removeClass('notnull');
    }
    // this.knob.style({
    //   'top': '2px'
    // });

  }

  /**
   * [initInput description]
   * @return {[type]} [description]
   */
  initInput() {

    this.input = document.createElement('input');
    this.input.type = 'checkbox';
    css.add(this.wrapper, this.options.prefix + '-' + this.options.class);

    if (this.options.disabled) {
      this.input.setAttribute('disabled', 'disabled');
    }

    if (this.value) {
      this.input.setAttribute('checked', 'checked');
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

export default Slider;