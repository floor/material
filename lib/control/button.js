/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	mergeObject = require("mout/object/merge"),
	$ = require("elements"),
	zen = require('elements/zen'),
	Component = require('../component');

var Button = prime({

	mixin: [Options, Emitter],

	inherits: Component,
	name: 'button',
	options: {
			name: 'button',
			type: null, // push, file
			ink: true,
			element: {
				tag: 'span'
			},
			binding: {
				_list: ['element'],
				element: {
					'sensor.click': '_onClick',
					'sensor.dblclick': '_onDblClick',
					'sensor.mousedown': '_onMouseDown',
					'sensor.mouseup': '_onMouseUp',
					'sensor.mouseleave': '_onMouseLeave'
				}
			}
		},

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options){
		this.setOptions(options);

		this.options = mergeObject(Button.parent.options, this.options);

		this._initElement();
		this._initBinding();

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
		var $ = require('elements/attributes');
		Button.parent._initElement.call(this);

		var opts = this.options;
		var type = opts.type;

		opts.text = opts.text || opts.n;

		if (type === null) {
			type = 'icon-text';
		}

		/*if (opts.text && type != 'icon') {
			this.element.set('html', opts.text);
		}*/
		//var text = opts.type.match(/text/g);

		// if (opts.name) {
		// 	this.element.attributes('data-name', opts.name);
		// }


		//this.element.attributes('title', opts.text);

		if (opts.icon) {
			this._initIcon(type, opts.icon || opts.name);
		}

		if (opts.text) {
			this._initText(type);
		}

		if (opts.ink) {
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
	_initText: function(type) {
		var opts = this.options;

		var tag = 'span';

		var pos = 'bottom';
		if (type === 'text-icon') {
			pos = 'top';
		}

		this.text = new Element(tag, {
			'class': 'ui-text',
			'html': opts.text
		}).inject(this.element, pos);
	},

	/**
	 * [_initClass description]
	 * @return {void}
	 */
	_initClass: function() {
		var opts = this.options;
		//_log.debug(this.name);

		if (this.options.isPrimary) {
			this.element.addClass('is-primary');
		}

		if (this.options.klss) {
			this.element.addClass(opts.klss);
		}

		if (this.options.type) {
			this.element.addClass('type-' + this.options.type);
		}

		this.element.addClass(opts.prefix + this.name);

		if (this.options.clss) {
			this.element.addClass(this.options.clss);
		}
	},

	/**
	 * [_initText description]
	 * @return {void}
	 */
	_initSensor: function() {
		//_log.debug('_initSensor');

		this.sensor = new Component('div', {
			tag: 'div',
			'class': 'ui-sensor',
		}).inject(this.element);
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
		//_log.debug('_onElementClick', e);

		var opts = this.options;

		e.stopPropagation();

		if (opts.emit && this.state !== 'disabled') {
			this.fireEvent(opts.emit);
		}
		this.fireEvent('press', opts.emit);
		this.fireEvent('pressed', opts.emit);

		if (opts.call && this.state !== 'disabled') {
			opts.call();
		}
	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	_onDblClick: function(e) {
		var opts = this.options;

		e.stop();

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

		this.fireEvent('mousedown');
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
