'use strict';

let Emitter = require('./module/emitter');
let Controller = require('./module/controller');

// element related modules
let element = require('./component/element');
let events = require('./component/events');
let style = require('./component/style');
let insertion = require('./component/insertion');
let attribute = require('./component/attribute');
let storage = require('./component/storage');

// options
let defaults = require('./component/options');

/**
 * Base class for all ui components
 * @class
 * @namespace Material
 * @param {Object} options - The component options
 * @return {Object} The class Instance
 */
class Component extends Emitter {

	/**
	 * Constructor
	 * @param  {Object} options - Component options
	 * @return {Object} Class instance
	 */
	constructor(options){
		super();

		//this.emit('init');

		this.init(options);
		this.build();

		return this;
	}

	/**
	 * Initialized component
	 * @return {Object} The class instance
	 */
	init(options) {
		this.options = [ defaults, options ].reduce(Object.assign, {});
		this.name = this.constructor.name.toLowerCase();

		//console.log(this.options);

		// merge options

		// implement element methods
		Object.assign(this, 
			element,
			events,
			insertion,
			storage,
			style,
			attribute
		);

		this.document = window.document;

		if (this.options.props) {
			this._initProps(this.options.props);
		}

		this.controller = new Controller();

		return this;
	}

	/**
	 * Build Method
	 * @return {Object} This class instance
	 */
	build() {
		var opts = this.options;

		this.emit('create');

		var tag = opts.tag || 'div';
		this.element = this.createElement(tag);

		this.initAttributes();
		this.setState(this.options.state);
		this.initClass();

		this.emit('created');

		this.content = element;

		// inject if container options is given
		if (opts.container) {
			//console.log(this.name, opts.container);
			this.inject(opts.container);
		}

		this.controller.register(this);

		return this;
	}

	setOptions(options){

		console.log(this.options, options);

		Object.assign(this.options, [defaults, options].reduce(Object.assign, {}));
	}

	/**
	 * Get the name of the component
	 * @return {string} name - The name of the Class instance
	 */
	getName() {
		return this.options.name || this.name;
	}

	/**
	 * Init component class
	 * @return {Object} This Class instance
	 *
	 */
	initClass() {
		var opts = this.options;

		var classes = ['type', 'state'];

		this.addClass(opts.prefix + '-' + this.name);

		if (opts.base) {
			this.addClass(opts.prefix + '-' + opts.base);
		}

		if (this.options.class) {
			this.addClass(this.options.class);
		}

		for (var i = 0; i < classes.length; i++) {
			var name = classes[i];
			if (opts[name]) {
				this.addClass(name+'-'+opts[name]);
			}
		}

		if (this.options.primary) {
            this.addClass('is-primary');
        }
	}

	/**
	 * Set atrributes
	 * @return {Object} this
	 */
	initAttributes() {

		var opts = this.options;

		if (!opts.attr) {
			return;
		}

		var attr = opts.attr;

		for (var i = 0, len = attr.length; i < len; i++ ) {
			var name = attr[i];
			var value = opts[name];

			if (value){
				this.attribute(name, value);
			}
		}

		return this;
	}

	/**
	 * [inject description]
	 * @param  {Object} container
	 * @param  {string} position
	 * @return {Object} The Class instance
	 */
	inject(container, position) {
		this.emit('inject');

		this.container = container;

		var c = container.element || container;

		this.insert(c, position);

		this.isInjected = true;
		this.emit('injected');

		return this;
	}
}

module.exports = Component;
