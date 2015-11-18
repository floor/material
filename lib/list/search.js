
/**
* Search List Class
*
* @class list.search
* @extends {View}
* @author Jerome Vial
*/"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	//date = require('./module/date'),
	//string = require('./module/string'),
	SearchControl = require('../control/search'),
	$ = require("elements");

	var _log = __debug('list:search');

	/*
	*
	* Class View.Search
	* The Three View is a wrapper for threejs
	*
	* @class View.Search
	* @extends {View}
	* @author Jerome Vial
	*/

//_log.debug(View);
var search = new prime({

	/**
	 * Initialize Search
	 *
	 * @method _initSearch
	 * @private
	 */
	_initSearch: function() {
		//_log.debug('_initSearch');
		var search = this.control.search;

		if (!search) return;

		this.search = new SearchControl().inject(this.container.head, 'after');

		this.search.addClass('container-search');

		//this.container.fireEvent('resize');
	},

	/**
	 * [find description]
	 * @param  {[type]} value [description]
	 * @return {[type]}       [description]
	 */
	find: function(value) {
		//_log.debug('find', value);
		var self = this;

		this.saveList = this.saveList || [];

		clearTimeout(this.searchTimeout);

		if (!value && this.saveList.length) {
			self.empty();
			self.count = this.saveList.length;
			self._handleFetch(this.saveList);
			this.saveList = [];
		} else {

			if (!this.saveList.length) this.saveList = this.list.slice(0);

			this.searchTimeout = setTimeout(function(){
				var r = self.searchByKeyword(value, self.saveList);
				self.empty();
				r=r||[];
				self.count = r.length;
				if (r.length)
				self._handleFetch(r);
				//_log.debug('---------', r);
			}, 50);
		}

	},

	/**
	 * Toggle Search
	 *
	 * @method toggleSearch
	 */
	toggleSearch: function() {
		var search = this.control.search;
		_log.debug('toggleSearch', search);

		if (!search) return;

		if (search.isActive()) {
			this.hideSearch();
		} else {
			this.showSearch();
		}

		this.fireEvent('toggleSearch');

		//this.container.fireEvent('resize');
	},

	/**
	 * Hide Search
	 *
	 * @method hideSearch
	 */
	hideSearch: function() {
		var search = this.control.search;

		if (!search) return;

		search.setState(null);
		this.search.empty();
		this.search.hide();
	},

	/**
	 * Show Search
	 *
	 * @method showSearch
	 */
	showSearch: function() {
		var search = this.control.search;

		if (!search) return;

		search.setState('active');
		this.search.show();
		this.search.focus();
	},

	/**
	 * Search By Keyword
	 *
	 * @method searchByKeyword
	 * @param {keyword}
	 * @param {infos}
	 * @return {infos}
	 */
	searchByKeyword: function(keyword, infos) {
		_log.debug('searchByKeyword');

		if (!keyword) return;

		var words = keyword.split(' ');

		if (!words[words.length - 1]) {
			words.pop();
		}

		for (var i = 0; i < words.length; i++) {
			words[i] = string.removeAccents(words[i]);
		}

		return this.searchKeys(words, infos);
	},

	/**
	 * Search Keys
	 *
	 * @method searchKeys
	 * @param {words}
	 * @param {infos}
	 * @return {infos}
	 */
	searchKeys: function(words, infos) {

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
	},

	/**
	 * Search Value
	 *
	 * @method searchValue
	 * @param {value}
	 * @param {words}
	 * @param {info}
	 */
	searchValue: function(value, words, info) {
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
});

module.exports = search;

