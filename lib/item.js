'use strict';

var Component = require('./component');
var bind = require('./module/bind');

var defaults = {
	name: 'item',

	node: null,
	component: ['name'],
	element: {
		tag: 'div'
	},
	bind: {}
};

/**
 * The item class is used for example as item list
 *
 * @class
 * @extends {Component}
 * @return {Object} The class instance
 * @example new Item(object);
 */
class Item extends Component {
	
	/**
	 * init
	 * @return {Object} The class options
	 */
	init(options){
		super.init(options);

		options = options || this.options;

		var component = options.component;

		if (component)
			this._initComponent(component);

		this.c.name.element.text(this.options.info.name);

		return this;
	}

	/**
	 * Build function for item
	 * @return {Object} This class instance
	 */
	build(options) {
		super.build();

		return this;
	}

	/**
	 * Initialize internal container components
	 * @param  {Mixin} component Component
	 * @return {void}
	 */
	_initComponent(component) {

		this.component = this.c = {};
		this.components = [];

		if (typeof component === 'string') {
			this.add(component);
		} else {
			for (var i = 0; i < component.length; i++) {
				this.add(component[i]);
			};
		}
	}

	/**
	 * [_initComp description]
	 * @param  {string} name
	 * @param  {string} position
	 * @param  {DOMElement} element
	 * @return {DOMElement|void}
	 */
	add(name, position, element) {

		position = position || 'bottom';
		element = element || this.element;

		if (!element) {
			return;
		}

		this.component[name] = new Component()
			.addClass(this.name + '-' + name)
			.inject(element);

		return this.component[name];
	}

	/**
	 * _initClass container related class
	 * @return {void}
	 */
	_initClass() {
		Item.parent._initClass.call(this);

		this.addClass('ui-container');

		return this;
	}

	/**
	 * [focus description]
	 * @return {void}
	 */
	focus() {
		this.setState('focus');

		return this;
	}
}

module.exports = Item;
