'use strict';

import Control from '../control';
import Component from '../component';

var defaults = {
	name: 'field',
	type: 'text',
	value: null,
	error: true
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
	 * @return {Object} The class instance
	 */
	init(options) {
		super.init(options);

		//this.setOptions();

		//this.options = [ defaults, options ].reduce(Object.assign, {});
		Object.assign(this.options, [defaults, options].reduce(Object.assign, {}));

		return this;
	}

	/**
	 * [build description]
	 * @return {Object} The class instance
	 */
	build(){
		//create a new div as input element
		super.build();

		var opts = this.options;

		this.addClass('ui-field');

		if (this.disabled) {
			this.addClass('is-disabled');
		}

		if (opts.klss) {
			this.addClass(opts.klss);
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
	 * @return {Object} The class instance
	 */
	_initLabel() {
		var label = this.options.label;
		var text;

		if (label === null || label === false) {
			text = '';
		} else if (this.options.label) {
			text = label;
		} else {
			text = this.options.name;
		}

		this.label = new Component({
			tag: 'label',
			'for': this.options.name
		}).inject(this.element);

		this.label.text(text);
	}

	/**
	 * [_initInput description]
	 * @return {Object} The class instance
	 */
	_initInput() {

		this.input = new Component({
			tag: 'input',
			type: this.options.type,
			value: this.options.value,
			placeholder: this.options.text
		}).addEvent('focus', (e) => {
			this._onFocus(e);
		}).addEvent('blur', (e) => {
			this._onBlur(e);
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
	 * @return {Object} The class instance
	 */
	_initValue(){
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
	_onFocus(e) {
		console.log('onFocus');
		this.emit('mousedown');
		this.setState('focus');
		this._showUnderline(e);
		this.isFocused = true;
	}

	/**
	 * [_onBlur description]
	 * @return {Object} The class instance
	 */
	_onBlur() {
		console.log('onBlur');
		if (this.readonly) return;

		this.setState(null);
		this._hideUnderline();
		this.isFocused = false;
	}

	/**
	 * _initUnderline
	 * @return {Object} The class instance
	 */
	_initUnderline() {
		this.underline = new Component({
			tag: 'span.field-underline'
		}).inject(this.element);
	}

	/**
	 * [_initEffect description]
	 * @param  {Event} e Event
	 * @return {Object} The class instance
	 */
	_showUnderline(e) {
		console.log('_showUnderline', this.underline, e);

		if (this.readonly || this.underline) return;

		if (!this.underline) {
			this._initUnderline();
		}

		var duration = 200;
		var input = this.input;
		var label = this.label;

		var width = input.offset('width');
		var inputHeight = input.offset('height');
		var labelHeight = label.offset('height');

		var x = width / 2;

		if (e === 0) {
			x = 0;
		} else if (e && e.offsetX) {
			x = e.offsetX;
		}

		this.underline.style({
			left: x+'px',
			top: inputHeight + labelHeight + 'px'
		});

		this.underline.addClass('display');
	}

	_hideUnderline() {
		this.underline.destroy();
		console.log('destroy', this.underline);
	}

	/**
	 * [_initError description]
	 * @return {Object} The class instance
	 */
	error() {
		this.error = new Component({
			tag: 'span.error-message'
		}).inject(this.element);
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
