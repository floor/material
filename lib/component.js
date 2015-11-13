/**
 * Component class
 * The base class for all ui components
 *
 * @class Component
 * @extends {material}
 * @return {parent} prime object
 * @example (start code)	new Component(object); (end)
 * @copyright © 1999-2016 - Jerome D. Vial. All Rights reserved.
 */"use strict"

var prime = require('prime/index'),
	Options = require('prime-util/prime/options'),
	Emitter = require('prime/emitter'),
	Element = require('./element'),
	element = require('./component/element'),
	state = require('./component/state'),
	bind = require('./module/bind'),
	$ = require('elements'),
	zen = require('elements/zen'),
	__debug = require('./module/debug');


var	_log = __debug('material:component');
//	_log.defineLevel('DEBUG');

var Component = prime({

	mixin: [Options, Emitter, bind, element, state],

	name: 'component',

	options: {
		name: 'component',
		prefix: 'ui-',

		type: null,	

		element: {
			tag: 'span',
			type: null
		},
		//bind: {}
	},

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options){
		this.setOptions(options);

		this.emit('init');

		this.init(options);
		this.build();

		if (this.options.bind) {
			this.bind(this.options.bind);
		}

		return this;
	},

	/**
	 * [init description]
	 * @return {void}
	 */
	init: function() {
		var opts = this.options;

		// this.main = opts.main || opts.name;

		// this.layout = opts.layout || {};
		// this.layout[this.main] = this.layout[this.main] || {};

		var props = this._initProps();

		
		return this;
	},

	/**
	 * [build description]
	 * @return {[type]} [description]
	 */
	build: function(props) {
		_log.debug('build');

		var opts = this.options;

		this.emit('create');

		var tag = opts.tag || opts.element.tag;
		//var name = opts.name || opts.element.name;

		var element = this.element = new Element(tag, props);
			
		element.store('_instance', this);
		element.addClass(opts.prefix + this.name);
		
		this.setState(this.options.state);

		this.setClass();

		this.emit('created');

		this.content = element;

		// inject if container options is given
		if (opts.container) {
			_log.debug('container', opts.name, opts.container);

			this.inject(opts.container);
		}
		
		return this;
	},

	/**
	 * [_initProps description]
	 * @return {Object}
	 */
	_initProps: function() {
		_log.debug('_initProps');

		var opts = this.options;
		var prop = {};
		var props = [
			'id', 'type',
			'styles',
			'html', 'title',
			'events'
		];
		//var cuts = ['name', 'tag'];

		for (var i = 0; i < props.length; i++) {
			var name = props[i];

			if (name === 'klass') {
				name = 'class';
			}

			//_log.debug('-', name, props[i]);

			if (opts[name]) {
				prop[name] = opts[name];
			}
		}

		return prop;
	},

	/**
	 * Init component class
	 * @return {[type]} [description]
	 */
	setClass: function() {
		var opts = this.options;

		var classes = ['type', 'state'];

		for (var i = 0; i < classes.length; i++) {
			var name = classes[i];
			if (opts[name]) {
				this.addClass(name+'-'+opts[name]);
			}
		}

		if (opts.element && opts.element.klass) {
			this.addClass(opts.element.klass);
		}

		if (this.options.klass) {
			this.addClass(this.options.klass);
		}

		if (this.options.clss) {
			this.addClass(this.options.clss);
		}

		if (this.options.isPrimary) {
            this.element.addClass('is-primary');
        }
	},

	/**
	 * [getName description]
	 * @return {string} name
	 */
	getName: function() {
		return this.options.name || this.name;
	},

	/**
	 * [inject description]
	 * @param  {Object} container
	 * @param  {string} position
	 * @return {Object}
	 */
	inject: function(container, position) {
		_log.debug('inject', container, position);

		this.emit('inject');

		//_log.debug('container', container);
		_log.debug('element', this.element, container);
		
		var c = container.element || container;

		this.element.inject(c, position);

		if (this.setSize) {
			this.setSize();
		}

		//this.size = this.element.getSize();
		//ui.controller.element.register(this);

		this.isInjected = true;
		this.emit('injected');

		return this;
	}

});

module.exports = Component

