
/**
 * Container class
 * Manage inner components
 *
 * @class Container
 * @extends {Component}
 * @return {parent} prime object
 * @example (start code)	new Container(object); (end)
 * @author [moolego,r2d2]
 * @copyright © 1999-2015 - Jerome D. Vial. All Rights reserved.
 */"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
    bind = require('./module/bind'),
	merge = require("deepmerge"),
	$ = require("elements"),
	Component = require('./component'),
	display = require('./container/display');

var	_log = __debug('material:container');
//	_log.defineLevel('DEBUG');

var Container = prime({

	inherits: Component,

	mixin: [Options, Emitter, display],

	name: 'container',

	options: {
		name: 'container',

		node: null,
		component: ['body'],
		element: {
			tag: 'div'
		},
		
		bind: {}
	},

	/**
	 * [initialize description]
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options) {
		this.options = merge(Container.parent.options, this.options);	
		this.setOptions(options);

		this.init();
		this.build();

		return this;
	},
	
	/**
	 * [init description]
	 * @return {[type]} [description]
	 */
	init: function(){
		Container.parent.init.call(this);

		return this;
	},

	/**
	 * [build description]
	 * @return {[type]} [description]
	 */
	build: function(options) {
		_log.debug('build');
		Container.parent.build.call(this);

		options = options || this.options;

		var component = this.options.component;

		if (component)
			this._initComponent(component);

		return this;
	},

	/**
	 * Initialize internal container components
	 * @param  {Mixin} comp Compenent description
	 * @return {void}
	 */
	_initComponent: function(component) {
		_log.debug('_initComponent', component);
		var self = this;

		this.component = this.c = {};
		this.components = [];

		if (typeof component === 'string') {
			this.add(component);
		} else  {
			for (var i = 0; i < component.length; i++) {
				this.add(component[i]);
			};
		}
	},

	/**
	 * [_initComp description]
	 * @param  {string} name
	 * @param  {string} position
	 * @param  {DOMElement} element
	 * @return {DOMElement|void}
	 */
	add: function(name, position, element) {
		_log.debug('add', name, position, element);

		position = position || 'bottom';
		element = element || this.element;

		if (!element) {
			_log.warn('Container is ', element);
			return;
		}

		this.component[name] = new Component()
			.addClass(this.name + '-' + name)
			.inject(element);

		return this.component[name];
	},

	/**
	 * _initClass container related class
	 * @return {void}
	 */
	_initClass: function() {
		Container.parent._initClass.call(this);

		this.element.addClass('ui-container');

		return this;
	},

	/**
	 * [focus description]
	 * @return {void}
	 */
	focus: function() {
		this.setState('focus');

		return this;
	}
});

module.exports = Container;
