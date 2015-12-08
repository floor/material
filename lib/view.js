'use strict';

var Container = require('./container');
var bind = require('./module/bind');

//var Dragging = require('./view/dragging');
//var Loader = require('./view/loader');
//var Limit = require('./view/limit');
//var Scroll = require('./view/scroll');
//var LayoutView = require('./view/layout');
//var Toolbar = require('./toolbar/toolbar');
//var Zoom = require('./view/zoom');

//var viewCtrl = require('./view/ctrl'),

var defaults = {
	name: 'view',
	prefix: 'ui-',
	tag: 'div',
	binding: {}
}

var _log = __debug('material:view');
//	_log.defineLevel('DEBUG');

/**
 * View
 * class
 * @param {Object} Default options for view
 * @since 0.0.4
 */
class View extends Container {


	// mixin: [Emitter, Options, binding,
	// 	Toolbar,
	// 	ctrl,
	// 	Dragging,
	// 	Limit,
	// 	Loader,
	// 	Scroll,
	// 	LayoutView,
	// 	Scrolling,
	// 	Zoom
	// ],

	/**
	 * constructor
	 *
	 * @return {Object} This class instance
	 * @private
	 */
	constructor(options) {
		_log.debug('constructor', options);

		super(options);

		this.init(options);
		this.build();
		
		if (this.options.bind) {
			this.bind(this.options.bind);
		}

		return this;
	}

	/**
	 * Initialize
	 *
	 * @param {Object}
	 * @return {void}
	 * @private
	 */
	init(options) {
		_log.debug('init');

		super.init(options);

		this.name = 'view';

		this.options = [ defaults, options ].reduce(Object.assign, {});
		this.container = this.options.container;
		
		this.index = 0;
		this.views = [];

		//viewCtrl.register(this);

		this.emit('ready');

		return this;
	}

	/**
	 * Build
	 *
	 * @return {void}
	 * @private
	 * 
	 */
	build(){
		_log.debug('build');
		super.build();

		// if (opts.toolbar)
		// 	this._initToolbar(opts.toolbar);

		// if ( opts.resizable )
		// 	this._initResizer();

		//this._initState();
		this._initClass();

		this.emit('built');

		return this;
	}

	/**
	 * Initialize Css Class
	 *
	 * @return {void}
	 * @private
	 */
	_initClass(){
		_log.debug('_initClass');
		var opts = this.options;

		this.element.addClass(opts.lib + '-' + opts.base);
		this.element.addClass(opts.base + '-' + opts.clss);

		if (opts.klss)
			this.element.addClass(opts.klss);

		return this;
	}

	/**
	 * Clear the content of the view
	 * @return {Object} This class instance
	 */
	clear() {
		if (this.content && this.content.empty) {
			this.content.empty();
		}
	}

	/**
	 * Close
	 * @return {Object} This class instance
	 * @private
	 */
	close() {
		this.container.close();

		return this;
	}
}

module.exports = View;
