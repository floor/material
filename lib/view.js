
/**
 * View
 * @class View
 * @param {Object} options Default options for view
 * @since 0.0.3
 * @author Jerome Vial
 *
 * @type {prime}
 */"use strict";

var prime = require('prime/index'),
	Container = require('./container'),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	binding = require('./module/binding'),
	merge = require("deepmerge");

	//Dragging = require('./view/dragging'),
	//Loader = require('./view/loader'),
	//Limit = require('./view/limit'),
	//Scroll = require('./view/scroll'),
	//LayoutView = require('./view/layout'),
	//Toolbar = require('./toolbar/toolbar'),
	//Zoom = require('./view/zoom'),

	//viewCtrl = require('./view/ctrl'),

var _log = __debug('material:view');
//	_log.defineLevel('DEBUG');

var View = prime({

	inherits: Container,

	mixin: [Emitter, Options, binding,
		//Toolbar,
		//ctrl,
		//Dragging,
		//Limit,
		//Loader,
		//Scroll,
		//LayoutView,
		//Scrolling,
		//Zoom
	],

	name: 'view',

	options: {
		name: 'view',
		prefix: 'ui-',
		tag: 'div',
		binding: {}
	},


	/**
	 * Initialize
	 *
	 * @method initialize
	 * @param {options}
	 * @return {this}
	 * @private
	 */
	constructor: function(options) {
		_log.debug('constructor', options);

		this.options = merge(View.parent.options, this.options);	
		this.setOptions(options);

		this.init();
		this.build();
		
		if (this.options.binding) {
			this.bindall(this.options.binding);
		}

		return this;
	},

	/**
	 * Initialize
	 *
	 * @method _init
	 * @param {Object}
	 * @return {void}
	 * @private
	 */
	init: function() {
		_log.debug('init');

		View.parent.init.call(this);
		this.container = this.options.container;
		

		this.index = 0;
		this.views = [];

		//viewCtrl.register(this);

		this.emit('ready');

		return this;
	},

	/**
	 * Initialize Content
	 *
	 * @method _initContent
	 * @return {void}
	 * @private
	 */
	build: function(){
		_log.debug('build');
		View.parent.build.call(this);

		// if (opts.toolbar)
		// 	this._initToolbar(opts.toolbar);

		// if ( opts.resizable )
		// 	this._initResizer();

		//this._initState();
		this._initClass();

		this.emit('built');

		return this;
	},

	/**
	 * [focus description]
	 * @return {void}
	 */
	focus: function(){
		//_log.debug('focus');
		//viewCtrl.focus(this);
		this.emit('focus');
		this.emit('render');
	},

	/**
	 * Initialize Class
	 *
	 * @method _initClass
	 * @return {void}
	 * @private
	 */
	_initClass: function(){
		_log.debug('_initClass');
		var opts = this.options;

		this.element.addClass(opts.lib + '-' + opts.base);
		this.element.addClass(opts.base + '-' + opts.clss);

		if (opts.klss)
			this.element.addClass(opts.klss);

		return this;
	},

	/**
	 * Destroy Element
	 *
	 * @method remove
	 * @param {element}
	 */
	remove: function(element){
		if (element.destroy) {
			element.destroy();
		}
	},

	/**
	 * Return the isVisible status
	 *
	 * @return {Boolean}
	 */
	isVisible: function() {
		return this.visible;
	},

	/**
	 * [disableControl description]
	 * @param  {[type]} str [description]
	 * @return {[type]}     [description]
	 */
	disableControl: function(str) {
		var control = this.control[str];

		//_log.debug('disableControl', str, this.control);

		if (control) {
			control.setState('disabled');
		}
	},

	/**
	 * Clear the content of the view
	 * @return {[type]} [description]
	 */
	clear: function() {
		if (this.content && this.content.empty) {
			this.content.empty();
		}
	},

	/**
	 * Close
	 *
	 * @method close
	 * @return {this}
	 * @private
	 */
	close: function() {
		this.container.close();

		return this;
	},

	/**
	 * [hide description]
	 * @return {[type]} [description]
	 */
	hide: function() {
		//_log.debug('hide', this.container);
		this.container.hide();
		this.visible = false;
	},

	/**
	 * [show description]
	 * @return {[type]} [description]
	 */
	show: function() {
		//_log.debug('close', this.container);
		this.container.setStyle('display', null);
		this.visible = true;
	}

});

module.exports = View;
