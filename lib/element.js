'use strict';

let Emitter = require('./module/emitter');
let defaults = require('./element/options');
let style = require('./element/style');
let insertion = require('./element/insertion');
let dom = require('./element/dom');
let storage = require('./element/storage');
let	bind = require("./module/bind");

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

		this.init(tag, options);
		this.build();



		//console.log(this.dom[0]);

		if (this.options.bind) {
			this.bind(this.options.bind);
		}

		this.emit('ready');

		return this;
	}

	init(tag, options) {
		this.name = 'element';

		this.options = [ defaults, options ].reduce(Object.assign, {});
		this.options.tag = tag;

		Object.assign(this, bind);
		Object.assign(this, dom);
		Object.assign(this, insertion);
		Object.assign(this, storage);
		Object.assign(this, style);

		this.document = window.document;
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

		this.element = this.dom = this.create(tag);

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
	 * create dom element
	 * @param  {string} selector A simple selector string
	 * @return {HTMLElement} The dom element
	 */
	create(selector){
		var s = this._selectorFragment(selector)[0];
		let	tag = s.uTag;

		if (!tag) {
			 return null;
		}

		var element = this.document.createElement(tag);
		var	id = s.id;
		var classes = s.classes;

		if (id) {
			element.id = id;
		}
		
		if (classes) {
			element.className = classes.join(" ");
		}

		return element;
	}

	/**
	 * an array of simple selector fragment objects from the passed complex selector string
	 * @param  {string} selector The complex selector
	 * @return {Array} returns an array of simple selector fragment objects 
	 */
    _selectorFragment(selector) {
        var fragment, result = [];
        var regex = /^\s*([>+~])?\s*([*\w-]+)?(?:#([\w-]+))?(?:\.([\w.-]+))?\s*/;

        if (typeof selector === "string") {
            while (selector)
            {
                fragment = selector.match(regex);
                if (fragment[0] === "") { // matched no selector
                    break;
                }
                result.push({
                    rel: fragment[1],
                    uTag: (fragment[2] || "").toUpperCase(),
                    id: fragment[3],
                    classes: (fragment[4]) ? fragment[4].split(".") : undefined
                });
                selector = selector.substring(fragment[0].length);
            }
        }

        return result;
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
		this.attr(name, value);

		return this;
	}

	text(text) {
		return this.dom.text(text);
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
	compute(prop) {

		return moofx(this.dom).compute(prop);
	}

	/**
	 * [animate description]
	 * @return {} This class instance
	 */
	getSize() {
		var size = {
			width: parseInt(this.style('width').replace('px', '')),
			height: parseInt(this.style('height').replace('px', ''))
		};

		return size;
	}

	/**
	 * [animate description]
	 * @return {} This class instance
	 */
	getCoord() {

		var coordinate = {
			top: parseInt(this.style('top').replace('px', '')),
			left: parseInt(this.style('left').replace('px', '')),
			bottom: parseInt(this.style('bottom').replace('px', '')),
			right: parseInt(this.style('right').replace('px', ''))
		};

		return coordinate;
	}

	/**
	 * Inject method insert element to the domtree using Dom methods
	 * @param {HTMLElement} container [description]
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
		var methods = ['prepend', 'append', 'after', 'before'];

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
		this[method](container);

		this.isInjected = true;
		this.emit('injected');

		return this;
	}

	delegate(event, selector, handle){

		return;

        return this.forEach(function(node){

            var self = $(node)

            var delegation = self._delegation || (self._delegation = {}),
                events     = delegation[event] || (delegation[event] = {}),
                map        = (events[selector] || (events[selector] = new Map))

            if (map.get(handle)) return

            var action = function(e){
                var target = $(e.target || e.srcElement),
                    match  = target.matches(selector) ? target : target.parent(selector)

                var res

                if (match) res = handle.call(self, e, match)

                return res
            }

            map.set(handle, action)

            self.on(event, action)

        });
    }

	/**
	 * [destroy description]
	 * @return {Object} this class
	 */
	destroy() {
		this.element.parentNode.removeChild(this.element);

		return this;
	}
}

module.exports = Element;
