'use strict';

var Control = require('../control');
var Element = require('../element');

var bind = require("../module/bind");
var toInt = require("mout/number/toInt");

var defaults = {
	name: 'field',
	base: 'control',
	tag: 'div',
	type: 'input',
	value: null,
	error: true,
	bind: {
		//'input.click': '_onFocus',
		'input.keyup': '_onKeyUp',
		'input.keydown': '_onKeyDown',
		'input.mousedown': '_onMouseDown',
		'input.focus': '_onFocus',
		'input.blur': '_onBlur'
	}
};

/**
 * Field class
 * @class
 * @extends {Control}
 */
class Field extends Control {

	/**
	 * init
	 * @param  {Object} options The class options
	 * @return {instance} The class instance
	 */
	init(options) {
		super.init(options);

		this.options = [ defaults, options ].reduce(Object.assign, {});

		this.name = this.options.name;

		return this;
	}

	/**
	 * [build description]
	 * @return {instance} The class instance
	 */
	build(){
		//create a new div as input element
		super.build();

		var opts = this.options;

		this.element.addClass('ui-field');

		if (this.disabled) {
			this.element.addClass('is-disabled');
		}

		if (opts.klss) {
			this.element.addClass(opts.klss);
		}

		if (opts.label !== false) {
			this._initLabel();
		}

		this._initInput();

		// if (opts.error) {
		// 	this.error();
		// }
	}

	/**
	 * [_initLabel description]
	 * @return {instance} The class instance
	 */
	_initLabel() {
		var label = this.options.label;
		var text;

		if (label === null || label === false) {
			text = '';
		} else if (this.options.label) {
			text = label;
		} else {
			text || this.options.name;
		}

		this.label = new Element('label', {
			tag: 'label',
			'for': this.options.name
		}).inject(this.element);

		this.label.text(text);
	}

	/**
	 * [_initInput description]
	 * @return {instance} The class instance
	 */
	_initInput() {

		this.input = new Element('input', {
			name: this.options.name,
			type: 'text',
			value: this.options.value,
			placeholder: this.options.text
		}).inject(this.element);

		if (this.readonly) {
			this.input.attribute('readonly', 'readonly');
			this.input.attribute('tabindex', '-1');
		}

		return this.input;
	}

	/**
	 * [_initName description]
	 * @param  {string} name The input name
	 */
	_initName(name) {
		var opts = this.options;

		if (opts.name) {
			this.input.attribute('name', name);
		}
	}

	/**
	 * [_initValue description]
	 * @return {instance} The class instance
	 */
	_initValue(){
		var opts = this.options;

		//create a new div as input element
		if (opts.value) {
			this.setValue(opts.value);
		}
	}

	/**
	 * [_onKeyUp description]
	 * @return {instance} The class instance
	 */
	_onKeyUp(e) {
		this.emit('change', this.get('value'));
	}

	/**
	 * [_onKeyUp description]
	 * @return {instance} The class instance
	 */
	_onKeyDown(e) {
		if (this.readonly) {
			e.stop();
			return;
		}

		this.fireEvent('change', this.get('value'));
	}

	/**
	 * [_onMouseDown description]
	 * @return {instance} The class instance
	 */
	_onMouseDown(e) {

		if (this.readonly) return;

		this.isFocused = true;
		this.setState('focus');
		this._inputFocus(e);
		//e.stopPropagation();
		//this.focus();
		//this._inputFocus(e);
	}

	/**
	 * [_onFocus description]
	 * @return {instance} The class instance
	 */
	_onFocus(e) {

		this.emit('mousedown');
		this._showInk(e);
		this.isFocused = true;
	}

	/**
	 * [_onBlur description]
	 * @return {instance} The class instance
	 */
	_onBlur() {

		if (this.readonly) return;

		this.setState(null);
		this._hideInk();
		this.isFocused = false;
	}

	/**
	 * [_inputFocus description]
	 * @param  {event} e [description]
	 * @return {instance} The class instance
	 */
	_inputFocus(e) {

		this.emit('mousedown');
		this._showInk(e);
		this.isFocused = true;
	}

	/**
	 * [_initInk description]
	 * @return {instance} The class instance
	 */
	_initInk() {

		this.ink = new Element('span', {
			class: 'field-ink'
		}).inject(this.element);
	}

	/**
	 * [_initEffect description]
	 * @param  {Event} e Event
	 * @return {instance} The class instance
	 */
	_showInk(e) {

		if (this.readonly) return;

		if (this.ink) return;
		var duration = '.2s';
		var input = this.input;
		var label = this.label;

		var width = input.compute('width').replace('px', '');
		var inputHeight = toInt(input.compute('height').replace('px', ''));
		var labelHeight = toInt(label.compute('height').replace('px', ''));
		var left = input.compute('left').replace('px', '');

		var x = width / 2;

		if (e === 0) {
			x = 0;
		} else if (e && e.offsetX) {
			x = e.offsetX;
		}

		var size = width;
		var top = inputHeight + labelHeight +8 -2;

		if (!this.ink) {
			this._initInk();
		}

		console.log('top', top);

		this.ink.style('left', x);

		this.ink.animate({'width': size}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'top': top }, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'bottom': 'initial'}, {duration: duration, equation: 'ease-out'});
		this.ink.animate({'left': '0'}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'opacity': '1'}, {duration: duration, equation: 'ease-out'});
	}

	/**
	 * [_initEffect description]
	 * @param  {Event} e Event
	 * @return {instance} The class instance
	 */
	_setInk(e) {
		if (this.readonly) return;

		//if (this.ink) return;

		var input = this.input;

		var width = input.compute('width').replace('px', '');
		var height = input.compute('height').replace('px', '');
		var left = input.compute('left').replace('px', '');

		var x = width / 2;

		var size = width;
		var top = 0;

		if (!this.ink) {
			this._initInk();
		}

		this.ink.style({
		    width: size,
		    top: top + height - 2,
		    bottom: 'initial',
		    left: left,
		    opacity: 1
		});
	}

	/**
	 * [_initEffect description]
	 * @return {instance} The class instance
	 */
	_hideInk() {
		var self = this;

		var input = this.input;

		var duration = '.2s';
		var width = input.compute('width').replace('px', '');
		var size = width / 2;

		this.ink.animate({'width': '0px'}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'left': size}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'opacity': '0'}, {duration: duration, equation: 'ease-out'});

		setTimeout( function() {
			if (self.ink) {
				self.ink.destroy();
				self.ink = null;
			}
		}, 100);
	}

	/**
	 * [_initError description]
	 * @return {instance} The class instance
	 */
	error() {
		this.error = new Element('span', {
			class: 'error-message'
		}).inject(this.element);
	}

	/**
	 * [setError description]
	 * @param {string} error Error description
	 */
	setError(error) {
		if (error) {
			this.element.addClass('field-error');
				if (this.error)
					this.error.set('html', error);
		} else {
			if (this.error)
				this.element.removeClass('field-error');
				if (this.error)
					this.error.set('html', '');
		}
	}
}

module.exports = Field;
