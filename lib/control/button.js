'use strict';

import Component from '../component';

var defaults = {
  prefix: 'ui',
  type: null, // push, file
  tag: 'button',
  ripple: {
    duration: '300',
    equation: 'ease-out'
  },
  bind: {
    'click': '_onClick',
    'mousedown': '_onMouseDown',
    'mouseup': '_onMouseUp',
    'mouseout': '_onMouseOut'
  }
};

/**
 * Button control class
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
class Button extends Component {

  /**
   * The init method of the Button class
   * @param  {Object} options [description]
   * @private
   * @return {Object} The class instance
   */
  init(options) {
    super.init(options);

    this.options = [ defaults, options ].reduce(Object.assign, {});

    return this;
  }

  /**
   * Build button's method
   * @override
   * @return {void}
   */
  build(props) {
    super.build(props);

    var opts = this.options;
    var type = opts.type;

    opts.label = opts.label || opts.n;

    if (type === null) {
      type = 'icon-text';
    }

    if (opts.name) {
      this.attribute('data-name', opts.name);
    }

    this.attribute('title', opts.text);

    if (opts.icon) {
      this._initIcon(type, opts.icon || opts.name);
    }

    this._initLabel(type);

    if (opts.ripple) {
      this._initSensor();
    } else {
      this.sensor = this.element;
    }
  }

  /**
   * [_onElementMouseDown description]
   * @param  {event} e
   * @return {void}
   */
  press(e) {
    e.preventDefault();

    if (this.state === 'disabled') return;

    this.emit('press', e);

    return this;
  }

  /**
   * [_initIcon description]
   * @param  {string} type
   * @return {string}
   */
  _initIcon(type, name) {

    var code = name;

    var prop = {
      'tag': 'span.ui-icon'
    };

    this.icon = new Component(prop).insert(this.element);

    // prepare use of svg
    // this.iconsvg = new Element('svg', prop).insert(this.element);
    // this.svguse = new Element('use').insert(this.iconsvg);

    // this.iconsvg.attribute('viewBox', '0 0 24 24');
    // this.svguse.attribute('xlripple:href','/vendor/icon/content-send.svg');

    if (code) this.icon.addClass(code);
  }

  /**
   * [_initLabel description]
   * @param  {string} type
   * @return {void}
   */
  _initLabel(type) {
    var options = this.options;

    var position = 'bottom';
    if (type === 'text-icon') {
      position = 'top';
    }

    if (this.options.label !== null) {
      var text = options.label || options.text;
      this.label = new Component({tag: 'span.ui-text'}).insert(this.element, position);
      this.label.text(text);
    }
  }

  /**
   * [_initText description]
   * @return {void}
   */
  _initSensor() {

    this.sensor = new Component({
      tag: 'div.ui-sensor'
    }).insert(this.element);
  }

  /**
   * _onClick
   * @param  {Event} e The related event
   */
  _onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    this.press(e);
  }

  /**
   * _onMouseDown description
   * @param  {Event} e The related event
   */
  _onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    this.addClass('is-active');   
    this._showRipple(e);
  }

  /**
   * _onMouseDown description
   * @param  {Event} e The related event
   */
  _onMouseUp(e) {
    console.log('up');
    e.preventDefault();
    e.stopPropagation();
    this.removeClass('is-active');  
    if (!this.rippleActive)
      this._hideRipple(e);
  }

  /**
   * _onMouseDown description
   * @param  {Event} e The related event
   */
  _onMouseOut(e) {
    console.log('hide');
    e.preventDefault();
    e.stopPropagation();
    this.removeClass('is-active');    
    this._hideRipple(e);
  }
  /**
   * _showRipple methosd
   * @param  {string} ripple
   * @param  {string} x
   * @param  {string} y
   * @param  {Object} coord
   * @return {void}
   */
  _showRipple(e) {
    if (!this.size) {
      this.size = this.offset();
    }

    if (!this.ripple) {
      this.ripple = new Component({
        tag:'span.ui-ripple'
      }).insert(this, 'top');
    }

    var rippleCoord = this._rippleCoord(this.size);
    var options = this.options.ripple;

    var startLeft = (e.offsetX || this.size.width / 2);
    var startTop = (e.offsetY || this.size.height / 2);

    this.ripple.style({
      left: startLeft + 'px',
      top: startTop + 'px',
      width: '5px',
      height: '5px',
      opacity: 1
    });

    this.rippleActive = true;

    // stop animation if exists
    if (this.animation) { this.animation.stop(); }

    this.animation = this.ripple.animate({
      width: rippleCoord.size,
      height: rippleCoord.size,
      left: rippleCoord.left,
      top: rippleCoord.top,
      opacity: 0.2,
      duration: options.duration,
      easing: options.equation,
      complete: () => {
        this.rippleActive = false;
        if (!this.hasClass('is-active'))
          this._hideRipple();
      }
    });
  }

  /**
   * [_hideRipple description]
   */
  _hideRipple() {
    var options = this.options.ripple;

    if (!this.ripple) return;

    this.animation.stop();

    this.animation = this.ripple.animate({
      opacity: 0,
      duration: '200',
      easing: options.equation,
      complete: () => {
        if (this.ripple) { 
          this.ripple.destroy();
          this.ripple = null; 
        }
      }
    });
  }

  /**
   * Get ripple final coordiantes
   * @return {Object} Size and top
   */
  _rippleCoord(offset) {
    var size = offset.width;
    var top = -offset.height / 2;

    if (offset.width > offset.height) {
      size = offset.width;
      top = -(offset.width - offset.height / 2);
    } else if (offset.width < offset.height) {
      size = offset.height;
      top = (offset.width - offset.height) / 2;
    }

    return {
      size: size * 2,
      top: top,
      left: size / -2
    };
  }
}

module.exports = Button;
