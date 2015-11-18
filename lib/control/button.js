
/**
 * Button control class
 * @class Button
 * @extends {Control}
 * @param {Object} options Default options for view
 * @since 0.0.1
 * @author Jerome Vial
 *
 * @type {Class}
 */
'use strict';

var prime = require("prime/index"),
	Component = require('../component'),
	Element = require('../element'),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	bind = require('../module/bind'),
	merge = require("deepmerge"),
	$ = require("elements"),
	zen = require('elements/zen');

var	_log = __debug('material:button');
//	_log.defineLevel('DEBUG');

var Button = prime({

	inherits: Component,
	
	mixin: [Options, Emitter, bind],

	name: 'button',
	options: {
		name: 'button',
		type: null, // push, file
		element: {
			tag: 'span'
		},
		ink: {
			duration: '.5s',
			equation: 'ease-out'
		},
		bind: {
			'sensor.click': 'press',
			'sensor.dblclick': '_onDblClick',
			'sensor.mousedown': '_onMouseDown',
			'sensor.mouseup': '_onMouseUp',
			'sensor.mouseleave': '_onMouseLeave',
			'sensor.mouseenter': '_onMouseEnter'
		}
	},

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options){
		_log.debug('constructor', options);
		
		this.options = merge(Button.parent.options, this.options);
		this.setOptions(options);

		_log.debug('option ', this.options);

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
	 * @return {void}
	 */
	build: function() {
		Button.parent.build.call(this);

		_log.debug('build', this.element);

		var opts = this.options;
		var type = opts.type;

		opts.label = opts.label || opts.n;

		if (type === null) {
			type = 'icon-text';
		}

		if (opts.name) {
			this.element.setAttribute('data-name', opts.name);
		}

		this.element.setAttribute('title', opts.text);

		if (opts.icon) {
			this._initIcon(type, opts.icon || opts.name);
		}

		this._initLabel(type);

		if (opts.ink) {
			_log.debug('call _initSensor');
			this._initSensor();
		} else {
			this.sensor = this.element;
		}
	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	press: function(e) {
		_log.debug('press', e);
		e.stopPropagation();
		var opts = this.options;

		if (this.state === 'disabled') {
			return;
		}

		this._initInk(e);

		if (opts.emit) {
			this.emit(opts.emit);
		}

		this.emit('press', opts.emit);
		this.emit('pressed', opts.emit);

		return this;
	},

	/**
	 * [_initIcon description]
	 * @param  {string} type 
	 * @return {string}
	 */
	_initIcon: function(type, name) {
		_log.debug('_initIcon', type, name);

		var tag = 'span';
		var code = name;
		var klss = null;

		var prop = {
			'class': 'ui-icon'
		};

		this.icon = new Element('span', prop).inject(this.element);

		if (klss) {
			this.icon.addClass(klss);
		}

		if (code) {
			this.icon.addClass(code);
		}
	},

	/**
	 * [_initLabel description]
	 * @param  {string} type
	 * @return {void}
	 */
	_initLabel: function(type) {
		var options = this.options;

		var position = 'bottom';
		if (type === 'text-icon')  {
			position = 'top';
		}

		if (this.options.label !== null) {
			var text = options.label || options.text;
			this.label = new Element('span.ui-text').inject(this.element, position);
			this.label.text(text);
		}
	},

	/**
	 * [_initText description]
	 * @return {void}
	 */
	_initSensor: function() {
		_log.debug('_initSensor', this.element);

		this.sensor = new Element('div.ui-sensor')
			.inject(this.element);
	},

	// INK

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {Object}
	 */
	_initInk: function(e) {
		_log.debug('_onElementMouseDown', e);

		var element = this.element;

		var x = e.offsetX;
		var y = e.offsetY;

		var height = element.compute('height').replace('px', '');
		var width = element.compute('width').replace('px', '');

		var ink = this.ink = new Element('span.ui-ink').inject(element, 'top');

		this.ink.style({
			left: x - 5,
			top: y - 5
		});

		this._touchInk(ink, width, height);

		this.emit('mousedown');
	},

	/**
	 * [_initEffect description]
	 * @param  {string} ink
	 * @param  {string} x
	 * @param  {string} y
	 * @param  {Object} coord
	 * @return {void}
	 */
	_touchInk: function(ink, width, height) {
		_log.debug('_touchInk', width, height);

		var size = height;
		var top = 0;
		var options = this.options.ink;

		this.ink = ink;

		if (width > size) {
			size = width;
			top = (height - width) / 2;
		}

		this.animate({
			height: size+'px',
			width: size+'px',
			left: '0',
			top: top,
			opacity: '0'
		}, options.duration, options.equation);

		var wait = options.duration.replace('s','')*1000;

		setTimeout(function() {
			ink.destroy();
		}, wait);
	},

	/**
	 * [animate description]
	 * @param  {[type]} object   [description]
	 * @param  {[type]} duration [description]
	 * @param  {[type]} equation [description]
	 * @return {[type]}          [description]
	 */
	animate: function(object, duration, equation) {

		for (var key in object) {
			 if (object.hasOwnProperty(key)) {
			 	var prop = {};
			 	prop[key] = object[key];

				this.ink.animate(
					prop,
					{duration: duration}, 
					{equation: equation}
				);
			}
		}
	},

	// EVENTS

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	_onDblClick: function(e) {
		_log.debug('_onDblClick', e);
		var opts = this.options;

		e.stopPropagation();

		this.emit('dblpressed', opts.emit);
		return this;
	},

	/**
	 * [_onElementMouseUp description]
	 * @return {void}
	 */
	_onMouseDown: function(e) {
		_log.debug('_onMouseDown', e);

		return this;
	},

	/**
	 * [_onElementMouseUp description]
	 * @return {void}
	 */
	_onMouseUp: function(e) {
		_log.debug('_onMouseUp', e);

		return this;
	},

	/**
	 * [_onElementMouseUp description]
	 * @return {void}
	 */
	_onMouseLeave: function(e) {
		_log.debug('_onMouseLeave', e);

		console.log('mouseleave', e);

		return this;
	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	_onMouseEnter: function(e) {
		_log.debug('_onMouseEnter', e);
		var opts = this.options;

		this.emit('mouseenter', opts.emit);

		return this;
	}

});

module.exports = Button;
