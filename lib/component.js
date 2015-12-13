'use strict';

var Emitter = require('./module/emitter');
var Controller = require('./module/controller');
var Element = require('./element');
var api = require('./component/api');
var bind = require('./module/bind');

var defaults = require('./component/options');

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

		this.emit('init');

		this.init(options);
		this.build();

		if (this.options.bind) {
			this.bind(this.options.bind);
		}

		return this;
	}

	/**
	 * Initialized component
	 * @return {Object} The class instance
	 */
	init(options) {
		this.options = [ defaults, options ].reduce(Object.assign, {});
		this.name = this.options.name;

		// merge options

		// implement object
		Object.assign(this, api);
		Object.assign(this, bind);

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
	build(props) {
		//console.log('build', this.options);

		var opts = this.options;

		this.emit('create');

		var tag = opts.tag || opts.element.tag;
		//var name = opts.name || opts.element.name;

		var element = this.element = new Element(tag, props);

		element.store('_instance', this);

		this.setState(this.options.state);

		this.initClass();

		this.emit('created');

		this.content = element;

		// inject if container options is given
		if (opts.container) {

			this.inject(opts.container);
		}

		this.controller.register(this);

		return this;
	}

	/**
	 * Init component class
	 * @return {Object} This Class instance
	 *
	 */
	initClass() {
		var opts = this.options;

		var classes = ['type', 'state'];

		this.element.addClass(opts.prefix + '-' + this.name);

		if (opts.base) {
			this.element.addClass(opts.prefix + '-' + opts.base);
		}

		if (this.options.css) {
			this.addClass(this.options.css);
		}

		for (var i = 0; i < classes.length; i++) {
			var name = classes[i];
			if (opts[name]) {
				this.addClass(name+'-'+opts[name]);
			}
		}

		if (this.options.primary) {
            this.element.addClass('is-primary');
        }
	}

	/**
	 * [inject description]
	 * @param  {Object} container
	 * @param  {string} position
	 * @return {Object} The Class instance
	 */
	inject(container, position) {

		this.emit('inject');

		var c = container.element || container;

		//this.container = container;

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

}

module.exports = Component;
