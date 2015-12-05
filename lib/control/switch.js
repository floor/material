
/**
 * Switch control class
 *
 * @class control/switch
 */
"use strict";

var Control = require('../control');

var Component = require('../component');

var Element = require('../element');
var Field = require('./Field');
var bind = require('../module/bind');

var defaults = {
	name: 'switch',
	label: null,
	checked: false,
	error: false,
	//ink: true,
	element: {
		tag: 'span'
	},
	opts: {
		type: 'ckeck',
		
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


var	_log = __debug('material:control-switch');
//	_log.defineLevel('DEBUG');

/**
 * Switch class
 * @class
 * @extends {Control}
 * 
 */
class Switch extends Control {

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor(options){
		_log.debug('constructor', options);

		this.emit('init');

		this.init();
		this.build();
		
		if (this.options.binding) {
			this.initBinding(this.options.binding);
		}

		return this;	
	}

	init(options) {
		this.name = 'swtich';

		this.options = [ defaults, options ].reduce(Object.assign, {});
	}

	/**
	 * [build description]
	 * @return {[type]} [description]
	 */
	build() {
		Field.parent.build.call(this);

		var	opts = this.options;

		this.addClass('ui-field');

		this.checked = opts.value;

		this.wrapper = new Element('div.switch-wrapper').inject(this.element);
		this.control = new Element('span.switch-control').inject(this.wrapper);
		this.knob = new Element('span.switch-knob').inject(this.control);
		
		if (opts.label !== null) {
			this.label = new Element('span.switch-label').inject(this.wrapper);
			this.label.text(opts.label || opts.text);
		}

		//this.error();
 
		if (this.checked) this.toggle();
	}

	/**
	 * Setter
	 * @param {string} prop
	 * @param {string} value
	 */
	set(prop, value) {
		var self = this;

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
	 * [toggle description]
	 * @return {[type]} [description]
	 */
	toggle() {
		if (this.disabled) return;

		if (this.checked) {
			this.checked = false;
			this.animate('-2px', 'rgba(241,241,241,1)', 'rgba(34,31,31,.26)');
		} else {
			this.checked = true;
			this.animate('14px', 'rgba(0,150,136,1)', 'rgba(0,150,136,.5)');
		}

		this.emit('change', this.checked);
	}

	/**
	 * [animate description]
	 * @return {[type]} [description]
	 */
	animate(left, knob, track) {
		var options = this.options.animation;

		this.knob.animate({'left': left}, options);
		this.knob.animate({'background-color': knob}, options);
		this.control.animate({'background-color': track}, options);
	}
};

module.exports = Switch;
