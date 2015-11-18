/**
* Minimalistic Implement for Minimal.View Class
*
* @class View.Scroll
* @author Jerome Vial, Bruno Santos
*/

define(function() {

    var exports = new Class({

	/**
	 * Initialize Auto Scroll - Manage scroll when mouse reach boudaries dragging element
	 *
	 * @method _initAutoScroll
	 * @private
	 */
	_initAutoScroll: function(){
		this.scroll = new Fx.Scroll(this.element, this.options.autoScrollOptions);
	},

	/**
	 * Initialize Scroll
	 *
	 * @method _initScroll
	 * @param {scroll}
	 * @private
	 */
	_initScroll: function(scroll) {
		var opts = this.options;

		/*if (opts.scrollbar)
			this._initScrollbar(opts.scrollbar);*/

		if (opts.scroller)
			this._initScroller(opts.scroller);
	},

	/**
	 * Initialize Scrollbar - Creates a new scrollbar object _setEventsed to the container
	 *
	 * @method _initScrollbar
	 * @private
	 */
	_initScrollbar: function(){
		var self = this;

		var options = {};
		options.container = this.element;

		this.scrollbar = new UI.Scroll(options).addEvent('scrolling', function() {
			//_log.debug('------------');
			self.fireEvent('scrolling');
		});

		this.addEvents({
			// this shouldn't be neessary
			loadCompplete: function() {
				//_log.debug('loaded');
				self.scrollbar.update();
			},
			resize: function() {
				//self.scrollbar.element.setStyle('padding-top', this.head.getSize().y+'px');
				self.scrollbar.update();
			}
		});
	},

	/**
	 * Initialize Scroller - Creates a new scrollbar object _setEventsed to the container
	 *
	 * @method _initScroller
	 * @private
	 */
	_initScroller: function() {
		var self = this;

		//_log.debug('_initScroller', this.element);

		this.scroller = new Scroller(this.element, this.options.scroller_opts).addEvent('change', function() {
			_log.debug('scroller change');
		});


		/*this.container.addEvents({
			resize: function() {
				_log.debug('!!!', self.element.getSize().y);
				//self.scroller.options.area
			}
		});*/
/*
		this.element.addEvents({
			mousedown: function() {
				self.scroller.start();
			},
			mouseup: function() {
				self.scroller.stop();
			}
		});*/

		return this;
	}

    });

    return exports;

});
