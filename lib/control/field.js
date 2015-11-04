/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Control = require('../control'),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	mergeObject = require("mout/object/merge"),
	$ = require("elements"),
	zen = require('elements/zen'),
	Fx = require("moofx"),
	__debug = require('../module/debug');

var	_log = __debug('material:control-field');

var Field = prime({
	inherits: Control,
	mixin: [Options, Emitter],

	options: {
		name: 'field',
		base: 'control',
		tag: 'div',
		type: 'input',
		value: null,
		error: true,
		useTextAsLabel: false,
		inkFx: {
		    duration: 200,
		    link: 'chain',
		    //transition: Fx.Transitions.Quart.easeOut
		},
		binding: {
			_list: ['input'],
			input: {
				'input.keyup': '_onKeyUp',
				'input.keydown': '_onKeyDown',
				'input.mousedown': '_onMouseDown',
				'input.focus': '_onFocus',
				'input.blur': '_onBlur'
			}
		}
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
		var text = this.options.name;

		if (this.options.useTextAsLabel)
			text = this.options.text;

		this.label = new Component({
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
		//_log.debug('_initInput', this.options);

		this.input = new Component({
			tag: 'input',
			name: this.options.name,
			type: this.options.type,
			value: this.options.value,
			placeholder: this.options.text
		}).inject(this.element);

		if (this.readonly) {
			this.input.set('readonly', 'readonly');
			this.input.set('tabindex', '-1');
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
			this.label.set('html', name);
			this.input.set('name', name);
		}
	},

	/**
	 * [_initValue description]
	 * @return {[type]} [description]
	 */
	_initValue: function(){
		var opts = this.options;

		//create a new div as input element
		if (opts.value)
			this.setValue(opts.value);
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
		this.input.set('value', value);
		this.value = value;
		this.fireEvent('change' , value);
	},

	/**
	 * [_initEvents description]
	 * @return {[type]} [description]
	 */
	_initEvents: function() {
		this.parent();
		
		this.addEvents({
			blur: this.setState.bind(this, 'default'),
			focus: this.setState.bind(this, 'focus')
		});
	},

	/**
	 * [_onKeyUp description]
	 * @return {[type]} [description]
	 */
	_onKeyUp: function(e) {
		this.fireEvent('change', this.get('value'));
	},

	/**
	 * [_onKeyUp description]
	 * @return {[type]} [description]
	 */
	onKeyDown: function(e) {
		//_log.debug('keydown');
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
		//_log.debug('mousedown');
		
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
		//_log.debug('focus');

		if (this.readonly) return;

		this.isFocused = true;
		this.setState('focus');
		this._inputFocus(e);
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
		//_log.debug('_inputFocus', e);

		this.fireEvent('mousedown');

		this._showInk(e);

		this.isFocused = true;
	},

	/**
	 * [_initInk description]
	 * @return {[type]} [description]
	 */
	_initInk: function() {
		var opts = this.options;

		this.ink = new Element('span', {
			class: 'field-ink'
		}).inject(this.element);

		this.inkFx = new Fx.Morph(this.ink, opts.inkFx);
	},

	/**
	 * [_initEffect description]
	 * @param  {[type]} inner [description]
	 * @param  {[type]} x     [description]
	 * @param  {[type]} y     [description]
	 * @return {[type]}       [description]
	 */
	_showInk: function(e) {
		//_log.debug('_showInk');

		if (this.readonly) return;

		//if (this.ink) return;

		var coord = this.input.getCoordinates(this.element);

		var x = coord.width / 2;

		if (e === 0)
			x = 0;
		else if (e && e.event && e.event.offsetX)
			x = e.event.offsetX;

		var size = coord.width,
			top = 0;

		if (!this.ink)
			this._initInk();

		this.ink.setStyles({
			left: x
		});

		this.inkFx.start({
		    width: size,
		    top: coord.top + coord.height - 2,
		    bottom: 'initial',
		    left: coord.left,
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
	_setInk: function(e) {

		if (this.readonly) return;

		//if (this.ink) return;

		var coord = this.input.getCoordinates(this.element);

		var x = coord.width / 2;

		var size = coord.width,
			top = 0;

		if (!this.ink)
			this._initInk();

		this.inkFx.set({
		    width: size,
		    top: coord.top + coord.height - 2,
		    bottom: 'initial',
		    left: coord.left,
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
		var self= this;
		var coord = this.input.getCoordinates(this.element);
		var size = coord.width / 2;

		if (!this.inkFx) {
			//_log.debug('errorrrrrrr');
			return;
		}

		this.inkFx.start({
		    width: 0,
		    left:size,
		    top: coord.top + coord.height - 2,
		    bottom: 'initial',
			opacity: 0
		});

		(function() {
			if (self.ink) {
				self.ink.destroy();
				self.ink = null;
			}
		}).delay(100);
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
		//_log.debug('set', value);

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

