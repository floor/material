
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
			'sensor.mousedown': '_onClick',
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
	 * [set description]
	 */
	set: function() {},

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

		var pos = 'bottom';
		if (type === 'text-icon') pos = 'top';


		if (this.options.label !== null) {
			var text = opts.label || opts.text;
			this.label = new Element('span.ui-text').inject(this.element, pos);
			this.label.text(text);
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

		var ink = this.ink = new Element('span', {
			class: 'ui-ink',
		}).inject(element, 'top');

		this.ink.style({
			left: x,
			top: y
		});

		this._touchInk(ink, x, y, width, height);

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
	_touchInk: function(ink, x, y, width, height) {
		_log.debug('_touchInk', x, y, width, height);

		var size = height;
		var top = 0;
		var duration = '1s';

		this.ink = ink;

		if (width > size) {
			size = width;
			top = (height - width) / 2;
		}

		this.ink.animate({'height': size+'px'}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'width': size+'px'}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'left': '0px'}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'top': top}, {duration: duration}, {equation: 'ease-out'});
		this.ink.animate({'opacity': '0'}, {duration: duration, equation: 'ease-out'});

		var wait = duration.replace('s','')*1000;

		setTimeout(function() {
			ink.destroy();
		}, wait);
	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	_onClick: function(e) {
		_log.debug('_onClick', e);

		if (this.state === 'disabled') {
			return;
		}

		var opts = this.options;

		e.stopPropagation();

		if (opts.emit && this.state !== 'disabled') {
			this.emit(opts.emit);
		}

		this._initInk(e);

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
	 * @return {void}
	 */
	_onMouseLeave: function(e) {
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
	 * @return {void}
	 */
	_onMouseEnter: function(e) {
		_log.debug('_onDblClick', e);
		var opts = this.options;

		e.stopPropagation();

		if (opts.emit && this.state !== 'disabled') {
			this.emit('dblpress', opts.emit);
		}

		this.emit('dblpressed', opts.emit);
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
