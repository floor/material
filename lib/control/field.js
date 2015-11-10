/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Control = require('../control'),
	Element = require('../element'),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	bind = require("../module/bind"),
	merge = require("deepmerge"),
	__debug = require('../module/debug');

var	_log = __debug('material:control-field');
//	_log.defineLevel('DEBUG');

var Field = prime({
	
	inherits: Control,
	
	mixin: [Options, Emitter, bind],

	name: 'field',

	options: {
		name: 'field',
		base: 'control',
		tag: 'div',
		type: 'input',
		value: null,
		error: true,
		bind: {
			'input.click': '_onFocus',
			'input.keyup': '_onKeyUp',
			'input.keydown': '_onKeyDown',
			'input.mousedown': '_onMouseDown',
			'input.focus': '_onFocus',
			'input.blur': '_onBlur'
		}
	},

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options){
		this.setOptions(options);

		_log.debug('constructor', this.options);

		this.emit('init');

		this._initOptions();
		this._initElement();

		if (this.options.bind) {
			this.bind(this.options.bind);
		}

		return this;
	},

	/**
	 * [_initElement description]
	 * @return {[type]} [description]
	 */
	_initElement: function(){
		//create a new div as input element
		Field.parent._initElement.call(this);

		var opts = this.options;

		_log.debug('_initElement', opts.name, opts.klss);

		this.element.addClass('ui-field');

		if (opts.klss) {
			this.element.addClass(opts.klss);
		}

		if (opts.label !== false) {
			this._initLabel();
		}

		this._initInput();

		if (opts.error) {
			this._initError();
		}
	},

	/**
	 * [_initLabel description]
	 * @return {[type]} [description]
	 */
	_initLabel: function()  {
		_log.debug('_initLabel');
		var label = this.options.label,
			text;

		if (label === null || label === false) {
			text = label || this.options.name;
		} else if (this.options.label) {
			text = label;
		} else {
			text = '';
		}

		this.label = new Element('label', {
			tag: 'label',
			html: text,
			'for': this.options.name
		}).inject(this.element);
	},

	/**
	 * [_initInput description]
	 * @return {[type]} [description]
	 */
	_initInput: function()  {
		_log.debug('_initInput', this.options);

		this.input = new Element('input', {
			name: this.options.name,
			type: 'text',
			value: this.options.value,
			placeholder: this.options.text
		}).inject(this.element);

		if (this.readonly) {
			this.input.setAttribute('readonly', 'readonly');
			this.input.setAttribute('tabindex', '-1');
		}

		return this.input;
	},

	/**
	 * [_initName description]
	 * @param  {[type]} name [description]
	 * @return {[type]}      [description]
	 */
	_initName: function(name) {
		var opts = this.options;

		if (opts.name) {
			this.label.setAttribute('html', name);
			this.input.setAttribute('name', name);
		}
	},

	/**
	 * [_initValue description]
	 * @return {[type]} [description]
	 */
	_initValue: function(){
		var opts = this.options;

		//create a new div as input element
		if (opts.value) {
			this.setValue(opts.value);
		}
	},


	/**
	 * [getValue description]
	 * @return {[type]} [description]
	 */
	getValue: function(){
		return this.input.get('value');
	},

	/**
	 * [setValue description]
	 * @param {[type]} value [description]
	 */
	setValue: function(value){
		this.input.setAttribute('value', value);
		this.value = value;
		this.emit('change' , value);
	},

	/**
	 * [_onKeyUp description]
	 * @return {[type]} [description]
	 */
	_onKeyUp: function(e) {
		_log.debug('_onKeyUp', e);
		this.emit('change', this.get('value'));
	},

	/**
	 * [_onKeyUp description]
	 * @return {[type]} [description]
	 */
	onKeyDown: function(e) {
		_log.debug('onKeyDown');
		if (this.readonly) { 
			e.stop();
			return;
		}

		this.fireEvent('change', this.get('value'));
	},

	/**
	 * [_onMouseDown description]
	 * @return {[type]} [description]
	 */
	_onMouseDown: function(e) {
		_log.debug('mousedown');
		
		if (this.readonly) return;

		this.isFocused = true;
		this.setState('focus');
		this._inputFocus(e);
		//e.stopPropagation();
		//this.focus();
		//this._inputFocus(e);
	},

	/**
	 * [_onFocus description]
	 * @return {[type]} [description]
	 */
	_onFocus: function(e) {
		_log.debug('focus', e);

		this.emit('mousedown');
		this._showInk(e);
		this.isFocused = true;
	},

	/**
	 * [_onBlur description]
	 * @return {[type]} [description]
	 */
	_onBlur: function(e) {
		//_log.debug('_onBlur');

		if (this.readonly) return;

		this.setState(null);
		this._hideInk();
		this.isFocused = false;
	},

	/**
	 * [_inputFocus description]
	 * @param  {event} e [description]
	 * @return {[type]}   [description]
	 */
	_inputFocus: function(e) {
		_log.debug('_inputFocus', e);

		this.emit('mousedown');
		this._showInk(e);
		this.isFocused = true;
	},

	/**
	 * [_onClick description]
	 * @return {[type]} [description]
	 */
	_onClick: function(e) {
		_log.debug('_onClick', e);
	},

	/**
	 * [_initInk description]
	 * @return {[type]} [description]
	 */
	_initInk: function() {
		_log.debug('_initInk');
		var opts = this.options;

		this.ink = new Element('span', {
			class: 'field-ink'
		}).inject(this.element);
	},

	/**
	 * [_initEffect description]
	 * @param  {[type]} inner [description]
	 * @param  {[type]} x     [description]
	 * @param  {[type]} y     [description]
	 * @return {[type]}       [description]
	 */
	_showInk: function(e) {
		_log.debug('_showInk');

		if (this.readonly) return;

		if (this.ink) return;
		var duration = '.2s';
		var input = this.input;

		var width = input.compute('width').replace('px', '');
		var height = input.compute('height').replace('px', '');
		var left = input.compute('left').replace('px', '');

		var x = width / 2;

		if (e === 0) {
			x = 0;
		} else if (e && e.offsetX) {
			x = e.offsetX;
		}

		var size = width;
		var top = 0;

		if (!this.ink) {
			this._initInk();
		}

		this.ink.style('left', x);

		this.ink.animate({'width': size}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'left': size}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'top': top + height - 2}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'bottom': 'initial'}, {duration: duration, equation: 'ease-out'});
		this.ink.animate({'opacity': '1'}, {duration: duration, equation: 'ease-out'});

		// this.inkFx.start({
		//     width: size,
		//     top: top + height - 2,
		//     bottom: 'initial',
		//     left: left,
		//     opacity: 1
		// });
	},


	/**
	 * [_initEffect description]
	 * @param  {[type]} inner [description]
	 * @param  {[type]} x     [description]
	 * @param  {[type]} y     [description]
	 * @return {[type]}       [description]
	 */
	_setInk: function(e) {
		_log.debug('_showInk');
		if (this.readonly) return;

		//if (this.ink) return;

		var height = input.compute('height').replace('px', '');
		var left = input.compute('left').replace('px', '');
		var width = input.compute('width').replace('px', '');

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
	},

	/**
	 * [_initEffect description]
	 * @param  {[type]} inner [description]
	 * @param  {[type]} x     [description]
	 * @param  {[type]} y     [description]
	 * @return {[type]}       [description]
	 */
	_hideInk: function() {
		_log.debug('_showInk');
		var self= this;

		var input = this.input;
	
		var height = input.compute('height').replace('px', '');
		var top = input.compute('top').replace('px', '');
		var size = width / 2;

		this.ink.animate({'height': size+'px'}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'width': '0px'}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'left': size}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'top': top + height - 2}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'bottom': 'initial'}, {duration: duration, equation: 'ease-out'});
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
	},

	/**
	 * [_initError description]
	 * @return {[type]} [description]
	 */
	_initError: function() {
		this.error = new Element('span', {
			class: 'error-message'
		}).inject(this.element);
	},

	/**
	 * [set description]
	 * @param {[type]} name  [description]
	 * @param {[type]} value [description]
	 */
	set: function(value) {
		_log.debug('set', value);

		this.input.set('value', value);
		this.fireEvent('change', value);
	},

	/**
	 * [setError description]
	 * @param {[type]} error [description]
	 */
	setError: function(error) {
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
});

module.exports = Field;

