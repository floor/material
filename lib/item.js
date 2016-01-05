'use strict';

import Component from './component';

var defaults = {
	name: 'item',

	node: null,
	component: ['name'],
	element: {
		tag: 'div'
	}
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
	 * [focus description]
	 * @return {void}
	 */
	set(value) {
		this.element.innerHTML(value);

		return this;
	}
}

module.exports = Item;
