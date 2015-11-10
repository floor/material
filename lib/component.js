
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
	element = require('./component/element'),
	bind = require('./module/bind'),
	$ = require('elements'),
	zen = require('elements/zen'),
	__debug = require('./module/debug');


var	_log = __debug('material:component');
//	_log.defineLevel('DEBUG');

var Component = prime({

	mixin: [Options, Emitter, bind, element],

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

		this._initOptions();
		this._initElement();

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

		//console.log('props', opts.name, props);

		var element = new Element(tag, props);
		
		element.store('_instance', this);

		this.emit('created');

		this.element = element;
		this.content = element;

		this._initState();
		this._initClass();

		// inject if container options is given
		if (opts.container) {
			_log.debug('container', opts.name, opts.container);

			this.inject(opts.container);
		}
		
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

