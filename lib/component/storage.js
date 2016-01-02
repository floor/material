'use strict';

/**
 * Element storage related methods
 * @module component/storage
 */
module.exports = {
	/**
	 * [store description]
	 * @param  {string} key   [description]
	 * @param  {value} value [description]
	 * @return {Object} The class instance
	 */
	store(key, value) {
		this.storage = this.storage || {};

		this.storage[key] = value;

		return this;
	},

	/**
	 * [retrieve description]
	 * @param  {string} key The key
	 * @return {Object} The value or the requested key
	 */
	retrieve(key) {
		this.storage = this.storage || {};

		return this.storage[key];
	}
};
