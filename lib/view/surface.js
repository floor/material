
/**
* surface view module
*
* source: https://github.com/sergi/virtual-list/blob/master/vlist.js
* @class View.Surface
* @extends {View}
* @author Jerome Vial
*/

'use strict'

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	binding = require('../module/binding');

var	_log = __debug('material:view-surface');
	_log.defineLevel('DEBUG');

var surface = new prime({

	mixin: [Options, Emitter],

	options: {},

	/**
	 * [initialize description]
	 * @param  {[type]} options [description]
	 * @return {[type]}         [description]
	 */
	initialize: function(options) {
		//_log.debug('virtual initialize', options);

		this.generatorFn = options.generatorFn;
		delete this.options.generatorFn;

		this.container = options.container;
		delete this.options.container;

		this.setOptions(options);


		var width = (this.options && this.options.w + 'px') || '100%';
		var height = (this.options && this.options.h + 'px') || '100%';
		var itemHeight = this.itemHeight = this.options.itemHeight;

		
		this.items = this.options.items;

		this.totalRows = this.options.totalRows || (this.options.items && this.options.items.length);

		this.scroller = this.createScroller(itemHeight * this.totalRows);

		this.container.appendChild(this.scroller);

		this.screenItemsLen = Math.ceil(this.options.h / itemHeight);
		// Cache 4 times the number of items that fit in the container viewport
		this.cachedItemsLen = this.screenItemsLen * 3;
		this._renderChunk(this.container, 0);

		var self = this;
		this.lastRepaintY;
		this.maxBuffer = this.screenItemsLen * itemHeight;
		this.lastScrolled = 0;

		// As soon as scrolling has stopped, this interval asynchronouslyremoves all
		// the nodes that are not used anymore
		function onScroll(e) {
			self._onScroll(e);

			clearTimeout(self.scrollTimeout);
			self.scrollTimeout = setTimeout(function() {
				//_log.debug('remove obsolete');
				self.removeObsoletes();
			}, 100);
		}

		this.container.addEventListener('scroll', onScroll);
	},

	/**
	 * [_onScroll description]
	 * @return {[type]} [description]
	 */
	_onScroll: function(e) {
		//_log.debug('onScroll', e.target.scrollTop);
		var scrollTop = e.target.scrollTop; // Triggers reflow

		// _log.debug(this.lastRepaintY, scrollTop, this.lastRepaintY);
		// _log.debug(Math.abs(scrollTop - this.lastRepaintY), this.maxBuffer);

		if (!this.lastRepaintY || Math.abs(scrollTop - this.lastRepaintY) > this.maxBuffer) {
		  var first = parseInt(scrollTop / this.itemHeight) - this.screenItemsLen;

		 // _log.debug('first', first);

		  this._renderChunk(this.container, first < 0 ? 0 : first);
		  this.lastRepaintY = scrollTop;
		}

		//this.lastScrolled = Date.now();
		e.preventDefault && e.preventDefault();
	},

	/**
	 * [removeObsoletes description]
	 * @return {[type]} [description]
	 */
	removeObsoletes: function() {
		if (Date.now() - this.lastScrolled > 100) {
			var obsoletes = this.container.querySelectorAll('[data-rm="1"]');
			for (var i = 0, l = obsoletes.length; i < l; i++) {
				this.container.removeChild(obsoletes[i]);
			}
		}
	},

	/**
	 * [createRow description]
	 * @param  {[type]} i [description]
	 * @return {[type]}   [description]
	 */
	createRow: function(i) {
		//_log.debug('createRow', i, this.generatorFn/*, (i/4).toInt(), i%4*/);
			//_log.debug('generatorFn', i);
		var	item = this.generatorFn(i);
		

		//item.classList.add('vrow');
		item.style.top = (i * this.itemHeight) + 'px';

		// item.style.top = ((i/4).toInt() * this.itemHeight) + 'px';
		// item.style.left = ((i%4).toInt() * 110) + 'px';
		
		return item;
	},

	/**
	 * Renders a particular, consecutive chunk of the total rows in the list. To
	 * keep acceleration while scrolling, we mark the nodes that are candidate for
	 * deletion instead of deleting them right away, which would suddenly stop the
	 * acceleration. We delete them once scrolling has finished.
	 *
	 * @param {Node} node Parent node where we want to append the children chunk.
	 * @param {Number} from Starting position, i.e. first children index.
	 * @return {void}
	 */
	_renderChunk: function(node, from) {
		//_log.debug('_renderChunk', from);
		var finalItem = from + this.cachedItemsLen;
		if (finalItem > this.totalRows)
			finalItem = this.totalRows;

		// Append all the new rows in a document fragment that we will later append to
		// the parent node
		var fragment = document.createDocumentFragment();
		for (var i = from; i < finalItem; i++) {
			fragment.appendChild(this.createRow(i));
		}

		// Hide and mark obsolete nodes for deletion.
		for (var j = 1, l = node.childNodes.length; j < l; j++) {
			node.childNodes[j].style.display = 'none';
			node.childNodes[j].attribute('data-rm', '1');
		}
		node.appendChild(fragment);
	},

	/**
	 * [createScroller description]
	 * @param  {[type]} h [description]
	 * @return {[type]}   [description]
	 */
	createScroller: function(h) {
		this.scroller = document.createElement('div');
		this.scroller.style.opacity = 0;
		this.scroller.style.position = 'absolute';
		this.scroller.style.top = 0;
		this.scroller.style.left = 0;
		this.scroller.style.width = '1px';
		this.scroller.style.height = h + 'px';
		return this.scroller;
	}
});

module.exports = surface;


