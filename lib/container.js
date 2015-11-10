/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
    bind = require('./module/bind'),
	merge = require("deepmerge"),
	$ = require("elements"),
	Component = require('./component'),
	display = require('./container/display');

var	_log = __debug('material:container');
//	_log.defineLevel('DEBUG');

var Container = prime({

	mixin: [Options, Emitter, display],

	inherits: Component,

	name: 'container',

	options: {
		name: 'container',

		node: null,

		tag: 'div',
		bind: {
			'close': 'underlay.destroy'
		}
	},

	/**
	 * [initialize description]
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options) {
		this.options = merge(Container.parent.options, this.options);
		
		this.setOptions(options);

		this._initElement();

		if (this.options.comp) {
			this._initComp(this.options.comp);
		} else {
			this._initComponent();
		}

		return this;
	},

	/**
	 * Creates html structure and inject it to the dom.
	 * The container is _initElement with two elements: the wrapper and the content.
	 * If the option scroll is set to true, it will also add the scrollbar object
	 * @return {void}
	 */
	_initElement: function() {
		Container.parent._initElement.call(this);

		var opts = this.options;
		this.menu = {};

		if (opts.head) {
			this._initHead(opts.head);
		}

		if (this.name === 'window') {
			this._initBody();
		}
		if (opts.useOverlay) {
			this._initOverlay();
		}

		if (opts.foot) {
			this._initFoot(opts.foot);
		}

		var self = this;
		// this.on('injected', function() {
		// 	var direction = self.container.getStyle('flex-direction');
		// 	_console.log('direction', direction, this.element);
		// });

		if (this.options.useUnderlay) {
			this._initUnderlay();
		}
	},

	/**
	 * [_initComponent description]
	 * @return {void}
	 */
	_initComponent: function() {

		if (this.options.node === null) {
			return;
		}

		this.node = [];

		this.addComponent(this.options.node);
	},

	/**
	 * Initialize internal container components
	 * @param  {Mixin} comp Compenent description
	 * @return {void}
	 */
	_initComp: function(comp) {
		//_log.debug('_initComp', comp);
		var self = this;

		if (typeOf(comp) === 'string') {
			this.addComp(comp);
		} else if (typeOf(comp) === 'object') {
			_log.debug('object');
		} else if (typeOf(comp) === 'array') {
			comp.each(function(name) {
				self.addComp(name);
			});
		}
	},

	/**
	 * [addComponent description]
	 * @param {Object} node
	 */
	addComponent: function(node) {
		_log.debug('addComponent', node);
		if (!node.component) {
			node.component = 'container';
		}

		node.container = this.element;
		node.main = this.main;

		//_log.debug(node);

		var container = new Container(node);

		this.on('resize', function() {
			container.fireEvent('resize');
		});

		this.node.push(container);
		this.layout[this.main][container.name] = container;
		//ui.node[this.main][node.name] = container;
	},

	/**
	 * [_initComp description]
	 * @param  {string} name
	 * @param  {string} position
	 * @param  {DOMElement} element
	 * @return {DOMElement|void}
	 */
	addComp: function(name, position, element) {
		//_log.debug('addComp', name, position, element);
		position = position || 'bottom';
		element = element || this.element;

		//_log.debug('_addComp', name);

		if (!element) {
			_log.warn('Container is ', element);
			return;
		}

		var comp = this[name] = new Component()
			.addClass('container-' + name)
			.inject(element);

		return comp;
		/*this.addEvents({
			resize: function() {
				//_log.debug('resize from head', this, this.head.getSize().y+'px');
				this.element.setStyle('padding-top', this.head.getSize().y+'px');
			}
		});*/
	},

	/**
	 * _initClass container related class
	 * @return {void}
	 */
	_initClass: function() {
		Container.parent._initClass.call(this);

		this.element.addClass('ui-container');
	},

	/**
	 * create an overlay displayed when container is disabled (when moved or resized)
	 * @return {void}
	 */
	_initHead: function() {
		var self = this;

		this.head = new Component('div')
			.addClass('container-head')
			.inject(this.element, 'top')
			.on('dblclick', function() {
				self.emit('max');
			});
	},

	/**
	 * [setTitle description]
	 * @param {string} title
	 */
	setTitle: function(title) {
		if (this.title && this.head) {
			return this.title.set('text', title);
		}
	},

	/**
	 * [setTitle description]
	 * @return {string}
	 */
	getTitle: function() {
		//_log.debug('getTitle', this.title);
		if (this.title) {
			return this.title.get('html');
		}
	},

	/**
	 * [_initFoot description]
	 * @param  {Object} options
	 * @return {void}
	 */
	_initFoot: function( /*options*/ ) {

		this.foot = new Element('div', {
			'class': 'container-foot'
		}).inject(this.element, 'bottom');
	},

	/**
	 * [_initStatus description]
	 * @param  {string} component
	 * @param  {string} context
	 * @return {void}
	 */
	_initStatus: function(component /*, context*/ ) {

		component = component || 'foot';

		if (!this[component]) {
			this['_init' + component.capitalize()]();
		}

		this.status = new Element('div', {
			'class': 'container-status'
		}).inject(this[component]);
	},

	/**
	 * create an overlay displayed when container is disabled (when moved or resized)
	 * @return {void} [description]
	 */
	_initOverlay: function() {
		var self = this;

		this.overlay = new Element('div', {
			'class': 'container-overlay'
		}).inject(this.element);

		this.addEvent('onLoadComplete', function() {
			this.overlay.hide();
		});

		this.overlay.hide();

		this.addEvents({
			onBlur: function() {
				//_log.debug('blur');
				self.overlay.show();
			},
			onDragComplete: function() {
				//_log.debug('darg com', ui.window.underlay);
				self.overlay.hide();
			},
			onDragStart: function() {
				//_log.debug('darg start', this);
				self.overlay.show();
			},
			onResizeComplete: function() {
				self.overlay.hide();
				this.coord = this.element.getCoordinates();
			},
			onResizeStart: function() {
				self.overlay.show();
			}
		});
	},

	/**
	 * [_initUnderlay description]
	 * @return {void}
	 */
	_initUnderlay: function() {
		//_log.debug('_initUnderlay', this.device);
		var self = this;

		this.underlay = new Component({
			'class': 'dialog-underlay',
			styles: {
				zIndex: 10,
				//display: 'none'
			}
		}).inject(this.element, 'before');


		this.underlay.on('click', function() {
			_log.debug('click underlay');
			self.minimize();
		});
	},

	/**
	 * [focus description]
	 * @return {void}
	 */
	focus: function() {
		this.setState('focus');
	}
});

module.exports = Container;
