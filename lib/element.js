/**
 * Minimalistic Class for Activity
 *
 * @class Activity
 * @author Jerome Vial, Bruno Santos
 * @constructor
 */

"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	bind = require("./module/bind"),
	storage = require("./element/storage"),
	$ = require("elements"),
	zen = require('elements/zen');
	__debug = require('./module/debug');

var	_log = __debug('material:element');
	//_log.defineLevel('DEBUG');

var Element = prime({

	mixin: [Options, Emitter, bind, storage],
	
	name: 'element',

	options: {
		lib: 'ui',
		prefix: 'ui-',
		name: 'element',
		type: null,
		attr: ['accesskey', 'class', 'contenteditable', 'contextmenu',
		'dir', 'draggable', 'dropzone', 'hidden', 'id', 'lang',
		'spellcheck', 'style', 'tabindex', 'title', 'translate', 'type'],
		bind: {
			'dom.click': 'emit.click',
			'dom.dblclick': 'emit.dblclick'
		}
	},

	/**
	 * [_test description]
	 * @return {[type]} [description]
	 */
	click: function(ev) {
		console.log('_click', ev);
	},

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(tag, options){
		this.setOptions(options);

		this.options.tag = tag;

		this.build();

		//console.log(this.dom[0]);

		if (this.options.bind) {
			this.bind(this.options.bind);
		}

		return this;
	},

	/**
	 * [_initElement description]
	 * @return {[type]} [description]
	 */
	build: function() {
		_log.debug('_init', this.options.name);
		this.emit('init');

		var opts = this.options;

		this.emit('create');

		var tag = opts.tag;
		//var name = opts.name || opts.element.name;

		var dom = zen(tag);

		this.dom = dom;

		//console.log('this.dom', this.dom);

		// if (this.dom instanceof HTMLElement) {
		// 	console.log('dom is an Element', this.dom);
		// };

		this.setAttributes(this.options.attr);

		this.emit('created');

		return this;
	},

	/**
	 * [_initProps description]
	 * @return {[type]} [description]
	 */
	setAttributes: function(attr) {
		_log.debug('setAttribute');
		var opts = this.options;
			

		if (!opts.attr) {
			_log.debug('no attr', opts.name);
			return;
		} 

		var attr = opts.attr;

		for (var i = 0, len = attr.length; i < len; i++ ) {
			//_log.debug('attr', opts.name, attr[i]);
			var name = attr[i],
				value = opts[name];

			if (name === 'klass'){
				name = 'class';
			}

			if (value){
				this.setAttribute(name, value);
			}
		}
	},

	/**
	 * [setAttribute description]
	 * @param {[type]} name  [description]
	 * @param {[type]} value [description]
	 */
	setAttribute: function(name, value) {
		_log.debug('setAttribute', name, value);
		$(this.dom).attribute(name, value);

		return this;
	},

	/**
	 * [funciton description]
	 * @param  {[type]} klass [description]
	 * @return {[type]}       [description]
	 */
	addClass: function(klass) {
		$(this.dom).addClass(klass);

		return this;
	},

	text: function(text) {
		return $(this.dom).text(text);
	},

	/**
	 * Inject method insert element to the domtree using Dom methods
	 * @param  {[type]} container [description]
	 * @param  {[type]} position  [description]
	 * @return {[type]}           [description]
	 */
	inject: function(container, context) {
		_log.debug('inject', typeof container, container, context);

		var node = container;

		if (container && container.dom) {
			container = container.dom;
			_log.debug('container is prime');
		} else if (container instanceof HTMLElement) {
			_log.debug('container is element');
		} else {
			_log.debug('container mismatch');
			return;
		};

		context = context || 'bottom';

		var contexts = ['top', 'bottom', 'after', 'before'];
		var methods = ['top', 'bottom', 'after', 'before'];

		var index = contexts.indexOf(context);
		if (index === -1) {
			return;
		}

		var method = methods[index];

		// if element is a component use its element instead
		// if (element instanceof Element)
		// 	element = element.element;

		this.emit('inject');

		// insert component element to the dom tree using Dom
		$(this.dom)[method](container);

		this.isInjected = true;
		this.emit('injected');

		return this;
	}
});

module.exports = Element;

