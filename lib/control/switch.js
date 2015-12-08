'use strict';

var Control = require('../control');

var Element = require('../element');
var bind = require('../module/bind');

var defaults = {
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
 * 
 */
class Switch extends Control {

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	init(options){
		super.init(options);
		this.options = [ defaults, options ].reduce(Object.assign, {});
		
		this.name = this.options.name;
		this.value = this.options.value;

		return this;
	}

	/**
	 * [build description]
	 * @return {instance} The class intance
	 */
	build(){
		super.build();

		var text = this.options.label || this.options.text;

		this.wrapper = new Element('div.switch-wrapper').inject(this.element);
		this.control = new Element('span.switch-control').inject(this.wrapper);
		this.knob = new Element('span.switch-knob').inject(this.control);
		
		if (this.options.label !== null) {
			this.label = new Element('span.switch-label').inject(this.wrapper);
			this.label.text(text);
		}
 
		if (this.value) this.setTrue();
	}

	/**
	 * Setter
	 * @param {string} prop
	 * @param {string} value
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
	 * @return {instance} The class intance
	 */
	toggle(){
		if (this.disabled) return;

		if (this.value) {
			this.setFalse();
		} else {
			this.setTrue();
		}

		this.emit('change', this.checked);

		return this;
	}

	/**
	 * [setTrue description]
	 */
	setTrue(){
		this.value = true;
		this.animate('14px', 'rgba(0,150,136,1)', 'rgba(0,150,136,.5)');
	}

	/**
	 * [setFalse description]
	 */
	setFalse(){
		this.value = false;
		this.animate('-2px', 'rgba(241,241,241,1)', 'rgba(34,31,31,.26)');
	}

	/**
	 * [animate description]
	 * @return {instance} The class intance
	 */
	animate(left, knob, track){
		console.log('animate', left);
		var options = this.options.animation;

		this.knob.animate({'left': left}, options);
		this.knob.animate({'background-color': knob}, options);
		this.control.animate({'background-color': track}, options);

		return this;
	}
}

module.exports = Switch;
