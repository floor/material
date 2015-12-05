'use strict';

var Control = require('../control');
var Element = require('../element');

var bind = require("../module/bind");
var toInt = require("mout/number/toInt");
var __debug = require('../module/debug');

var defaults = {
	name: 'field',
	base: 'control',
	tag: 'div',
	type: 'input',
	value: null,
	error: true,
	binding: {
		//'input.click': '_onFocus',
		'input.keyup': '_onKeyUp',
		'input.keydown': '_onKeyDown',
		'input.mousedown': '_onMouseDown',
		'input.focus': '_onFocus',
		'input.blur': '_onBlur'
	}
};

var	_log = __debug('material:control-field');
//	_log.defineLevel('DEBUG');

/**
 * Field class
 * @class
 * @extends {Control}
 */
class Field extends Control {

	//mixin: [Options, Emitter, binding],

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor(options){
		super(options);

		_log.debug('constructor', this.options);

		this.emit('init');

		this.init(options);
		this.build();

		if (this.options.bind) {
			this.bind(this.options.bind);
		}

		return this;
	}

	/**
	 * init
	 * @param  {Object} options The class options
	 * @return {[type]}         [description]
	 */
	init(options) {
		super.init(options);

		this.name = 'field';

		this.options = [ defaults, options ].reduce(Object.assign, {});

		return this;
	}

	/**
	 * [build description]
	 * @return {[type]} [description]
	 */
	build(){
		//create a new div as input element
		super.build();

		var opts = this.options;

		_log.debug('build', opts.name, opts.klss);

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

		if (opts.error) {
			this.error();
		}
	}

	/**
	 * Setter
	 * @param {string} prop
	 * @param {string} value
	 */
	set(prop, value, opts) {

		switch(prop) {
			case 'value':
				this.setValue(value);
				break;
			default:
				this.setValue(value);

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

		switch(prop) {
			case 'value':
				value = this.getValue(prop);
				break;
			default: 
				return this.getValue(prop);
		}

		return value;
	}

	/**
	 * [getValue description]
	 * @return {[type]} [description]
	 */
	getValue(){
		return this.input.get('value');
	}

	/**
	 * [setValue description]
	 * @param {[type]} value [description]
	 */
	setValue(value){
		this.input.attribute('value', value);
		this.emit('change', value);
	}

	/**
	 * [_initLabel description]
	 * @return {[type]} [description]
	 */
	_initLabel() {
		_log.debug('_initLabel');
		var label = this.options.label;
		var	text;

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
	 * @return {[type]} [description]
	 */
	_initInput() {
		_log.debug('_initInput', this.options);

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
	 * @param  {[type]} name [description]
	 * @return {[type]}      [description]
	 */
	_initName(name) {
		_log.debug('initName', name);
		var opts = this.options;

		if (opts.name) {
			this.input.attribute('name', name);
		}
	}

	/**
	 * [_initValue description]
	 * @return {[type]} [description]
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
	 * @return {[type]} [description]
	 */
	_onKeyUp(e) {
		_log.debug('_onKeyUp', e);
		this.emit('change', this.get('value'));
	}

	/**
	 * [_onKeyUp description]
	 * @return {[type]} [description]
	 */
	_onKeyDown(e) {
		_log.debug('onKeyDown');
		if (this.readonly) { 
			e.stop();
			return;
		}

		this.fireEvent('change', this.get('value'));
	}

	/**
	 * [_onMouseDown description]
	 * @return {[type]} [description]
	 */
	_onMouseDown(e) {
		_log.debug('mousedown');
		
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
	 * @return {[type]} [description]
	 */
	_onFocus(e) {
		_log.debug('focus', e);

		this.emit('mousedown');
		this._showInk(e);
		this.isFocused = true;
	}

	/**
	 * [_onBlur description]
	 * @return {[type]} [description]
	 */
	_onBlur(e) {
		//_log.debug('_onBlur');

		if (this.readonly) return;

		this.setState(null);
		this._hideInk();
		this.isFocused = false;
	}

	/**
	 * [_inputFocus description]
	 * @param  {event} e [description]
	 * @return {[type]}   [description]
	 */
	_inputFocus(e) {
		_log.debug('_inputFocus', e);

		this.emit('mousedown');
		this._showInk(e);
		this.isFocused = true;
	}

	/**
	 * [_onClick description]
	 * @return {[type]} [description]
	 */
	_onClick(e) {
		_log.debug('_onClick', e);
	}

	/**
	 * [_initInk description]
	 * @return {[type]} [description]
	 */
	_initInk() {
		_log.debug('_initInk');
		var opts = this.options;

		this.ink = new Element('span', {
			class: 'field-ink'
		}).inject(this.element);
	}

	/**
	 * [_initEffect description]
	 * @param  {[type]} inner [description]
	 * @param  {[type]} x     [description]
	 * @param  {[type]} y     [description]
	 * @return {[type]}       [description]
	 */
	_showInk(e) {
		_log.debug('_showInk', e);

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

		// this.inkFx.start({
		//     width: size,
		//     top: top + height - 2,
		//     bottom: 'initial',
		//     left: left,
		//     opacity: 1
		// });
	}


	/**
	 * [_initEffect description]
	 * @param  {[type]} inner [description]
	 * @param  {[type]} x     [description]
	 * @param  {[type]} y     [description]
	 * @return {[type]}       [description]
	 */
	_setInk(e) {
		_log.debug('_showInk');
		if (this.readonly) return;

		//if (this.ink) return;

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
	 * @param  {[type]} inner [description]
	 * @param  {[type]} x     [description]
	 * @param  {[type]} y     [description]
	 * @return {[type]}       [description]
	 */
	_hideInk() {
		_log.debug('_showInk');
		var self= this;

		var input = this.input;
	
		var duration = '.2s';
		var width = input.compute('width').replace('px', '');
		var size = width / 2;

		this.ink.animate({'width': '0px'}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'left': size}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'opacity': '0'}, {duration: duration, equation: 'ease-out'});

		// this.inkFx.start({
		//     width: 0,
		//     left:size,
		//     top: coord.top + coord.height - 2,
		//     bottom: 'initial',
		// 	opacity: 0
		// });

		setTimeout( function() {
			if (self.ink) {
				self.ink.destroy();
				self.ink = null;
			}
		}, 100);
	}

	/**
	 * [_initError description]
	 * @return {[type]} [description]
	 */
	error() {
		this.error = new Element('span', {
			class: 'error-message'
		}).inject(this.element);
	}

	/**
	 * [setError description]
	 * @param {[type]} error [description]
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

