
/**
 * Switch control class
 *
 * @class control/switch
 */
"use strict";

var prime = require("prime/index"),
	Component = require('../component'),
	Element = require('../element'),
	Control = require('../Control'),
	Field = require('./Field'),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	bind = require('../module/bind'),
	merge = require("deepmerge"),
	$ = require("elements"),
	zen = require('elements/zen');

var	_log = __debug('material:control-switch');
//	_log.defineLevel('DEBUG');

var Switch = prime({

	inherits: Field,

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
		bind: {
			'control.click': '_onClick',
			'label.click': '_onClick'
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

		this._initOptions();
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

		this.checked = opts.value;

		var options = opts.opts;

		this.wrapper = new Element('div', {
			'class': 'switch-wrapper'
		}).inject(this.element);

		this._initLabel(opts);
		this._initSwitch(opts);

		this._initError();

		if (this.checked) this.check.addClass('checked');
	},

	/**
	 * [_initCheck description]
	 * @return {[type]} [description]
	 */
	_initSwitch: function() {
		var self = this;

		this.control = new Element('span', {
			'class': 'control-switch',
		}).inject(this.wrapper);

		this.knob = new Element('span', {
			'class': 'switch-knob',
			html: '&nbsp;'
		}).inject(this.control);
	},

	/**
	 * [_initText description]
	 * @param  {[type]} opts [description]
	 * @return {[type]}      [description]
	 */
	_initLabel: function(opts) {
		var self = this;

		var label = opts.label || opts.text;

		this.label = new Element('span', {
			'class': 'field-label',
			html: label
		}).inject(this.wrapper);
	},

	/**
	 * [_onClick description]
	 * @return {[type]} [description]
	 */
	_onClick:function(ev) {
		_log.debug('_onClick', ev);
		if (this.readonly) return;

		this.toggle(ev);
	},

	/**
	 * [toggle description]
	 * @return {[type]} [description]
	 */
	toggle: function() {
		if (this.checked) {
			this.checked = false;

			this.knob.animate({'left': '-2px'}, {duration: ".1s", equation: 'ease-in'});
			this.knob.animate({'background-color': 'rgba(241,241,241,1);'}, {duration: ".2s", equation: 'ease-in'});
			this.control.animate({'background-color': 'rgba(34,31,31,.26)'}, {duration: ".2s", equation: 'ease-in'});
		} else {
			this.checked = true;

			this.knob.animate({'left': '16px'}, {duration: ".1s", equation: 'ease-in'});
			this.knob.animate({'background-color': 'rgba(0,150,136,1)'}, {duration: ".2s", equation: 'ease-in'});
			this.control.animate({'background-color': 'rgba(0,150,136,.5)'}, {duration: ".2s", equation: 'ease-in'});
		}

		this.emit('change', this.checked);
	}
});

module.exports = Switch;
