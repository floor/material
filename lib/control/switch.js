
/**
 * Switch control class
 *
 * @class control/switch
 */
"use strict";

var prime = require("prime/index"),
	Component = require('../component'),
	Control = require('../control'),
	Element = require('../element'),
	Field = require('./Field'),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	bind = require('../module/bind'),
	merge = require("deepmerge");

var	_log = __debug('material:control-switch');
//	_log.defineLevel('DEBUG');

var Switch = prime({

	inherits: Control,

	mixin: [Options, Emitter, bind],

	name: 'switch',

	options: {
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
			'control.click': 'click',
			'label.click': 'click'
		}
	},

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options){
		this.options = merge(Control.parent.options, this.options);

		this.setOptions(options);

		_log.debug('constructor', this.options);

		this.emit('init');

		this.init();
		this.build();
		
		if (this.options.bind) {
			this.bind(this.options.bind);
		}

		return this;	
	},

	/**
	 * [build description]
	 * @return {[type]} [description]
	 */
	build: function() {
		Field.parent.build.call(this);

		var	opts = this.options;

		this.addClass('ui-field');

		this.checked = opts.value;

		this.wrapper = new Element('div.switch-wrapper').inject(this.element);
		this.control = new Element('span.switch-control').inject(this.wrapper);
		this.knob = new Element('span.switch-knob').inject(this.control);
		
		if (opts.label !== null)
			this.label = new Element('span.switch-label').inject(this.wrapper);


		this.label.text(opts.label || opts.text);
		//this.error();
 

		if (this.checked) this.toggle();
	},

	/**
	 * [_onClick description]
	 * @return {[type]} [description]
	 */
	click:function(ev) {
		_log.debug('_onClick', ev);
		if (this.readonly) return;

		this.toggle(ev);
	},

	/**
	 * [toggle description]
	 * @return {[type]} [description]
	 */
	toggle: function() {
		if (this.disabled) return;

		if (this.checked) {
			this.checked = false;
			this.animate('-2px', 'rgba(241,241,241,1)', 'rgba(34,31,31,.26)');
		} else {
			this.checked = true;
			this.animate('14px', 'rgba(0,150,136,1)', 'rgba(0,150,136,.5)');
		}

		this.emit('change', this.checked);
	},

	/**
	 * [animate description]
	 * @return {[type]} [description]
	 */
	animate: function(left, knob, track) {
		var options = this.options.animation;

		this.knob.animate({'left': left}, options);
		this.knob.animate({'background-color': knob}, options);
		this.control.animate({'background-color': track}, options);
	}
});

module.exports = Switch;
