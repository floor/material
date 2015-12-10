'use strict';

let Emitter = require('./module/emitter');

let defaults = require('./element/options');
let storage = require('./element/storage');
let	bind = require("./module/bind");

var	$ = require("elements");
var zen = require('elements/zen');
var moofx = require('moofx');

/**
 * Creates an Element
 * @class
 */
class Element extends Emitter {
	
	/**
	 * Constructor
	 * @param  {string} tag - The element tag
	 * @param  {Object} options - The element options
	 * @return {Object} The class instance
	 */
	constructor(tag, options){
		super();

		this.name = 'element';

		this.options = [ defaults, options ].reduce(Object.assign, {});
		this.options.tag = tag;

		Object.assign(this, bind);
		Object.assign(this, storage);

		this.build();

		//console.log(this.dom[0]);

		if (this.options.bind) {
			//console.log('binding', binding, this.options.binding);
			this.bind(this.options.bind);
		}

		this.emit('ready');

		return this;
	}

	/**
	 * function click - for testing purpose
	 * @return {event} Click event
	 */
	click(ev) {
		console.log('_click', ev);

		return ev;
	}


	/**
	 * Build domNode
	 * @return {Object} this
	 */
	build() {
		this.emit('create');

		var tag = this.options.tag;
		//var name = opts.name || opts.element.name;

		var dom = zen(tag);

		this.dom = dom;

		// if (this.dom instanceof HTMLElement) {
		// 	console.log('dom is an Element', this.dom);
		// };

		this.attributes(this.options.attr);

		var container = this.options.container;
		var context = this.options.context;

		if (container) {
			this.inject(container, context);
		}

		this.emit('created');

		return this;
	}

	/**
	 * Main setter
	 * @param {string} prop - Property to set
	 * @param {Object} value - Value to set
	 * @return {Object} This class instance
	 */
	set(prop, value) {

		switch(prop) {
			case 'attribute':
				this.attributes(value);
				break;
			case 'text':
				this.text(value);
				break;
			default:
				this.setValue(value);

		}

		return this;
	}

	/**
	 * Set atrributes
	 * @return {Object} this
	 */
	attributes(attr) {
		var opts = this.options;

		if (!opts.attr) {
			return;
		}

		var attr = opts.attr;

		for (var i = 0, len = attr.length; i < len; i++ ) {
			var name = attr[i];
			var value = opts[name];

			if (name === 'klass'){
				name = 'class';
			}

			if (value){
				this.attribute(name, value);
			}
		}

		return this;
	}

	/**
	 * Gets or sets an attribute or property. 
	 * Returns the value of the attribute If only the name parameter is passed, 
	 * otherwise returns the current elements instance.
	 * @param {string} name  The name of the attribute or property
	 * @param {string} value  If the value parameter is set, this method will act like a setter and will set the value to all elements in the collection. 
	 * If this parameter is omitted, it will act as a getter on the first element in the collection.
	 * @return {Object} this
	 */
	attribute(name, value) {
		$(this.dom).attribute(name, value);

		return this;
	}

	/**
	 * addClass
	 * @param  {string} className [description]
	 * @return {Object} This class instance
	 */
	addClass(className) {
		$(this.dom).addClass(className);

		return this;
	}

	/**
	 * remove class
	 * @param  {string} className The name of the class to remove
	 * @return {instance} Class instance
	 */
	hasClass(className){
		return $(this.dom).hasClass(className);
	}

	/**
	 * removeClass
	 * @param {string} className - This css class
	 * @return {Object} This class instance
	 */
	removeClass(className) {
		$(this.dom).removeClass(className);

		return this;
	}

	text(text) {
		return $(this.dom).text(text);
	}

	/**
	 * [animate description]
	 * @return {} This class instance
	 */
	animate() {
		var moo = moofx(this.dom);
    	moo.animate.apply(moo, arguments);
    	return this;
	}

	/**
	 * [animate description]
	 * @return {} This class instance
	 */
	style() {
		var moo = moofx(this.dom);
    	moo.style.apply(moo, arguments);
    	return this;
	}

	/**
	 * [animate description]
	 * @return {} This class instance
	 */
	compute(prop) {
		
		return moofx(this.dom).compute(prop);
	}

	/**
	 * Inject method insert element to the domtree using Dom methods
	 * @param  {Instance} container [description]
	 * @param  {string} context - Injection context
	 * @return {Object} This class intance
	 */
	inject(container, context) {
		if (container && container.dom) {
			container = container.dom;
		} else if (container instanceof HTMLElement) {
			//console.log('container', container);
		} else {
			//console.log('container mismatch');
			return;
		}

		context = context || 'bottom';

		var contexts = ['top', 'bottom', 'after', 'before'];
		var methods = ['top', 'bottom', 'after', 'before'];

		var index = contexts.indexOf(context);
		if (index === -1) {
			return;
		}

		var method = methods[index];

		// if element is a component use its element instead
		// if (element instanceof Element)
		// 	element = element.element;

		this.emit('inject');

		// insert component element to the dom tree using Dom
		$(this.dom)[method](container);

		this.isInjected = true;
		this.emit('injected');

		return this;
	}

	/**
	 * [delegate description]
	 * @param  {string}	type	event
	 * @param  {string} selector [description]
	 * @param  {Function} fn       [description]
	 * @return {Object}	this
	 */
	delegate(type, selector, fn) {
		$(this.dom).delegate(type, selector, fn);

		return this;
	}

	/**
	 * [destroy description]
	 * @return {Object} this class
	 */
	destroy() {
		this.dom[0].parentNode.removeChild(this.dom[0]);

		return this;
	}
}

module.exports = Element;

