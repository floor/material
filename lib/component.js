/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	binding = require("./module/binding"),
	method = require("./component/method"),
	$ = require("elements"),
	zen = require('elements/zen');

var Component = prime({

	mixin: [Options, Emitter, binding, method],

	options: {
		lib: 'ui',
		prefix: 'ui-',

		component: 'component',
		name: 'component',
		type: null,	
		element: {
			attributes: ['accesskey', 'class', 'contenteditable', 'contextmenu',
			'dir', 'draggable', 'dropzone', 'hidden', 'id', 'lang',
			'spellcheck', 'style', 'tabindex', 'title', 'translate'],
			tag: 'span',
			type: null
		}
	},

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options){
		this.setOptions(options);

		this.emit('init');

		this._initOptions();
		this._initElement();
		this._initEvents();
		this._initBinding();

		return this;
	},

	/**
	 * [_initElement description]
	 * @return {[type]} [description]
	 */
	_initElement: function(){
		var opts = this.options;

		this.emit('create');

		var tag = this.options.element.tag;
		var name = this.options.name;

		this.domElement = zen(tag);

		this.element = $(this.domElement);

		// init attributes
		this._initAttributes();

		// set text or html if needed
		var text = opts.text || opts.html;
		if (text) this.setText(text);

		//element.store('_instance', this);

		if (opts.klass);
			this.addClass(opts.klass);

		this.emit('created');

		if (opts.state)
			this.setState(opts.state);

		this._initClass();

		return this.element;
	},

	/**
	 * Init component class
	 * @return {[type]} [description]
	 */
	_initClass: function() {
		var opts = this.options;

		//this.element.addClass(opts.prefix + opts.name);
		var klass = opts.klass || opts.element.klass;

		if (klass) {
			this.element.addClass(klass);
		}

		if (opts.type && typeof opts.type !== undefined) {
			this.element.addClass('type-' + opts.type);
		}

		if (opts.state && typeof opts.state !== undefined) {
			this.element.addClass('state-' + opts.state);
		}
	},

	/**
	 * [getName description]
	 * @return {string} name
	 */
	getName: function() {
		return this.options.name || this.name;
	},

	/**
	 * [setText description]
	 * @param {[type]} text [description]
	 */
	setText: function(text) {
		var node = document.createTextNode(text);
		this.element.appendChild(node);
	},


	/**
	 * [_initOptions description]
	 * @return {void}
	 */
	_initOptions: function() {
		var opts = this.options;
		//this.name = this.options.name;
		this.main = opts.main || opts.name;

		//ui.node = ui.node || {};
		//ui.node[this.main] = ui.node[this.main] || {};

		this.layout = opts.layout || {};
		this.layout[this.main] = this.layout[this.main] || {};

		this.dragHandlers = opts.dragHandlers || [];
	},


	/**
	 * [_initEvents description]
	 * @return {void}
	 */
	_initEvents: function() {
		//_log.debug('_initEvents');
		var self = this,
			opts = this.options;

		this.on({
			/**
			 * @ignore
			 */
			injected: function() {
				if (opts.resizable && self._initResizer) {
					self._initResizer();
				}
			},
			/**
			 * @ignore
			 */
			device: function(device) {
				//_log.debug('device', device);
				self.device = device;
			}
		});

		if (this.options.draggable && this.enableDrag) {
			this.enableDrag();
		}
	},

	/**
	 * Setter for the state of the component
	 * @param {String} state active/disable etc...
	 */
	setState: function(state){
		if (this.state)
			this.removeClass('state-'+this.state);

		if (state)
			this.addClass('state-'+state);

		this.state = state;
		this.emit('state', state);

		return this;
	},

	/**
	 * [_initClass description]
	 * @return {[type]} [description]
	 */
	addClass: function(klass) {
		this.element.addClass(klass);

		return this;
	},

	/**
	 * [_initClass description]
	 * @return {[type]} [description]
	 */
	removeClass: function(klass) {
		this.element.removeClass(klass);

		return this;
	},

	/**
	 * [setAttribute description]
	 * @param {[type]} name  [description]
	 * @param {[type]} value [description]
	 */
	setAttribute: function(name, value) {
		this.element.setAttribute(name, value);

		return this;
	},

	/**
	 * [_initProps description]
	 * @return {[type]} [description]
	 */
	_initAttributes: function() {
		//console.log('_initAttributes');
		var opts = this.options,
			attr = opts.element.attributes;

		for (var i = 0, len = attr.length; i < len; i++ ) {
			var name = attr[i],
				value = opts[name];

			if (name === 'klass')
				name = 'class';

			if (value)
				this.setAttribute(name, value);
		}
	},

	/**
	 * Inject method insert element to the domtree using Dom methods
	 * @param  {[type]} container [description]
	 * @param  {[type]} position  [description]
	 * @return {[type]}           [description]
	 */
	inject: function(element, context) {
		//console.log('inject', this.element, context);

		context = context || 'bottom';

		var contexts = ['top', 'bottom', 'after', 'before'];
		var methods = ['top', 'bottom', 'after', 'before'];

		var index = contexts.indexOf(context);
		if (index === -1)
			return;

		var method = methods[index];

		// if element is a component use its element instead
		// if (element instanceof ui.component)
		// 	element = element.element;

		this.emit('inject');

		// insert component element to the dom tree using Dom
		$(this.element)[method](element);

		this.emit('injected');

		return this;
	},

	/**
	 * [hide description]
	 * @return {[type]} [description]
	 */
	hide: function() {
		// this.element.attribute('style', {
		// 	display: 'none'
		// });
	},

	/**
	 * [remove description]
	 * @return {[type]} [description]
	 */
	remove: function() {
		// this.element.attribute('style', {
		// 	display: 'none'
		// });
	}

});

module.exports = Component

