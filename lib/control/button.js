
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

var prime = require("prime/index"),
	Component = require('../component'),
	Element = require('../element'),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	binding = require('../module/binding'),
	merge = require("deepmerge"),
	$ = require("elements"),
	zen = require('elements/zen');

var	_log = __debug('material:button');
//	_log.defineLevel('DEBUG');

var Button = prime({

	inherits: Component,
	
	mixin: [Options, Emitter, binding],

	name: 'button',
	options: {
		name: 'button',
		type: null, // push, file
		element: {
			tag: 'button'
		},
		ink: {
			duration: '.5s',
			equation: 'ease-out'
		},
		binding: {
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

		this.init();
		this.build();

		if (this.options.binding) {
			this.bindall(this.options.binding);
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
			this.element.attribute('data-name', opts.name);
		}

		this.element.attribute('title', opts.text);

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

		var prop = {
			'class': 'ui-icon'
		};

		this.icon = new Element(tag, prop).inject(this.element);

		// prepare use of svg
		// this.iconsvg = new Element('svg', prop).inject(this.element);
		// this.svguse = new Element('use').inject(this.iconsvg);

		// this.iconsvg.attribute('viewBox', '0 0 24 24');
		// this.svguse.attribute('xlink:href','/vendor/icon/content-send.svg');

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

		var ink = this.ink = new Element('span.ui-ink').inject(element, 'top');

		this.ink.style({
			left: x - 5,
			top: y - 5
		});

		this._touchInk(ink);

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
	_touchInk: function(ink) {
		_log.debug('_touchInk');

		var coord = this._inkCoord(ink);
		var options = this.options.ink;
		
		this.ink = ink;

		this.animate({
			width: coord.size+'px',
			height: coord.size+'px',
			left: '0',
			top: coord.top +'px',
			opacity: '0'
		}, options.duration, options.equation);

		var wait = options.duration.replace('s','')*1000;

		setTimeout(function() {
			ink.destroy();
		}, wait);
	},

	/**
	 * [_inkCoord description]
	 * @param  {[type]} ink [description]
	 * @return {[type]}     [description]
	 */
	_inkCoord: function(ink) {
		var height = this.element.compute('height').replace('px', '');
		var width = this.element.compute('width').replace('px', '');

		width = parseInt(width);
		height = parseInt(height);

		var size = width;
		var top = 0;

		if (width > height) {
			size = width;
			top = (height - width) / 2;
		} else if (width < height) {
			size = height;
			top = (width - height) / 2;
		}

		return {
			size: size,
			top: top
		}
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

		//console.log('mouseleave', e);

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
