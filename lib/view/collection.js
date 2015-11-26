
/**
 * View Collection Class
 *
 * @class View.Collection
 * @author Jerome Vial
 */
'use strict'

var prime = require("prime/index"),
	Field = require('./field'),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	binding = require('../module/binding'),
	merge = require("deepmerge");

var	_log = __debug('material:button');
	_log.defineLevel('DEBUG');

var Collection = new prime({

	/**
	 * [_initCollection description]
	 * @return {[type]} [description]
	 */
	_initCollection: function() {
		//_log.debug('_initCollection', this.options.name, this.options.params);
		var self = this;

		this.collection = new Collection({
			params: this.options.params
		}).on({
			ready: function(list) {
				if (!list) return;
				//_log.debug('collection ready', list, self.options.reverse);
				if (self.options.reverse)
					list.reverse();

				self.emit('setList');

	
				self.update(list);
			},
			loading: function(progress) {
				self.setStatus('Loading ' + progress);
			}
		});

		this.listReady = true;
		this.emit('listReady');
	}
});

module.exports = Collection;

