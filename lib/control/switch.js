'use strict';

let Control = require('../control');
let Component = require('../component');

let defaults = {
	name: 'switch',
	base: 'field',
	prefix: 'ui',
	label: null,
	checked: false,
	error: false,
	value: false,
	//ink: true,
	element: {
		tag: 'span'
	},
	animation: {
		duration: ".1s",
		equation: 'ease-in'
	},
	bind: {
		'control.click': 'toggle',
		//'label.click': 'toggle'
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

		this.wrapper = new Component({tag: 'div.switch-wrapper'}).inject(this.element);
		this.control = new Component({tag:'span.switch-control'}).inject(this.wrapper);
		this.knob = new Component({tag:'span.switch-knob'}).inject(this.control);

		if (this.options.label !== null) {
			this.label = new Component({tag:'span.switch-label'}).inject(this.wrapper);
			this.label.text(text);
		}

		if (this.value) {
			this.setTrue();
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
			this.setTrue();
		} else {
			this.setFalse();
		}
	}

	/**
	 * [toggle description]
	 * @return {Object} The class instance
	 */
	toggle(){
		if (this.disabled) return;

		if (this.value) {
			this.setFalse(true);
		} else {
			this.setTrue(true);
		}

		return this;
	}

	/**
	 * [setTrue description]
	 */
	setTrue(animation){
		this.value = true;

		if (animation) {
			this.animate('14px', 'rgba(0,150,136,1)', 'rgba(0,150,136,.5)');
		} else {
			this.knob.style('left', '14px');
			this.knob.style('background-color', 'rgba(0,150,136,1)');
			this.control.style('background-color', 'rgba(0,150,136,.5)');
		}

		this.emit('change', this.value);
	}

	setFalse(animation){
		this.value = false;

		if (animation) {
			this.animate('-2px', 'rgba(241,241,241,1)', 'rgba(34,31,31,.26)');
		} else {
			this.knob.style('left', '-2px');
			this.knob.style('background-color', 'rgba(34,31,31,1)');
			this.control.style('background-color', 'rgba(34,31,31,.26)');
		}

		this.emit('change', this.value);
	}

	/**
	 * [animate description]
	 * @return {Object} The class instance
	 */
	animate(left, knob, track){
		let options = this.options.animation;

		this.knob.animate({'left': left}, options);
		this.knob.animate({'background-color': knob}, options);
		this.control.animate({'background-color': track}, options);

		return this;
	}
}

module.exports = Switch;
