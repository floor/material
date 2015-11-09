
/**
 * control class
 *
 * @class control
 */
"use strict"

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
		ink: true,
		element: {
			tag: 'span'
		},
		bind: {
			'sensor.click': '_onClick',
			'sensor.dblclick': '_onDblClick',
			'sensor.mousedown': '_onMouseDown',
			'sensor.mouseup': '_onMouseUp',
			'sensor.mouseleave': '_onMouseLeave'
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

		_log.debug('this.options', this.options);

		this.setOptions(options);
		
		_log.debug('this.options', this.options);

		//this.options = mergeObject(Button.parent.options, this.options);

		_log.debug('option ', this.options);

		this.emit('init');

		this._initOptions();
		this._initElement();
		this._initEvents();

		if (this.options.bind) {
			this.bind(this.options.bind);
		}

		return this;
	},


	/**
	 * [set description]
	 */
	set: function() {},

	/**
	 * [_initElement description]
	 * @return {void}
	 */
	_initElement: function() {
		Button.parent._initElement.call(this);

		_log.debug('_initElement', this.element);

		var opts = this.options;
		var type = opts.type;

		opts.label = opts.label || opts.n;

		if (type === null) {
			type = 'icon-text';
		}

		/*if (opts.text && type != 'icon') {
			this.element.set('html', opts.text);
		}*/
		//var text = opts.type.match(/text/g);

		if (opts.name) {
			this.element.setAttribute('data-name', opts.name);
		}


		//this.element.attributes('title', opts.text);

		if (opts.icon) {
			this._initIcon(type, opts.icon || opts.name);
		}

		if (opts.label || opts.text) {
			this._initLabel(type);
		}

		if (opts.ink) {
			_log.debug('call _initSensor');
			this._initSensor();
		} else {
			this.sensor = this.element;
		}
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

		this.icon = new Element(tag, prop).inject(this.element);

		if (mnml.icon.mdi[name]) {
			//_log.debug('mdi');
			klss = 'icon-mdi';
			code = mnml.icon.mdi[name];
		} else if (mnml.icon.font[name]) {
			//_log.debug('iocn font name', name);
			klss = 'icon-font';
			code = mnml.icon.font[name];
		}

		if (klss) {
			this.icon.addClass(klss);
		}

		if (code) {
			this.icon.addClass(code);
		}
	},

	/**
	 * [_initText description]
	 * @param  {string} type
	 * @return {void}
	 */
	_initLabel: function(type) {
		var opts = this.options;

		var tag = 'span';

		var pos = 'bottom';
		if (type === 'text-icon') {
			pos = 'top';
		}

		this.label = new Element(tag, {
			'class': 'ui-text'
		}).inject(this.element, pos);

		var text = opts.label || opts.text;

		this.label.text(text);
	},

	/**
	 * [_initClass description]
	 * @return {void}
	 */
	_initClass: function() {
		var opts = this.options;
		//_log.debug(this.name);
		Button.parent._initClass.call(this);

		if (this.options.isPrimary) {
			this.element.addClass('is-primary');
		}
	},

	/**
	 * [_initText description]
	 * @return {void}
	 */
	_initSensor: function() {
		_log.debug('_initSensor', this.element);

		this.sensor = new Element('div', {
			'class': 'ui-sensor'
		}).inject(this.element);

		_log.debug('sensor', this.sensor);
	},

	/**
	 * [_initEffect description]
	 * @param  {string} ink
	 * @param  {string} x
	 * @param  {string} y
	 * @param  {Object} coord
	 * @return {void}
	 */
	_touchInk: function(ink, x, y, coord) {
		var size = coord.height;
		var top = 0;
		var duration = 1000;

		this.ink = ink;

		if (coord.width > size) {
			size = coord.width;
			top = (coord.height - coord.width) / 2;
		}

		var fx = new Fx.Morph(ink, {
			duration: duration,
			link: 'chain',
			transition: Fx.Transitions.Quart.easeOut
		});

		fx.start({
			height: size,
			width: size,
			left: 0,
			top: top,
			opacity: 0
		});

		(function() {
			ink.destroy();
		}).delay(duration);
	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	_onClick: function(e) {
		_log.debug('_onClick', e);

		var opts = this.options;

		e.stopPropagation();

		if (opts.emit && this.state !== 'disabled') {
			this.emit(opts.emit);
		}

		this.emit('press', opts.emit);
		this.emit('pressed', opts.emit);
	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	_onDblClick: function(e) {
		_log.debug('_onDblClick', e);
		var opts = this.options;

		e.stopPropagation();

		if (opts.emit && this.state !== 'disabled') {
			this.emit('dblpress', opts.emit);
		}

		this.emit('dblpressed', opts.emit);
	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {Object}
	 */
	_onMouseDown: function(e) {
		//_log.debug('_onElementMouseDown', e);

		e.stop();

		if (this.state === 'disabled') {
			return;
		}

		var x = e.event.offsetX;
		var y = e.event.offsetY;

		var coord = this.element.getCoordinates(this.element);

		var ink = this.ink = new Element('span', {
			class: 'ui-ink',
			styles: {
				left: x,
				top: y
			}
		}).inject(this.element, 'top');

		this._touchInk(ink, x, y, coord);

		this.emit('mousedown');
	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	_onMouseLeave: function(e) {
		//_log.debug('_onMouseLeave', e);


	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	_onMouseEnter: function(e) {
		//_log.debug('_onElementMouseDown', e);


	},

	/**
	 * [_onElementMouseUp description]
	 * @return {void}
	 */
	_onMouseUp: function(e) {
		//_log.debug('_onElementMouseUp', e);

		if (this.options.type === 'check') {
			if (this.state === 'checked') {
				this.setState(null);
			} else {
				this.setState('checked');
			}
		}

		//this.react.destroy();
	}

});

module.exports = Button;
