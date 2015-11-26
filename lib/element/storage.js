
/**
 * storage element class
 *
 * @class module/storage
 */
"use strict"

var prime = require("prime/index");

var storage = prime({
	/**
	 * [store description]
	 * @param  {[type]} key   [description]
	 * @param  {[type]} value [description]
	 * @return {[type]}       [description]
	 */
	store: function(key, value) {
		this.storage = this.storage || {};

		this.storage[key] = value;

		return this;
	},

	/**
	 * [retrieve description]
	 * @param  {[type]} key   [description]
	 * @param  {[type]} value [description]
	 * @return {[type]}       [description]
	 */
	retrieve: function(key, value) {
		this.storage = this.storage || {};

		return this.storage[key];
	}
});

module.exports = storage;
