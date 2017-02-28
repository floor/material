'use strict';

// base class
import Component from '../component';

// modules
import control from '../control';
import ripple from '../component/ripple';

var defaults = {
  type: null, // push, file
  tag: 'span',
  components: [{
    tag: 'label.ui-text'
  }],
  ripple: {
    duration: '300',
    equation: 'ease-out'
  },
  bind: {
    'click': '_onClick',
    'mousedown': ['_onMouseDown', '_showRipple'],
    'mouseup': ['_onMouseUp', '_hideRipple'],
    'mouseout': ['_onMouseOut', '_hideRipple']
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
    super.init(defaults);

    this.options = [this.options, options].reduce(Object.assign, {});

    Object.assign(this, control);
    Object.assign(this, ripple);

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

    opts.label = opts.label || opts.text;

    if (type === null) {
      type = 'icon-text';
    }

    if (opts.name) {
      this.setAttribute('data-name', opts.name);
    }

    if (opts.text) {
      this.setAttribute('title', opts.text);
    }
    if (opts.icon) {
      this._initIcon(type, opts.icon || opts.name);
    }

    this.setLabel();

    //this._initLabel(type);
    this.sensor = this.element;
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

    var position = 'top';
    if (this.options.type === 'text-icon') {
      position = 'bottom';
    }

    var prop = {
      'tag': 'span.ui-icon'
    };

    this.icon = new Component(prop).insert(this.element, position);

    // prepare use of svg
    // this.iconsvg = new Element('svg', prop).insert(this.element);
    // this.svguse = new Element('use').insert(this.iconsvg);

    // this.iconsvg.setAttribute('viewBox', '0 0 24 24');
    // this.svguse.setAttribute('xlripple:href','/vendor/icon/content-send.svg');

    if (code) this.icon.addClass(code);
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
    //console.log('_onMouseDown');
    e.preventDefault();
    e.stopPropagation();
    this.addClass('is-active');
  }

  /**
   * _onMouseDown description
   * @param  {Event} e The related event
   */
  _onMouseUp(e) {
    //console.log('_onMouseUp');
    // e.preventDefault();
    // e.stopPropagation();

    this.removeClass('is-active');
  }

  /**
   * _onMouseDown description
   * @param  {Event} e The related event
   */
  _onMouseOut(e) {
    e.preventDefault();
    e.stopPropagation();
    this.removeClass('is-active');
  }
}

module.exports = Button;
