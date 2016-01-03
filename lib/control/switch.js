'use strict';

import Control from '../control';
import Component from '../component';

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
		duration: '200',
		easing: 'ease-out'
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
		
		this.control = new Component({
			tag:'span.switch-control'
		}).addEvent('click', (e) => {
			this.toggle(e);
		}).inject(this.wrapper); 

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
		let options = this.options.animation;
		let method = 'animate';
		if (!animation) method = 'style';

		this.value = true;

		this.knob[method]({
			'left': '14px',
			'background-color': 'rgba(0,150,136,1)',
		}, options);
		this.control[method]({
			'background-color': 'rgba(0,150,136,.5)'
		}, options);

		this.emit('change', this.value);
	}


	setFalse(animation){
		let options = this.options.animation;
		let method = 'animate';
		if (!animation) method = 'style';

		this.value = false;

		this.knob.animate({
			'left': '-2px',
			'background-color': 'rgba(241,241,241,1)'
		}, options);
		this.control.animate({
			'background-color': 'rgba(34,31,31,.26)'
		}, options);

		this.emit('change', this.value);
	}
}

module.exports = Switch;
