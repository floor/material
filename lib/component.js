'use strict';

var	Emitter = require('./module/emitter');
var	Controller = require('./module/controller');
var	Element = require('./element');
var	api = require('./component/api');
var	bind = require('./module/bind');

var defaults = require('./component/options');

/**
 * Base Class for all ui components
 * @class
 * @param {Object} options - The component options
 * @return {Instance} this - Class Instance
 */
class Component extends Emitter {

	/**
	 * Constructor
	 * @param  {Object} options - Component options
	 * @return {Object} this - Class instance
	 */
	constructor(options){
		super();

		this.emit('init');

		this.init(options);
		this.build();
		this.bind();

		if (this.options.bind) {
			this.bind(this.options.bind);
		}

		return this;
	}

	/**
	 * Initialized component
	 * @return {Object} this - Class instance
	 */
	init(options) {

		this.name = 'component';

		this.controller = new Controller();

		this.options = [ defaults, options ].reduce(Object.assign, {});
		// merge options

		// implement object
		Object.assign(this, api);
		Object.assign(this, bind);
		
		if (this.options.props) {
			this._initProps(this.options.props);
		}

		return this;
	}

	/**
	 * Build Method
	 * @return {Object} this - This class instance
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
	 * @return {Object} this - This Class instance
	 *
	 */
	initClass() {
		var opts = this.options;

		var classes = ['type', 'state'];

		for (var i = 0; i < classes.length; i++) {
			var name = classes[i];
			if (opts[name]) {
				this.addClass(name+'-'+opts[name]);
			}
		}

		this.element.addClass(opts.prefix + '-' + this.name);

		if (opts.base) {
			this.element.addClass(opts.prefix + '-' + opts.base);
		}

		if (opts.element && opts.element.klass) {
			this.addClass(opts.element.klass);
		}

		if (this.options.klass) {
			this.addClass(this.options.klass);
		}

		if (this.options.isPrimary) {
            this.element.addClass('is-primary');
        }
	}

	/**
	 * [inject description]
	 * @param  {Object} container
	 * @param  {string} position
	 * @return {Object} this - The Class instance
	 */
	inject(container, position) {

		this.emit('inject');
		
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

}

module.exports = Component;
