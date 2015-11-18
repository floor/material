/**
* 
* Filter View Class
*
* @class View.Filter
* @author Jerome Vial, Bruno Santos
*/

define([
	'utils/api',
	'UI/Control/Choice',
], function (
	api,
	Choice
) {

	var exports = new Class({

		/**
		 * Initialize Filter
		 *
		 * @method _initFilter
		 * @param {filters}
		 * @private
		 */
		_initFilter: function() {
			var self = this,
				opts = this.options,
				filter = opts.filter;

			var	filters = opts.filters || {};

			this.filters = [];

			this.filterControl = {};
			this.filterEnable = false;

			if (this.control.filter && !filter)
				this.control.filter.setState('disabled');

			if (!filter || !filter.list || filter.list.length < 1)
					return;

			if (!this.container.head)
				this.container._initHead();

			this.filterBar = new Element('div', {
				'class': 'head-filter',
				styles: {
					'display' : 'none'
				}
			}).inject(this.container.head, 'after');

			for (var i = 0; filter.list.length > i; i++) {
				var name = filter.list[i],
					f = filter[name];

				var values = f.text;
				values = values || f.values;

				var value = null;
				if (filters && filters[name])
					value = filters[name].keyword;

				var choice = self._initChoice(name, values, value);
				this.filterControl[name] = choice;

				choice.select(value);
			}

			//_log.debug(opts.settings);

			if (opts.filterControlState &&
				opts.filterControlState === true)
				this.toggleFilter();

			this.container.fireEvent('resize');
		},

		/**
		 * [_initChoice description]
		 * @param  {[type]} name   [description]
		 * @param  {[type]} values [description]
		 * @param  {[type]} value  [description]
		 * @return {[type]}        [description]
		 */
		_initChoice: function(name, values, value) {
			var self = this,
				opts = this.options,
				filter = opts.filter;

			var choice = new Choice({
				name: name,
				type: 'push',
				list: values,
				value: value
			}).inject(this.filterBar).addEvents({
				change: function(value) {
					//_log.debug('change', this.options.name, value);
					var name = this.options.name;
					if (value !== undefined)
						self.changeFilter({
							key: filter[name].key,
							keyword: value,
							type: filter[name].type
						});
					else self.removeFilter(filter[name].key);

					//temporary fix
					if (self.docs.length)
						self.fireEvent('toggleFilter');
				}
			});

			return choice;
		},

		/**
		 * Set Filter
		 *
		 * @method setFilter
		 * @param {filter}
		 */
		setFilter: function(filter) {
			//_log.debug('setFilter', filter);

			this.options.filter = filter;

			if (this.filterBar) {
				this.filterBar.empty();
			}

			this._initFilter(filter);
		},

		/**
		 * Change Filter
		 *
		 * @method changeFilter
		 * @param {filter}
		 */
		changeFilter: function(filter) {
			var opts = this.options;
			//_log.debug('changeFilter', filter);

			if (this.filters.indexOf(filter.key) < 0) {
				this.filters.push(filter.key);
				this.filters[filter.key] = filter;
			} else
				this.filters[filter.key] = filter;

			if (opts.filter.enableDisable === true)
				this.filterEnable = true;

			this.render(this.docs);
		},

		/**
		 * Apply Filters
		 *
		 * @method applyFilters
		 * @param {docs}
		 * @return {docs}
		 */
		applyFilters: function(docs) {
			docs = docs || this.docs;
			var filter;

			for (var i = 0, leng = this.filters.length; i < leng; i++) {
				filter = this.filters[ this.filters[i] ];
				if (filter)
					docs = this.processFilter(filter, docs);
			}

			return docs;
		},

		/**
		 * Process Filter
		 *
		 * @method processFilter
		 * @param {filter}
		 * @param {docs}
		 * @return {filterDocs}
		 */
		processFilter: function(filter, docs) {
			var filterDocs = [],
				doc, docKey;

			for (var j = 0; j < docs.length; j++) {
				doc = docs[j];
				docKey = api.deref(doc, filter.key);
				//docKey = doc[filter.key];

				if (!docKey) {
					if(filter.type == 'boolean') docKey = false;
					else continue;
				}

				var processDoc = this.processKey(filter, doc, docKey);
				if(processDoc) filterDocs.push(processDoc);
			}

			return filterDocs;
		},

		/**
		 * Process Key
		 *
		 * @method processKey
		 * @param {filter}
		 * @param {doc}
		 * @param {docKey}
		 * @return {}
		 */
		processKey: function(filter, doc, docKey) {
			var regexp = new RegExp(filter.keyword, 'g');

			switch( typeOf(docKey) ) {
				case 'boolean':
					if(docKey === filter.keyword) return doc;
					break;
				case 'array':
					if(docKey.indexOf(filter.keyword) > -1) return doc;
					break;
				default:
					if(docKey.match(regexp)) return doc;
			}

			return;
		},

		/**
		 * Remove Filter
		 *
		 * @method removeFilter
		 * @param {key}
		 */
		removeFilter: function(key) {
			var idx = this.filters.indexOf(key);

			if (idx > -1) {
				this.filters.splice(idx, 1);
				delete this.filters[key];
			}

			if (this.filters.length === 0)
				this.filterEnable = false;

			this.render(this.docs);
		},

		/**
		 * Apply Node Filter
		 *
		 * @method applyNodeFilter
		 * @param {Object}
		 */
		applyNodeFilter: function(object) {
			//_log.debug('applyNodeFilter', object);
			this.filter = object;
			this.filters.push(object);
			var  list = [];

			this.docs.each(function(doc){
				_log.debug(doc);
				if (doc[object.key])
				doc[object.key].each( function(node) {
					_log.debug(node, object.keyword);
					if (node == object.keyword)
						list.push(doc);
				});
			});

			this.render(list);

		},

		/**
		 * Toggle Filter
		 *
		 * @method toggleFilter
		 * @param {filter}
		 */
		toggleFilter: function(filter) {
			filter = filter || this.control.filter;
			var filters = this.filters;

			if (filter.isActive()) {
				this.disableFilter(filter, filters);
			} else {
				this.enableFilter(filter, filters);
			}

			this.render(this.docs);
			this.fireEvent('toggleFilter');
			this.container.fireEvent('resize');
		},

		/**
		 * disable filter
		 * @param  {Object} filter  [description]
		 * @param  {[type]} filters [description]
		 * @return {[type]}         [description]
		 */
		disableFilter: function(filter, filters) {
			var opts = this.options;
			filter.setState(null);

			if (this.filterBar)
				this.filterBar.setStyle('display', 'none');

			for (var i = 0; i < filters.length; i++) {
				if (opts.filter.enableDisable !== true)
					delete this.filters[filters[i]];
				this.filterControl[filters[i]].toggle_selected();
			}
			if (opts.filter.enableDisable !== true)
				this.filters.length = 0;

			this.filterEnable = false;

			return this;
		},

		/**
		 * disableFilter description
		 * @return {Object} This
		 */
		enableFilter: function(filter, filters) {
			var opts = this.options;
			filter.setState('active');

			if (this.filterBar)
				this.filterBar.setStyle('display', 'block');

			for (var j = 0; j < filters.length; j++)
				this.filterControl[filters[j]].toggle_selected();

			if (opts.filter.enableDisable === true)
				this.filterEnable = true;

			this.render(this.docs);

			return this;
		},

		/**
		 * [selectFilter description]
		 * @param  {[type]} key   [description]
		 * @param  {[type]} value [description]
		 * @return {[type]}       [description]
		 */
		selectFilter: function(key, value) {
			//_log.debug('selectFilter', key, value, this.filterControl);

			if (this.filterControl && this.filterControl[key])
				this.filterControl[key].select(value);
			//this.filterControl[key].setState('active');
	   }

	});

	return exports;

});

