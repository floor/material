'use strict';

import Control from '../control';
import Component from '../component';

var defaults = {
	name: 'field',
	type: 'text',
	value: null,
	error: true,
	bind: {
		'input.focus': '_onInputFocus',
		'input.blur': '_onInputBlur'
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
		this._initUnderline();

		// if (opts.error) {
		// 	this.initError();
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
		}).insert(this.element);

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
		}).insert(this.element);

		if (this.readonly) {
			this.input.attribute('readonly', 'readonly');
			this.input.attribute('tabindex', '-1');
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
	_onInputFocus(e) {

		if (this.readonly) return;
		this.setState('focus');
	}

	/**
	 * [_onBlur description]
	 * @return {Object} The class instance
	 */
	_onInputBlur() {

		if (this.readonly) return;
		this.setState(null);
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
