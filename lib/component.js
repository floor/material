'use strict';

var	Emitter = require('./module/emitter');

var	Element = require('./element');
var	api = require('./component/api');
var	bind = require('./module/bind');

var defaults = require('./component/options');

var	__debug = require('./module/debug');
var	_log = __debug('material:component');
//	_log.defineLevel('DEBUG');

/**
 * Base Class for all Components
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

		this.name = 'container';

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
	}

	/**
	 * Initilized properties
	 * @return {Object} this - This class instance
	 */
	_initProps() {
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
	}

	/**
	 * Setter for the state of the component
	 * @param {string} state active/disable etc...
	 */
	setState(state){
		if (this.state) {
			this.removeClass('state-'+this.state);
		}

		if (state) {
			this.addClass('state-'+state);
		}

		this.state = state;
		this.emit('state', state);

		return this;
	}

	/**
	 * Init component class
	 * @return {Object} this - This Class instance
	 *
	 */
	setClass() {
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
	}

	/**
	 * Get the name of the component
	 * @return {string} name - The name of the Class instance
	 */
	getName() {
		return this.options.name || this.name;
	}

	/**
	 * [inject description]
	 * @param  {Object} container
	 * @param  {string} position
	 * @return {Object} this - The Class instance
	 */
	inject(container, position) {
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

}

module.exports = Component;
