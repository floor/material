

'use strict';

var prime = require('prime/index');
var	Options = require('prime-util/prime/options');
var	Emitter = require('prime/emitter');
var	Element = require('./element');
var	element = require('./component/element');
var	state = require('./component/state');
var	binding = require('./module/binding');
var	$ = require('elements');
var	zen = require('elements/zen');
var	__debug = require('./module/debug');


var	_log = __debug('material:component');
//	_log.defineLevel('DEBUG');

/**
 * Base Class for all Components
 * @class
 * @param {Object} options - The component options
 * @return {Instance} this - Class Instance
 */
var Component = prime({

	mixin: [Options, Emitter, binding, element, state],

	name: 'component',

	/**
	 * Options
	 * @type {Object}
	 */
	options: {
		name: 'component',
		prefix: 'ui-',

		type: null,	

		element: {
			tag: 'span',
			type: null
		},
		//binding: {}
	},

	/**
	 * Constructor
	 * @param  {Object} options - Component options
	 * @return {Object} this - Class instance
	 */
	constructor: function(options){
		this.setOptions(options);

		this.emit('init');

		this.init(options);
		this.build();

		if (this.options.binding) {
			this.bindall(this.options.binding);
		}

		return this;
	},

	/**
	 * Initialized component
	 * @return {Object} this - Class instance
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
	 * Build Method
	 * @return {Object} this - This class instance
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
	 * Initilized properties
	 * @return {Object} this - This class instance
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
	 * @return {Object} this - This Class instance
	 *
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
	 * Get the name of the component
	 * @return {string} name - The name of the Class instance
	 */
	getName: function() {
		return this.options.name || this.name;
	},

	/**
	 * [inject description]
	 * @param  {Object} container
	 * @param  {string} position
	 * @return {Object} this - The Class instance
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

