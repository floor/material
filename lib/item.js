
/**
 * Item class
 * Manage inner components
 *
 * @class Item
 * @extends {Component}
 * @return {parent} prime object
 * @example (start code)	new Item(object); (end)
 * @author [moolego,r2d2]
 * @copyright © 1999-2015 - Jerome D. Vial. All Rights reserved.
 */"use strict"

var prime = require("prime/index"),
	Component = require('./component'),

	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
    binding = require('./module/binding'),
	merge = require("deepmerge");
	

var	_log = __debug('material:container');
//	_log.defineLevel('DEBUG');

var Item = prime({

	inherits: Component,

	mixin: [Options, Emitter],

	name: 'item',

	options: {
		name: 'item',

		node: null,
		component: ['name'],
		element: {
			tag: 'div'
		},
		
		binding: {}
	},

	/**
	 * [initialize description]
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options) {
		this.options = merge(Item.parent.options, this.options);	
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
		Item.parent.init.call(this);

		return this;
	},

	/**
	 * [build description]
	 * @return {[type]} [description]
	 */
	build: function(options) {
		_log.debug('build');
		Item.parent.build.call(this);

		options = options || this.options;

		var component = options.component;

		if (component)
			this._initComponent(component);

		this.c.name.element.text(this.options.info.name);

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
			_log.warn('Item is ', element);
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
		Item.parent._initClass.call(this);

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

module.exports = Item;
