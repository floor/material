'use strict';

//date = require('./module/date'),
//string = require('./module/string'),
var SearchControl = require('../control/search');
var	$ = require('elements');

/**
 * @class
 */
class Search {

	/**
	 * Initialize Search
	 *
	 * @private
	 */
	_initSearch() {
		var search = this.control.search;

		if (!search) return;

		this.search = new SearchControl().insert(this.container.head, 'after');

		this.search.addClass('container-search');

		//this.container.fireEvent('resize');
	}

	/**
	 * [find description]
	 * @param  {string} query The value of the query
	 * @return {Object} The class instance
	 */
	find(query) {
		var self = this;

		this.saveList = this.saveList || [];

		clearTimeout(this.searchTimeout);

		if (!query && this.saveList.length) {
			self.empty();
			self.count = this.saveList.length;
			self._handleFetch(this.saveList);
			this.saveList = [];
		} else {

			if (!this.saveList.length) this.saveList = this.list.slice(0);

			this.searchTimeout = setTimeout(function(){
				var r = self.searchByKeyword(query, self.saveList);
				self.empty();
				r=r||[];
				self.count = r.length;
				if (r.length)
				self._handleFetch(r);
			}, 50);
		}

		return this;

	}

	/**
	 * Toggle Search
	 */
	toggleSearch() {
		var search = this.control.search;

		if (!search) return;

		if (search.isActive()) {
			this.hideSearch();
		} else {
			this.showSearch();
		}

		this.fireEvent('toggleSearch');

		//this.container.fireEvent('resize');
	}

	/**
	 * Hide Search
	 */
	hideSearch() {
		var search = this.control.search;

		if (!search) return;

		search.setState(null);
		this.search.empty();
		this.search.hide();
	}

	/**
	 * Show Search
	 */
	showSearch() {
		var search = this.control.search;

		if (!search) return;

		search.setState('active');
		this.search.show();
		this.search.focus();
	}

	/**
	 * Search By Keyword
	 *
	 * @param {string} keyword A string 
	 * @param {Array} infos 
	 * @return {Array}
	 */
	searchByKeyword(keyword, infos) {

		if (!keyword) return;

		var words = keyword.split(' ');

		if (!words[words.length - 1]) {
			words.pop();
		}

		for (var i = 0; i < words.length; i++) {
			words[i] = string.removeAccents(words[i]);
		}

		return this.searchKeys(words, infos);
	}

	/**
	 * Search Keys
	 *
	 * @param {Array} words
	 * @param {Array} infos
	 * @return {Array} Result
	 */
	searchKeys(words, infos) {

		var searchKeys = this.options.search.keys;
		var result = [];

		this.options.dates = this.options.dates || [];

		for (var i = 0, len = infos.length; i < len; i++) {
			var value = '';
			var info = infos[i];

			for (var j = 0; j < searchKeys.length; j++) {
				var key = searchKeys[j];

				if (this.options.dates.indexOf(key) !== -1 && info[key]) {
					value += ' ' + date.toText(info[key]);
				} else {
					var keys = key.split(/\./);
					var v = '';

					if (keys.length === 1)
						v = info[keys[0]];
					if (keys.length === 2)
						if (info[keys[0]])
						v = info[keys[0]][keys[1]];

					value += ' ' + v;
				}
			}

			value = string.removeAccents(value);
			var r = this.searchValue(value, words, info);
			if (r) result.push(r);
		}

		return result;
	}

	/**
	 * Search Value
	 *
	 * @param {value} value the Search value
	 * @param {string} words The words
	 */
	searchValue(value, words, info) {
		var operator = this.options.operator || 'AND';

		for (var i = 0; i < words.length; i++) {
			if (operator === 'AND' && value.indexOf(words[i]) === -1)
				return;
			else if (operator === 'OR' && value.indexOf(words[i]) !== - 1) {
				return info;
			}
		}

		if (operator === 'AND') {
			return info;
		}
	}
}

module.exports = Search;
