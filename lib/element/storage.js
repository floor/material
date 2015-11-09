/**
 * bind module
 *
 * @class module/bind
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
