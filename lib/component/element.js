'use strict';

import morpheus from 'morpheus';
import insertion from '../module/insertion';

/**
 * Element related methods
 * @module component/element
 */
module.exports = {

	/**
	 * create dom element
	 * @param  {string} string A simple selector string
	 * @return {HTMLElement} The dom element
	 */
	createElement(string){
		var s = this._selectorFragment(string)[0];
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
	},

	/**
	 * an array of simple selector fragment objects from the passed complex selector string
	 * @param  {string} selector The complex selector
	 * @return {Array} returns an array of simple selector fragment objects 
	 */
    _selectorFragment(selector) {
        var fragment;
        var result = [];
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
    },

	/**
	 * Inject method insert element to the domtree using Dom methods
	 * @param {HTMLElement} container [description]
	 * @param  {string} context - Injection context
	 * @return {Object} This class intance
	 */
	insert(container, context) {
		this.emit('insert');

		this.container = container;

		if (container && container.element) {
			container = container.element;
		} else if (container instanceof HTMLElement) {
			container = container;
		} else {
			throw new Error("Can't insert " + container + " is not a HTMLElement object");
		}

		context = context || 'bottom';

		var contexts = ['top', 'bottom', 'after', 'before'];
		var methods = ['prepend', 'append', 'after', 'before'];

		var index = contexts.indexOf(context);
		if (index === -1) {
			return;
		}

		var method = methods[index];

		this.emit('insert');

		// insert component element to the dom tree using Dom
		insertion[method](container, this.element);

		this.isInjected = true;
		this.emit('injected');

		return this;
	},

	/**
	 * [animate description]
	 * @return {} This class instance
	 */
	animate(prop, options, callback) {

		var opts = Object.assign(prop, options);
		
		//console.log('animate', options);
		if (callback)
			options.complete = callback;

		var animation = morpheus(this.element, opts);
		//this.style(style);

		return animation;
	},

	/**
	 * [show description]
	 * @return {Object} The class instance
	 */
	show(){
		this.emit('show');
		this.element.show();

		return this;
	},

	/**
	 * [hide description]
	 * @return {Object} The class instance
	 */
	hide(){
		this.emit('hide');
		this.element.hide();

		return this;
	},

	/**
	 * [dispose description]
	 * @return {Object} The class instance
	 */
	dispose(){
		var el = this.element;
		return (el.parentNode) ? el.parentNode.removeChild(el) : el;
	},

    /**
     * empty
     * @return {void}
     */
    empty() {
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
    },

	/**
	 * [destroy description]
	 * @return {Object} this class
	 */
	destroy() {
		this.element.parentNode.removeChild(this.element);

		return this;
	}
};
