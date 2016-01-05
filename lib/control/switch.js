'use strict';

import Control from '../control';
import Component from '../component';

let defaults = {
	name: 'switch',
	// base: 'field',
	prefix: 'ui',
	label: null,
	checked: false,
	error: false,
	value: false,
	bind: {
		'control.click': 'toggle',
		'label.click': 'toggle',
		// for accessibility purpose
		//'input.click': 'toggle',
		'input.focus': '_onInputFocus',
		'input.blur': '_onInputBlur'
	}
};

/**
 * Switch class
 * @class
 * @extends Control
 */
class Switch extends Control {

	/**
	 * Constructor
	 * @param  {Object} options The class options
	 * @return {Object} This class instance
	 */
	init(options){
		super.init(options);
		this.options = [ defaults, options ].reduce(Object.assign, {});

		this.name = this.options.name;
		this.value = this.options.value;

		return this;
	}

	/**
	 * build method
	 * @return {Object} The class instance
	 */
	build(){
		super.build();

		let text = this.options.label || this.options.text;

		if (this.options.disabled) {
			this.addClass('is-disabled');
		}

		this.initInput();
		this.initControl();
		// this.wrapper = new Component({tag: 'div.switch-wrapper'}).insert(this.element);
		
		if (this.options.label !== null) {
			this.label = new Component({
				tag:'span.switch-label'
			}).insert(this.element);
			this.label.text(text);
		}

		if (this.value) {
			this.check();
		}
	}

	/**
	 * [initControl description]
	 * @return {[type]} [description]
	 */
	initControl() {
		this.control = new Component({
			tag:'span.switch-control'
		}).insert(this.element); 

		this.track = new Component({
			tag:'span.switch-track'
		}).insert(this.control); 

		this.knob = new Component({
			tag:'span.switch-knob'
		}).insert(this.track);

	}

	/**
	 * [initInput description]
	 * @return {[type]} [description]
	 */
	initInput(){
		this.input = new Component({
			tag:'input',
			type: 'checkbox'
		}).insert(this.element);

		if (this.options.disabled) {
			this.input.attribute('disabled', 'disabled');
		}

		if (this.value) {
			this.input.attribute('checked', 'checked');
		}
	}

	/**
	 * Setter
	 * @param {string} prop
	 * @param {string} value
	 * @return {Object} The class instance
	 */
	set(prop, value){

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
	 * set switch value
	 * @param {boolean} value [description]
	 */
	setValue(value) {
		if (value) {
			this.check();
		} else {
			this.unCheck();
		}
	}

	/**
	 * [toggle description]
	 * @return {Object} The class instance
	 */
	toggle(){
		if (this.disabled) return;

		if (this.value) {
			this.unCheck(true);
		} else {
			this.check();
		}

		return this;
	}

	/**
	 * setTrue
	 */
	check(){
		
		this.value = true;
		this.addClass('is-checked');
		this.input.element.checked = true;
		this.emit('change', this.value);
	}

	/**
	 * setFlas
	 */
	unCheck(){
		this.value = false;
		this.removeClass('is-checked');
		this.input.element.checked = false;
		this.emit('change', this.value);
	}
}

module.exports = Switch;
