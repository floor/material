
/**
 * Component class
 *
 * @class component
 */
"use strict";

var prime = require('prime/index'),
	Options = require('prime-util/prime/options'),
	Emitter = require('prime/emitter'),
	Element = require('./element'),
	bind = require('./module/bind'),
	method = require('./component/method'),
	$ = require('elements'),
	zen = require('elements/zen'),
	__debug = require('./module/debug');


var	_log = __debug('material:component');
//	_log.defineLevel('DEBUG');

var Component = prime({

	mixin: [Options, Emitter, bind, method],
	
	name: 'component',

	component: 'component',

	options: {
		lib: 'ui',
		prefix: 'ui-',

		component: 'component',
		name: 'component',
		type: null,	
		element: {
			attr: ['accesskey', 'class', 'contenteditable', 'contextmenu',
			'dir', 'draggable', 'dropzone', 'hidden', 'id', 'lang',
			'spellcheck', 'style', 'tabindex', 'title', 'translate'],
			tag: 'span',
			type: null
		}
	},

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options){
		this.setOptions(options);

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
	 * [_initElement description]
	 * @return {[type]} [description]
	 */
	_initElement: function() {
		_log.debug('_initElement');

		var opts = this.options;

		this.emit('create');

		var tag = opts.tag || opts.element.tag;
		//var name = opts.name || opts.element.name;

		var props = this._initProps();

		var element = new Element(tag, props);
		
		//element.store('_instance', this);

		this.element = element;
		this.content = element;

		this.emit('created');

		if (opts.container && opts.container !== 'window') {
			_log.debug('_initElement', opts.name, opts.container);
			this.element.inject(opts.container);
			this.emit('injected');
		}

		this._initState();
		this._initClass();

		return element;
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
			'id', 'name', 'type',
			'klass', 'styles',
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

			if (opts.element && opts.element.attr[name]) {
				prop[name] = opts.element.attr[props[i]];
			}
		}

		return prop;
	},

	/**
	 * Init component class
	 * @return {[type]} [description]
	 */
	_initClass: function() {
		var opts = this.options;

		//this.element.addClass(opts.prefix + opts.name);

		if (opts.klass) {
			this.element.addClass(opts.klass);
		}

		if (opts.element && opts.element.klass) {
			this.addClass(opts.element.klass);
		}

		if (opts.type) {
			this.addClass('type-' + opts.type);
		}

		if (opts.state) {
			this.addClass('state-' + opts.state);
		}

		this.element.addClass(opts.prefix + this.name);

		if (this.options.clss) {
			this.element.addClass(this.options.clss);
		}
	},

	/**
	 * [_initState description]
	 * @return {void}
	 */
	_initState: function() {
		this.setState(this.options.state);
	},

	/**
	 * [getName description]
	 * @return {string} name
	 */
	getName: function() {
		return this.options.name || this.name;
	},


	/**
	 * [_initOptions description]
	 * @return {void}
	 */
	_initOptions: function() {
		var opts = this.options;
		//this.name = this.options.name;
		this.main = opts.main || opts.name;

		//ui.node = ui.node || {};
		//ui.node[this.main] = ui.node[this.main] || {};

		this.layout = opts.layout || {};
		this.layout[this.main] = this.layout[this.main] || {};

		this.dragHandlers = opts.dragHandlers || [];
	},

	// /**
	//  * [addComponent description]
	//  * @param {Object} node
	//  */
	// addComponent: function(node) {
	// 	_log.debug('addComponent', node);
	// 	if (!node.component) {
	// 		node.component = 'container';
	// 	}

	// 	node.container = this.element;
	// 	node.main = this.main;

	// 	//_log.debug(node);

	// 	var container = new UI[node.component.capitalize()](node);

	// 	this.addEvent('resize', function() {
	// 		container.fireEvent('resize');
	// 	});

	// 	this.node.push(container);
	// 	this.layout[this.main][container.name] = container;
	// 	//ui.node[this.main][node.name] = container;
	// },

	/**
	 * Setter for the state of the component
	 * @param {String} state active/disable etc...
	 */
	setState: function(state){
		if (this.state)
			this.removeClass('state-'+this.state);

		if (state)
			this.addClass('state-'+state);

		this.state = state;
		this.emit('state', state);

		return this;
	},

	/**
	 * [_initClass description]
	 * @return {[type]} [description]
	 */
	addClass: function(klass) {
		_log.debug('addClass');

		this.element.addClass(klass);

		return this;
	},

	/**
	 * [_initClass description]
	 * @return {[type]} [description]
	 */
	removeClass: function(klass) {
		_log.debug('removeClass');

		this.element.removeClass(klass);

		return this;
	},

	/**
	 * [_initEvents description]
	 * @return {void}
	 */
	_initEvents: function() {
		//_log.debug('_initEvents');
		var self = this,
			opts = this.options;

		// for retro compatibilty
		this.on('injected', function() {
			if (opts.resizable && self._initResizer) {
				self._initResizer();
			}
		});

		// this will be handled by the binding
		this.on('device', function(device) {
			//_log.debug('device', device);
			self.device = device;
		});


		if (this.options.draggable && this.enableDrag) {
			this.enableDrag();
		}
	},

	/**
	 * set content of the element
	 * @param {string} content [description]
	 */
	setContent: function(content) {
		this.content.set('html', content);

		this.fireEvent('resize');

		return this;
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

