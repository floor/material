
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
 * @class View
 * @param {Object} options Default options for view
 * @since 0.0.3
 * @author Jerome Vial
 *
 * @type {prime}
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
	 * Initialize
	 *
	 * @method initialize
	 * @param {options}
	 * @return {this}
	 * @private
	 */
	constructor(options) {
		_log.debug('constructor', options);

		super(options);

		this.init(options);
		this.build();
		
		if (this.options.bind) {
			this.initBind(this.options.bind);
		}

		return this;
	}

	/**
	 * Initialize
	 *
	 * @method _init
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
	 * Initialize Content
	 *
	 * @method _initContent
	 * @return {void}
	 * @private
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
	 * [focus description]
	 * @return {void}
	 */
	focus(){
		//_log.debug('focus');
		//viewCtrl.focus(this);
		this.emit('focus');
		this.emit('render');
	}

	/**
	 * Initialize Class
	 *
	 * @method _initClass
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
	 * Destroy Element
	 *
	 * @method remove
	 * @param {element}
	 */
	remove(element){
		if (element.destroy) {
			element.destroy();
		}
	}

	/**
	 * Return the isVisible status
	 *
	 * @return {Boolean}
	 */
	isVisible() {
		return this.visible;
	}

	/**
	 * [disableControl description]
	 * @param  {[type]} str [description]
	 * @return {[type]}     [description]
	 */
	disableControl(str) {
		var control = this.control[str];

		//_log.debug('disableControl', str, this.control);

		if (control) {
			control.setState('disabled');
		}
	}

	/**
	 * Clear the content of the view
	 * @return {[type]} [description]
	 */
	clear() {
		if (this.content && this.content.empty) {
			this.content.empty();
		}
	}

	/**
	 * Close
	 *
	 * @method close
	 * @return {this}
	 * @private
	 */
	close() {
		this.container.close();

		return this;
	}

	/**
	 * [hide description]
	 * @return {[type]} [description]
	 */
	hide() {
		//_log.debug('hide', this.container);
		this.container.hide();
		this.visible = false;
	}

	/**
	 * [show description]
	 * @return {[type]} [description]
	 */
	show() {
		//_log.debug('close', this.container);
		this.container.setStyle('display', null);
		this.visible = true;
	}

}

module.exports = View;
