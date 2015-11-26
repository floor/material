
/**
 * Element class
 *
 * @class Element
 */'use strict';

var prime = require('prime/index');
var	Options = require('prime-util/prime/options');
var	Emitter = require("prime/emitter");
var	binding = require("./module/binding");
var	storage = require("./element/storage");

var	$ = require("elements");
var	zen = require('elements/zen');
var	moofx = require('moofx');

var	__debug = require('./module/debug');
var	_log = __debug('material:element');
//	_log.defineLevel('DEBUG');

var Element = prime({

	mixin: [Options, Emitter, binding, storage],
	
	name: 'element',

	options: {
		lib: 'ui',
		prefix: 'ui-',
		name: 'element',
		type: null,
		attr: ['accesskey', 'class', 'contenteditable', 'contextmenu',
		'dir', 'draggable', 'dropzone', 'hidden', 'id', 'lang',
		'spellcheck', 'style', 'tabindex', 'title', 'translate', 'type'],
		binding: {
			'dom.click': 'emit.click',
			'dom.dblclick': 'emit.dblclick',
			'dom.mousedown': 'emit.mousedown',
			'dom.mouseup': 'emit.mouseup',
			'dom.mouseleave': 'emit.mouseleave',
			'dom.mouseenter': 'emit.mouseenter',
			'dom.blur': 'emit.blur',
			'dom.focus': 'emit.focus',
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

		if (this.options.binding) {
			this.bindall(this.options.binding);
		}

		return this;
	},

	/**
	 * [build description]
	 * @return {Object} this
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

		this.attributes(this.options.attr);

		this.emit('created');

		return this;
	},

	/**
	 * [_initProps description]
	 * @return {Object} this
	 */
	attributes: function(attr) {
		_log.debug('attribute');
		var opts = this.options;
			

		if (!opts.attr) {
			_log.debug('no attr', opts.name);
			return;
		}

		var attr = opts.attr;

		for (var i = 0, len = attr.length; i < len; i++ ) {
			//_log.debug('attr', opts.name, attr[i]);
			var name = attr[i];
			var	value = opts[name];

			if (name === 'klass'){
				name = 'class';
			}

			if (value){
				this.attribute(name, value);
			}
		}

		return this;
	},

	/**
	 * Gets or sets an attribute or property. 
	 * Returns the value of the attribute If only the name parameter is passed, 
	 * otherwise returns the current elements instance.
	 * @param {string} name  The name of the attribute or property
	 * @param {string} value  If the value parameter is set, this method will act like a setter and will set the value to all elements in the collection. 
	 * If this parameter is omitted, it will act as a getter on the first element in the collection.
	 * @return {Object} this
	 */
	attribute: function(name, value) {
		_log.debug('attribute', name, value);
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


	/**
	 * [funciton description]
	 * @param  {[type]} klass [description]
	 * @return {[type]}       [description]
	 */
	removeClass: function(klass) {
		$(this.dom).removeClass(klass);

		return this;
	},

	text: function(text) {
		return $(this.dom).text(text);
	},

	/**
	 * [animate description]
	 * @return {[type]} [description]
	 */
	animate: function() {
		var moo = moofx(this.dom);
    	moo.animate.apply(moo, arguments);
    	return this;
	},

	/**
	 * [animate description]
	 * @return {[type]} [description]
	 */
	style: function() {
		var moo = moofx(this.dom);
    	moo.style.apply(moo, arguments);
    	return this;
	},

	/**
	 * [animate description]
	 * @return {[type]} [description]
	 */
	compute: function(prop) {
		
		return moofx(this.dom).compute(prop);
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
	},

	/**
	 * [delegate description]
	 * @param  {string}	type	event
	 * @param  {string} selector [description]
	 * @param  {Function} fn       [description]
	 * @return {Object}	this
	 */
	delegate: function(type, selector, fn) {
		$(this.dom).delegate(type, selector, fn);

		return this;
	},

	/**
	 * [destroy description]
	 * @return {Object} this class
	 */
	destroy: function() {
		_log.debug(this.dom[0]);

		this.dom[0].parentNode.removeChild(this.dom[0]);

		return this;
	}
});

module.exports = Element;

