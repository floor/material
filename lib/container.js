'use strict';

var	Component = require('./component');
//var Emitter = require("./module/emitter");
var	bind = require('./module/bind');
var display = require('./container/display');

var defaults = require('./container/options');

/**
 * The Container class inherits from Component and receive the ability to add inner components
 *
 * @class
 * @augments Component
 * @return {parent} The class instance
 * @example new Container({
 *   container: document.body
 * });
 */
class Container extends Component {

	/**
	 * Init class
	 * @return {Object} This class  instance
	 */
	init(options){
		super.init(options);
		this.name = 'container';

		// merge options
		this.options = [ defaults, options ].reduce(Object.assign, {});

		Object.assign(this, display);

		return this;
	}

	/**
	 * [build description]
	 * @return {Object} This class  instance
	 */
	build(props) {
		super.build(props);

		var component = this.options.component;

		if (component) {
			this._initComponent(component);
		}

		return this;
	}

	/**
	 * Initialize internal container components
	 * @param  {Mixin} component Compenent description
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
			}
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
}

module.exports = Container;
