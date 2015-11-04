(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
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


},{"./component/method":3,"./module/binding":10,"elements":16,"elements/zen":43,"prime-util/prime/options":73,"prime/emitter":75,"prime/index":76}],3:[function(require,module,exports){
/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index");

var method = prime({
	/**
	 * [toElement description]
	 * @return {[type]} [description]
	 */
	toElement: function() {
		return this.element;
	},

	/**
	 * [show description]
	 * @return {[type]} [description]
	 */
	show: function(){
		this.fireEvent('show');
		this.element.show();

		return this;
	},


	/**
	 * [hide description]
	 * @return {[type]} [description]
	 */
	hide: function(){
		this.fireEvent('hide');
		this.element.hide();

		return this;
	},

	/**
	 * [show description]
	 * @return {[type]} [description]
	 */
	fade: function(value){
		this.fireEvent('fade');
		this.element.fade(value);

		return this;
	},


	/**
	 * [getStyle description]
	 * @param  {[type]} style [description]
	 * @return {[type]}       [description]
	 */
	getStyle: function(style){
		return this.element.attribute(name);



	},

	/**
	 * [getSize description]
	 * @return {[type]} [description]
	 */
	getSize: function() {
		//_log.debug('------',typeOf(this.element));
		if (typeOf(this.element) == 'object')
			//_log.debug(this.options.name);

		return this.element.getSize();
	},

	/**
	 * [getComputedSize description]
	 * @return {[type]} [description]
	 */
	getComputedSize: function() {
		return this.element.getComputedSized();
	},

	/**
	 * [getCoordinates description]
	 * @return {[type]} [description]
	 */
	getCoordinates: function(context) {
		return this.element.getCoordinates(context);
	},

	/**
	 * [addClass description]
	 * @param {[type]} klass [description]
	 */
	addClass: function(klass){
		this.element.addClass(klass);
		return this;
	},

	/**
	 * [removeClass description]
	 * @param  {[type]} klass [description]
	 * @return {[type]}       [description]
	 */
	removeClass: function(klass){
		return this.element.removeClass(klass);
	},

	/**
	 * [get description]
	 * @param  {[type]} property [description]
	 * @return {[type]}          [description]
	 */
	get: function(property){
		return this.element.get(property);
	},

	/**
	 * [morph description]
	 * @param  {[type]} props [description]
	 * @return {[type]}       [description]
	 */
	morph: function(props){
		return this.element.morph(props);
	},

	/**
	 * [setSize description]
	 * @param {[type]} width  [description]
	 * @param {[type]} height [description]
	 */
	setSize: function(width, height){
		this.element.x = width || this.options.width;
		this.element.y = height || this.options.height;

		if (this.element.x)
			this.element.setStyle('width', this.element.x);

		if (this.element.y)
			this.element.setStyle('height', this.element.y);

		this.fireEvent('resize');
		return this;
	},

	/**
	 * [setStyle description]
	 * @param {[type]} style [description]
	 * @param {[type]} value [description]
	 */
	setStyle: function(style, value){
		this.element.setStyle(style, value);

		return this;
	},

	/**
	 * [setStyles description]
	 * @param {[type]} styles [description]
	 */
	setStyles: function(styles){
		this.element.setStyles(styles);

		return this;
	},

	/**
	 * [getElement description]
	 * @param  {[type]} string [description]
	 * @return {[type]}        [description]
	 */
	getElement: function(string){
		return this.element.getElement(string);
	},

	/**
	 * [getElements description]
	 * @param  {[type]} string [description]
	 * @return {[type]}        [description]
	 */
	getElements: function(string){
		return this.element.getElements(string);
	},

	/**
	 * [submit description]
	 * @param  {[type]} string [description]
	 * @return {[type]}        [description]
	 */
	submit:  function(string){
		return this.element.submit(string);
	},

	/**
	 * [dispose description]
	 * @return {[type]} [description]
	 */
	dispose: function(){
		return this.element.dispose();
	},

	/**
	 * [destroy description]
	 * @return {[type]} [description]
	 */
	destroy: function(){
		this.element.destroy();
		return;
	}
});

module.exports = method;

},{"prime/index":76}],4:[function(require,module,exports){
/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	mergeObject = require("mout/object/merge"),
	$ = require("elements"),
	Component = require('./component'),
	display = require('./container/display');

var Container = prime({

	mixin: [Options, Emitter, display],

	inherits: Component,

	name: 'layout',

	options: {
		name: 'container',

		node: null,

		tag: 'div',
		/*resizable: false,
		resizeBorders: ['top','right','bottom','left']*/
	},

	/**
	 * [initialize description]
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options) {
		this.setOptions(options);

		this.options = mergeObject(Container.parent.options, this.options);

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

		this.on('close', function() {
			self.underlay.destroy();
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

},{"./component":2,"./container/display":5,"elements":16,"mout/object/merge":53,"prime-util/prime/options":73,"prime/emitter":75,"prime/index":76}],5:[function(require,module,exports){
/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	Container = require('../container'),
	$ = require("elements");

var display = new prime({

	/**
	 * Display options for container
	 * @type {Object} options
	 */
	options: {
		display: {
			fx: {
				default: {
					duration: 160,
				    transition: 'sine:out',
				    link: 'cancel'
				},
				minimize: {
					duration: 160,
				    transition: 'sine:out',
				    link: 'cancel'
				}
			}
		}
	},

	/**
	 * [_initDisplay description]
	 * @return {[type]} [description]
	 */
	_initDisplay: function() {
 		//_log.debug('_initDisplay', this.element);

 		this._modifier = 'width';

 		var direction = this.container.getStyle('flex-direction');

		if (direction === 'column')
			this._modifier = 'height';

		//_log.debug('direction', direction, this._modifier);

		var self = this,
			opts = this.options.display,
			fx = opts.fx.default,
			modifier = this._modifier;

		if (!this[modifier])
			this[modifier] = 220;

		this.device = this.device || 'desktop';
		//this.underlay.hide();
		this.display = {};

		fx.property = modifier;

		this.display.fx = new Fx.Tween(this.element, fx)
		.addEvent('complete', function() {
			self.fireEvent('toggled');
		});

		return this.display;
	},

	/**
	 * [getDisplay description]
	 * @return {[type]} [description]
	 */
	getDisplay: function() {

		return this._display;
	},

	/**
	 * [getDisplay description]
	 * @return {[type]} [description]
	 */
	setDisplay: function(display) {

		this._display = display;

		return this;
	},

	/**
	 * [toggle description]
	 * @return {[type]} [description]
	 */
	toggle: function() {
		//_log.debug('__toggle click, display', this._display);

		if (this._display === 'normalized'){
			this.minimize();
		} else {
			this.normalize();
		}

		return this._display;
	},

	/**
	 * [minimize description]
	 * @return {[type]} [description]
	 */
	minimize: function() {
		//_log.debug('------start minimalization', this.device);
		var self = this;	
		if (!this.display) {
			this._initDisplay();
		}

		this.fireEvent('minimize');

		this.display.fx.start(0);

		(function(){ 
			//self.element.setStyle('display', 'none');
		}).delay(160);

		this._display = 'minimized';

		if (this.underlay && this.device != 'desktop') {
			this.underlay.fade(0);
		}

		this.fireEvent('display', 'minimized');
	},

	/**
	 * [normalize description]
	 * @return {[type]} [description]
	 */
	normalize: function() {
		// _log.debug('normalize');
		var self = this;
		if (!this.display) {
			this._initDisplay();
		}
		
		this.fireEvent('normalize');

		//self.element.setStyle('display', 'flex');

		var size = this[this._modifier];

		if (this.display.fx) {
			this.display.fx.start(size);
		} else {
			this.element.setStyle(this._modifier, size);
		}
		if (this.underlay && this.device != 'desktop') {
			//_log.debug('---', this.device);
			this.underlay.show();
			this.underlay.fade(1);
		}
		this._display = 'normalized';

		this.fireEvent('display', 'normalized');
	},

	/**
	 * [normalize description]
	 * @return {[type]} [description]
	 */
	maximize: function() {
		//_log.debug('maximize', size);

		return;
		this.toggleFx.start(size);

		this.element.setStyle('display', null);
		this.element.addClass('state-focus');

		this.isOpen = true;

		this.fireEvent('maximized', this);


	}
});

module.exports = display;


},{"../container":4,"elements":16,"prime-util/prime/options":73,"prime/emitter":75,"prime/index":76}],6:[function(require,module,exports){
/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	mergeObject = require("mout/object/merge"),
	$ = require("elements"),
	zen = require('elements/zen'),
	Component = require('../component');

var Button = prime({

	mixin: [Options, Emitter],

	inherits: Component,
	name: 'button',
	options: {
			name: 'button',
			type: null, // push, file
			ink: true,
			element: {
				tag: 'span'
			},
			binding: {
				_list: ['element'],
				element: {
					'sensor.click': '_onClick',
					'sensor.dblclick': '_onDblClick',
					'sensor.mousedown': '_onMouseDown',
					'sensor.mouseup': '_onMouseUp',
					'sensor.mouseleave': '_onMouseLeave'
				}
			}
		},

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options){
		this.setOptions(options);

		this.options = mergeObject(Button.parent.options, this.options);

		this._initElement();
		this._initBinding();

		return this;
	},



	/**
	 * [set description]
	 */
	set: function() {},

	/**
	 * [_initElement description]
	 * @return {void}
	 */
	_initElement: function() {
		var $ = require('elements/attributes');
		Button.parent._initElement.call(this);

		var opts = this.options;
		var type = opts.type;

		opts.text = opts.text || opts.n;

		if (type === null) {
			type = 'icon-text';
		}

		/*if (opts.text && type != 'icon') {
			this.element.set('html', opts.text);
		}*/
		//var text = opts.type.match(/text/g);

		// if (opts.name) {
		// 	this.element.attributes('data-name', opts.name);
		// }


		//this.element.attributes('title', opts.text);

		if (opts.icon) {
			this._initIcon(type, opts.icon || opts.name);
		}

		if (opts.text) {
			this._initText(type);
		}

		if (opts.ink) {
			this._initSensor();
		} else {
			this.sensor = this.element;
		}
	},


	/**
	 * [_initIcon description]
	 * @param  {string} type
	 * @return {string}
	 */
	_initIcon: function(type, name) {
		_log.debug('_initIcon', type, name);

		var tag = 'span';
		var code = name;
		var klss = null;

		var prop = {
			'class': 'ui-icon'
		};

		this.icon = new Element(tag, prop).inject(this.element);


		if (mnml.icon.mdi[name]) {
			//_log.debug('mdi');
			klss = 'icon-mdi';
			code = mnml.icon.mdi[name];
		} else if (mnml.icon.font[name]) {
			//_log.debug('iocn font name', name);
			klss = 'icon-font';
			code = mnml.icon.font[name];
		}

		if (klss) {
			this.icon.addClass(klss);
		}

		if (code) {
			this.icon.addClass(code);
		}
	},

	/**
	 * [_initText description]
	 * @param  {string} type
	 * @return {void}
	 */
	_initText: function(type) {
		var opts = this.options;

		var tag = 'span';

		var pos = 'bottom';
		if (type === 'text-icon') {
			pos = 'top';
		}

		this.text = new Element(tag, {
			'class': 'ui-text',
			'html': opts.text
		}).inject(this.element, pos);
	},

	/**
	 * [_initClass description]
	 * @return {void}
	 */
	_initClass: function() {
		var opts = this.options;
		//_log.debug(this.name);

		if (this.options.isPrimary) {
			this.element.addClass('is-primary');
		}

		if (this.options.klss) {
			this.element.addClass(opts.klss);
		}

		if (this.options.type) {
			this.element.addClass('type-' + this.options.type);
		}

		this.element.addClass(opts.prefix + this.name);

		if (this.options.clss) {
			this.element.addClass(this.options.clss);
		}
	},

	/**
	 * [_initText description]
	 * @return {void}
	 */
	_initSensor: function() {
		//_log.debug('_initSensor');

		this.sensor = new Component('div', {
			tag: 'div',
			'class': 'ui-sensor',
		}).inject(this.element);
	},

	/**
	 * [_initEffect description]
	 * @param  {string} ink
	 * @param  {string} x
	 * @param  {string} y
	 * @param  {Object} coord
	 * @return {void}
	 */
	_touchInk: function(ink, x, y, coord) {
		var size = coord.height;
		var top = 0;
		var duration = 1000;

		this.ink = ink;

		if (coord.width > size) {
			size = coord.width;
			top = (coord.height - coord.width) / 2;
		}

		var fx = new Fx.Morph(ink, {
			duration: duration,
			link: 'chain',
			transition: Fx.Transitions.Quart.easeOut
		});

		fx.start({
			height: size,
			width: size,
			left: 0,
			top: top,
			opacity: 0
		});

		(function() {
			ink.destroy();
		}).delay(duration);
	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	_onClick: function(e) {
		//_log.debug('_onElementClick', e);

		var opts = this.options;

		e.stopPropagation();

		if (opts.emit && this.state !== 'disabled') {
			this.fireEvent(opts.emit);
		}
		this.fireEvent('press', opts.emit);
		this.fireEvent('pressed', opts.emit);

		if (opts.call && this.state !== 'disabled') {
			opts.call();
		}
	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	_onDblClick: function(e) {
		var opts = this.options;

		e.stop();

		if (opts.emit && this.state !== 'disabled') {
			this.emit('dblpress', opts.emit);
		}

		this.emit('dblpressed', opts.emit);
	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {Object}
	 */
	_onMouseDown: function(e) {
		//_log.debug('_onElementMouseDown', e);

		e.stop();

		if (this.state === 'disabled') {
			return;
		}

		var x = e.event.offsetX;
		var y = e.event.offsetY;

		var coord = this.element.getCoordinates(this.element);

		var ink = this.ink = new Element('span', {
			class: 'ui-ink',
			styles: {
				left: x,
				top: y
			}
		}).inject(this.element, 'top');

		this._touchInk(ink, x, y, coord);

		this.fireEvent('mousedown');
	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	_onMouseLeave: function(e) {
		//_log.debug('_onMouseLeave', e);


	},

	/**
	 * [_onElementMouseDown description]
	 * @param  {event} e
	 * @return {void}
	 */
	_onMouseEnter: function(e) {
		//_log.debug('_onElementMouseDown', e);


	},

	/**
	 * [_onElementMouseUp description]
	 * @return {void}
	 */
	_onMouseUp: function(e) {
		//_log.debug('_onElementMouseUp', e);

		if (this.options.type === 'check') {
			if (this.state === 'checked') {
				this.setState(null);
			} else {
				this.setState('checked');
			}
		}

		//this.react.destroy();
	}

});

module.exports = Button;

},{"../component":2,"elements":16,"elements/attributes":11,"elements/zen":43,"mout/object/merge":53,"prime-util/prime/options":73,"prime/emitter":75,"prime/index":76}],7:[function(require,module,exports){
/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	Container = require('../container'),
	$ = require("elements");

var component = new prime({

	mixin: [Options, Emitter],

	options: {
		resizer: {
			modifier: {
				row: {
					size: 'width',
					from: 'left',
					mode: {
						y: false
					}
				},
				column: {
					size: 'height',
					from: 'top',
					mode: {
						x: false
					}
				}
			}
		}
	},

	/**
	 * Instanciate the given object comp
	 * @param  {object]} comp list component
	 * @return {[type]}      [description]
	 */
	_initComponent: function(comp) {
		console.log('_initComponent', comp.opts.name, comp);

		// shortcuts
		comp.opts.flex = comp.opts.flex || comp.flex;
		comp.opts.hide = comp.opts.hide || comp.hide;
		comp.opts.theme = comp.opts.theme || comp.theme;

		//_log.debug('comp', comp.clss);

		var name = comp.opts.name;
		//var clss = api.strToClss(comp.clss);

		//comp.opts.container = comp.container;
		var component = this.component[name] = this[name] = new Container(comp.opts);
		
		//_log.debug(component.container);

		// register component
		this._componentRegister(name, component);

		//settings
		//this._initComponentSettings(component);

		// styles and size
		this._setComponentStyles(component);
		this._setComponentDisplay(component);
		this._attachComponentEvents(component);

		// 
		
		return component;
	},

	/**
	 * [_componentRegister description]
	 * @param  {[type]} name      [description]
	 * @param  {[type]} component [description]
	 * @return {[type]}           [description]
	 */
	_componentRegister: function(name, component) {
		//_log.debug('_componentRegister', name, component);

		this.components = this.components || [];
		this.components.push(component);
	},

	/**
	 * [_initComponentSettings description]
	 * @param  {object} name   [description]
	 * @param  {[type]} object [description]
	 * @return {[type]}        [description]
	 */
	_initComponentSettings: function(component) {
		//_log.debug('_initcompSettings', component);

		var name = component.getName();
		var element = component.element;
	
	},

	/**
	 * [_initComponentSettings description]
	 * @param  {object} name   [description]
	 * @param  {[type]} object [description]
	 * @return {[type]}        [description]
	 */
	_setComponentStyles: function(component) {
		//_log.debug('_setComponentStyles', component);

		if (component.options.flex) {
			//component.element.setStyle('flex', component.options.flex);
			component.element.addClass('flex-'+component.options.flex);
		}

		if (component.options.hide) {
			component.element.setStyle('display', 'none');

		}

		if (component.options.theme) {
			component.element.addClass('theme' + '-' + component.options.theme);

		}
	},

	/**
	 * [_initSize description]
	 * @param  {[type]} name   [description]
	 * @param  {[type]} object [description]
	 * @return {[type]}        [description]
	 */
	_setComponentDisplay: function(component) {
		//_log.debug('comp opts', component.options);
		var display = 'normalized';

		
		var name = component.getName();
		var element = component.element;

		if (this.settings[name] && this.settings[name].display) {
			display = this.settings[name].display;
		}

		component.setDisplay(display, 'width');

		if (component.options.flex) {
			//_log.debug('---flex', name, component.options);
		} else {
			
			if (this.settings[name] && this.settings[name].width) {
				//_log.debug('settings', name, display);
				//element.setStyle('flex', 'none');
				element.addClass('flex-none');
				if (display === 'minimized') {
				
					element.setStyle('width', 0);
				} else {
					
					if (this.settings[name].width < 32)
						this.settings[name].width = 32;

					
					//_log.debug('----', name, element);
					element.setStyle('width', this.settings[name].width || 160);
				}

				component.width = this.settings[name].width || 200;
				component._modifier = 'width';
			} else if (this.settings[name] && this.settings[name].height) {
				element.setStyle('flex', 'none');
				element.setStyle('height', this.settings[name].height);
				component.height = this.settings[name].height || 160;
				component._modifier = 'height';
			}

			this._initResizer(component);
		}
	},

	/**
	 * [_attachComponentEvents description]
	 * @param  {[type]} object [description]
	 * @return {[type]}        [description]
	 */
	_attachComponentEvents: function(component) {
		var self = this;
		var name = component.getName();

		component.on({
			toggled:  function() {
				//_log.debug('toggled');
				self.fireEvent('resize');
			},
			resizing:  function() {
				//_log.debug('toggled');
				self.fireEvent('resize');
			},
			display: function(state) {
				//_log.debug('display', name, state);
				self.fireEvent('display', [name, state]);
			}
		});

		this.on({
			resize: function() {
				component.fireEvent('resize');
			},
			drag: function() {
				component.fireEvent('resize');
			},
			normalize: function() {
				component.fireEvent('resize');
			},
			maximize: function() {
				component.fireEvent('resize');
			},
			minimize: function() {
				component.fireEvent('resize');
			},
			device: function(device) {
				//_log.debug('device', device);
				component.fireEvent('device', device);
			}
		});
	}
});

module.exports = component;

},{"../container":4,"elements":16,"prime-util/prime/options":73,"prime/emitter":75,"prime/index":76}],8:[function(require,module,exports){
/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	$ = require("elements"),
	zen = require('elements/zen'),
	Component = require('../component'),
	Container = require('../container'),
	component = require('../layout/component'),
	resize = require('../layout/resize');

var Layout = new prime({

	mixin: [Options, Emitter, component, resize],

	name: 'layout',
	/**
	 * Layout options
	 * @type {Object}
	 * @param {name} [name] layout
	 * @param {Object} [clss] Default component class
	 */
	options: {
		name: 'layout',
		node: {
			_name: 'standard',
			_list: ['navi', 'main', 'side'],
			main: {
				flex: '1'
			},
			navi: {
				theme: 'dark'
			}
		}
	},

	/**
	 * [constructor description]
	 * @param  {[type]} options [description]
	 * @return {[type]}         [description]
	 */
	constructor: function(options){
		this.setOptions(options);

		this._initLayout(this.options);

		return this;
	},

	/**
	 * [_initLayout description]
	 * @return {[type]} [description]
	 */
	_initLayout: function(opts) {
		//_log.debug('initialize', opts);
		var node = opts.node;
		this.settings = opts.settings || {};
		this.component = {};
		this.components = [];
		this.resizer = {};

		this._initContainer(opts);

		console.log('render', node);

		this.render(node);
		this._initEvents();
	},

	/**
	 * [_initEvents description]
	 * @param  {[type]} opts [description]
	 * @return {[type]}      [description]
	 */
	_initEvents: function(opts) {
		var self = this;

		// $(window).on('resize', function() {
		// 	//_log.debug('layout resize', this.container.getCoordinates());
		// 	var coord = self.container.getCoordinates();
		// 	if (coord.width < 720 && self.navi) {
		// 		self.navi.minimize();
		// 		//self.resizer.navi.hide();
		// 	}
		// 	self.emit('drag');
		// });


		// (function() {
		// 	self.emit('drag');
		// }).delay(1000);
	},

	/**
	 * [_initContainer description]
	 * @return {[type]} [description]
	 */
	_initContainer: function(opts) {

		this.container = new Container({
			resizable: false,
			'class': 'ui-layout layout-' + opts.node._name
		}).inject(opts.container);

		this.mask = new Component({
			'class': 'layout-mask',
		}).inject(this.container.element);

		//_log.debug('Layout container', this.container);

		this.container.addClass('ui-layout');
		this.container.addClass('layout-' + opts.node._name);

		if (this.options.theme)
			this.container.addClass('theme-' + this.options.theme);

		opts.node.container = this.container;
	},

	/**
	 * [_process description]
	 * @param  {[type]} mnml [description]
	 * @return {[type]}      [description]
	 */
	render: function(node, type, level) {
		console.log('render', node, type, level || 1);
		//_log.debug('_processComponents', node, type, level || 1);
		var list = node._list || [];
			level = level++ || 1;

		//_log.debug('---!!! axis', node._axis);

		if (type !== 'tab') {
			this._initFlexDirection(node.container, node._axis);
		}


		for (var i = 0, len = list.length; i < list.length; i++) {
			//_log.debug('--', list[i]);
			var name = list[i],
				comp = node[name] || {};

			comp.clss = comp.clss || this.options.clss;
			comp.opts = comp.opts || {};
			comp.opts.name = name;
			comp.opts.position = i + 1;
			comp.opts.nComp = list.length;

			if (name === "navi")
				comp.opts.useUnderlay = true;

			if (i === list.length - 1) {
				console.log('last--', name);
				comp.opts.last = true;
			}

			if (type !== 'tab') {
				comp.opts.container = node.container;
			}

			var component = this._initComponent(comp);

			if (type === 'tab') {
				//_log.debug('tab', component);
				component.options.noResizer = true;
				node.container.addTab(component);
			}

			component.element.addClass('container-'+name);

			if (comp.node) {
				comp.node.container = component;

				if (component.options.clss === 'tab') {
					var c = this.render(comp.node, 'tab', level);
				} else {
					this.render(comp.node, null, level);
				}
			}
		}
	},

	/**
	 * [_initFlexDirection description]
	 * @param  {[type]} container [description]
	 * @param  {[type]} axis      [description]
	 * @return {[type]}           [description]
	 */
	_initFlexDirection: function(container, axis) {
		//_log.debug('_initFlexDirection', container, axis);

		if (!container) return;

		axis = axis || 'x';

		if (axis === 'x') {
			container.addClass('flex-horizontal');
		} else if (axis === 'y') {
			container.addClass('flex-vertical');
		}
	},

	/**
	 * [setDevice description]
	 * @param {[type]} device [description]
	 */
	setDevice: function(device) {
		//_log.debug('setDevice');

		this.device = device;

		this.fireEvent('device', device);
	}
});

module.exports = Layout;

},{"../component":2,"../container":4,"../layout/component":7,"../layout/resize":9,"elements":16,"elements/zen":43,"prime-util/prime/options":73,"prime/emitter":75,"prime/index":76}],9:[function(require,module,exports){
/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	$ = require("elements");

var resize = new prime({

	mixin: [Options, Emitter],

	options: {
		resizer: {
			modifier: {
				row: {
					size: 'width',
					from: 'left',
					mode: {
						y: false
					}
				},
				column: {
					size: 'height',
					from: 'top',
					mode: {
						x: false
					}
				}
			}
		}
	},

	/**
	 * [_initResizeBorder description]
	 * @param  {[type]} component [description]
	 * @param  {[type]} border    [description]
	 * @return {[type]}           [description]
	 */
	_initResizer: function(component) {
		//_log.debug('_initResizer', component.options.name);

		var self = this,
			name = component.options.name,
			element = component.element,
			container = component.container,
			last = component.options.last;

		this._initMaximize(component);


		if (!container) return;

		var direction = container.getStyle('flex-direction');
		
		if (!direction)	return;

		var modifier = this.options.resizer.modifier[direction];

		if (!modifier) return;

		//_log.debug('direction', direction, modifier);

		//_log.debug(element, coord);
		var resizer = this.resizer[name] = new Element('div', {
			'class': 'ui-resizer',
			'data-name': component.options.name
		}).addEvents({
			click: function(e){
				e.stop();
			},
			mousedown: function(e) {
				e.stop();
				self.mask.setStyle('display', 'block');
			},
			mouseup: function(e) {
				//e.stop();
				self.mask.setStyle('display', 'none');
			}
		}).inject(container);

		if (modifier.size) {
			resizer.addClass('resizer-'+ modifier.size);
		}

		if (last) {
			//_log.debug('------last' );
			//resizer.addClass('resizer-last');
		}

		this._initResizerDrag(resizer, modifier, component);
		this._initResizerEvent(component, resizer, modifier);

		this.fireEvent('drag');
	},

	/**
	 * [_initDrag description]
	 * @param  {[type]} resizer  [description]
	 * @param  {[type]} modifier [description]
	 * @return {[type]}          [description]
	 */
	_initResizerDrag: function(resizer, modifier, component) {
		var self = this;
		//_log.debug('initResizerDrag', resizer, modifier);

		var element = component.element,
			container = component.container,
			last = component.options.last;

		var drag = new Drag.Move(resizer, {
			modifiers: modifier.mode,
		    onStart: function(el){
				//_log.debug('onStart', el);
				//self.fireEvent('resizeStart', el);
				self.mask.setStyle('display', 'block');
			},
			onDrag: function(el, ev){
				//_log.debug('onDrag', el);
				self.mask.setStyle('display', 'block');
				var coord = element.getCoordinates(container);
				var coordc = container.getCoordinates();
				var c = resizer.getCoordinates(container);

				//element.setStyle('flex','none');
				//element.setStyle(modifier.size, c[modifier.from] - coord[modifier.from]);
				if (last){
					//_log.debug(modifier.size, coordc[modifier.size], c[modifier.from]);
					element.setStyle(modifier.size, coordc[modifier.size] - c[modifier.from]);
				}
				else {
					element.setStyle(modifier.size, c[modifier.from] - coord[modifier.from]);
				}

				self.fireEvent('drag');
			},
			onComplete: function(el){
				self.mask.setStyle('display', 'none');
				//_log.debug('onComplete', component.main, modifier.size, size);
				//_log.debug('onComplete', modifier.size, element.getCoordinates(container)[modifier.size]);
				var coord = element.getCoordinates(container);
				var size = element.getCoordinates(container)[modifier.size];
				self.fireEvent('resizer', [component.main, modifier.size, size]);
				component.fireEvent('resizeComplete', [modifier.size, size]);

				//_log.debug('size', modifier, size);

				component[modifier.size] = size;
				
			}
		});

		return drag;
	},

	/**
	 * [_initResizerEvent description]
	 * @param  {[type]} component [description]
	 * @param  {[type]} resizer   [description]
	 * @param  {[type]} modifier  [description]
	 * @return {[type]}           [description]
	 */
	// will definitly use a controller for that
	_initResizerEvent: function(component, resizer, modifier) {
		//_log.debug('_initResizerEvent', component.options.name, component.options.last);
		var self = this;

		this.addEvents({
			drag: function(e) {
				//_log.debug('drag', e);
				self._updateSize(component, resizer, modifier);
			},
			maximize: function() {
				//_log.debug(direction);
				self._updateSize(component, resizer, modifier);
			},
			normalize: function() {
				//_log.debug(direction);
				self._updateSize(component, resizer, modifier);
			},
			resize: function() {
				//_log.debug('resize', component.element, resizer);
				
				self._updateSize(component, resizer, modifier);
			}
		});
	},

	/**
	 * [_updateSize description]
	 * @param  {[type]} component [description]
	 * @param  {[type]} resizer   [description]
	 * @param  {[type]} modifier  [description]
	 * @return {[type]}           [description]
	 */
	_updateSize: function(component, resizer, modifier) {
		//_log.debug('_updazeSize');
		var container = component.container,
			element = component.element;

		var coord = element.getCoordinates(container);
		//_log.debug('coord',  coord[modifier.from]);
		//
		// the last container doesnt need resizedr
		if (component.options.last) {
			resizer.setStyle(modifier.from, coord[modifier.from] -3);
		} else { 
			resizer.setStyle(modifier.from, coord[modifier.from] + coord[modifier.size] -3);
		}

		this.fireEvent('size');
	},

	/**
	 * Init maximisation. dblclick trigger the toggle
	 * @param  {[type]} component [description]
	 * @return {[type]}           [description]
	 */
	_initMaximize: function(component) {
		//_log.debug('_initMaximize', component);
		var self = this;
		var element = component.element;
		var container = component.container;

		if (!container) return;

		component.addEvent('max', function() {
			var name = component.options.name;

			_log.debug('max', component);
			if (element.hasClass('container-max')) {
				element.removeClass('container-max');
				container.getChildren('.ui-container').each(function(c) {
					c.setStyle('display', c.retrieve('display'));
				});

				element.setStyle('width', element.retrieve('width'));
				element.setStyle('height', element.retrieve('height'));

				self.fireEvent('normalize', component);
			} else{
				element.addClass('container-max');
				element.store('width', element.getStyle('width'));
				element.store('height', element.getStyle('height'));
				element.setStyle('width', 'initial');
				element.setStyle('height', 'initial');
				container.getChildren('.ui-container').each(function(c) {
					if (!c.hasClass('container-'+name)) {
						c.store('display', c.getStyle('display'));
						c.hide();
					}
				});

				self.fireEvent('resize', component);
			}
		});
	},


	/**
	 * [_initResize description]
	 * @return {[type]} [description]
	 */
	_initResizers: function(components) {
		//_log.debug('_initResizers');
		var len = components.length;

		// add resize Border on the right or on the bottom
		// execpt for the last one 
		for (var i = 0; i < len; i++) {
			var component = components[i];

			if (component.options.noResizer) {
				//_log.debug('--', component.main);
				continue;
			}

			this._initResizer(component);
			
		}
	},

});

module.exports = resize;

},{"elements":16,"prime-util/prime/options":73,"prime/emitter":75,"prime/index":76}],10:[function(require,module,exports){
/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Emitter = require("prime/emitter");

var binding = prime({

	mixin: [Emitter],

	/**
	 * Events communication controller
	 * Event bindings
	 * @method _initBinding
	 * @return {object}      this.bind
	 */
	_initBinding: function() {
		var binding = this.options.binding;
		//_log.debug('_initBinding', binding);

		if (!binding) return;

		var list = binding._list;

		for (var i = 0; list.length > i; i++ ) {
			var bind = binding[list[i]];
			this.binding = this.binding || {};

			this._bindObject(bind);
		}

		return this.binding;
	},

	/**
	 * Bind an object
	 * @param  {object} obj obj whit key and value to be bound
	 * @return {void}
	 */
	_bindObject: function(obj) {
		//_log.debug('_bindObject', obj);
		for (var key in obj) {
			var value = obj[key];

			if (typeof value != 'object') {
				this._bindkey(key, value);
			} else {
				this._bindList(key, value);
			}
		}
	},

	/**
	 * Bind a list of events to a specific object
	 * @param  {string} key Object path that will listen
	 * @param  {array} values List if values to bind
	 * @return {void}
	 */
	_bindList: function(key, values) {
		//_log.debug('_bindList', key, values);
		for (var i = 0; i < values.length; i++) {
			this._bindkey(key, values[i]);
		}
	},

	/**
	 * Bind to object path
	 * get the event,
	 * get the reference to the last key of the first object,
	 * check if there is a event or a mehtod to bind
	 * @param  {string} key Object path that will listen
	 * @param  {string} val Object path to be bound
	 * @return {void}
	 */
	_bindkey: function(key, val) {
		//_log.debug('_bindkey', key, val);
		var eventKeys = key.split('.');
		var ev = eventKeys[eventKeys.length - 1];

		eventKeys.pop();
		var listenerCtx = this._path(eventKeys.join('.'));

		var valKeys = val.split('.');

		//Check if it's an event
		if (valKeys[valKeys.length - 2] == 'emit') {
			var emit = valKeys[valKeys.length - 1];
			this._bindEvent(listenerCtx, ev, emit, val);
		} else {
			this._bindMethod(listenerCtx, ev, val);
		}
	},

	/**
	 * Listen to the given event and trigger another
	 * @param  {object} listenerCtx Object to listen
	 * @param  {string} ev Event that will be listened
	 * @param  {string} emit Event that will be emitted
	 * @param  {string} val Method path to be bound
	 * @return {void}
	 */
	_bindEvent: function(listenerCtx, ev, emit, val) {
		//_log.debug('_bindEvent', listenerCtx, ev, emit, val);
		var emitter = this.options.api.emit;

		var valKeys = val.split('.');
		valKeys.splice(-2, 2);

		var boundCtx = this._path(valKeys.join('.'));

		if (listenerCtx && listenerCtx.addEvent && boundCtx && boundCtx.fireEvent) {
			listenerCtx.addEvent(ev, boundCtx.fireEvent.bind(boundCtx, emit));
			// keep track of the binding
			//this.binding[key] = event;
		} else if (listenerCtx && listenerCtx.on && boundCtx && boundCtx.emit) {
			listenerCtx.on(ev, boundCtx.emit.bind(boundCtx, emit));
		} else {
			_log.debug('Missing context or method', listenerCtx, val);
		}
	},

	/**
	 * Listen to the given event and bind to the given method
	 * @param  {object} listenerCtx Object to listen
	 * @param  {string} ev Event that will be listened
	 * @param  {string} val Method path to be bound
	 * @return {void}
	 */
	_bindMethod: function(listenerCtx, ev, val) {
		//_log.debug('_bindMethod', listenerCtx, ev, val);
		var method = this._path(val);

		var valKeys = val.split('.');
		valKeys.pop();
		var boundCtx = this._path(valKeys.join('.'));

		if (listenerCtx && listenerCtx.addEvent && method) {
			listenerCtx.addEvent(ev, method.bind(boundCtx));
			// keep track of the binding
			//this.binding[key] = method;
		} else if (listenerCtx && listenerCtx.on && method) {
			listenerCtx.on(ev, method.bind(boundCtx));
		} else {
			//_log.debug('Missing context or method', listenerCtx, val);
		}
	},

	/**
	 * Return the last reference to a object
	 * @param  {string} str Object path for example key1.key2.key3
	 * @return {object}
	 */
	_path: function(str) {
		//_log.debug('_path', str);
		if (!str) return this;
		else if (!str.match(/\./)) return this[str];

		var last;

		var keys = str.split('.');
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];

			last = last || this;
			last = last[key];
		}

		return last;
	}

});

module.exports = binding;

},{"prime/emitter":75,"prime/index":76}],11:[function(require,module,exports){
/*
attributes
*/"use strict"

var $       = require("./base")

var trim    = require("mout/string/trim"),
    forEach = require("mout/array/forEach"),
    filter  = require("mout/array/filter"),
    indexOf = require("mout/array/indexOf")

// attributes

$.implement({

    setAttribute: function(name, value){
        return this.forEach(function(node){
            node.setAttribute(name, value)
        })
    },

    getAttribute: function(name){
        var attr = this[0].getAttributeNode(name)
        return (attr && attr.specified) ? attr.value : null
    },

    hasAttribute: function(name){
        var node = this[0]
        if (node.hasAttribute) return node.hasAttribute(name)
        var attr = node.getAttributeNode(name)
        return !!(attr && attr.specified)
    },

    removeAttribute: function(name){
        return this.forEach(function(node){
            var attr = node.getAttributeNode(name)
            if (attr) node.removeAttributeNode(attr)
        })
    }

})

var accessors = {}

forEach(["type", "value", "name", "href", "title", "id"], function(name){

    accessors[name] = function(value){
        return (value !== undefined) ? this.forEach(function(node){
            node[name] = value
        }) : this[0][name]
    }

})

// booleans

forEach(["checked", "disabled", "selected"], function(name){

    accessors[name] = function(value){
        return (value !== undefined) ? this.forEach(function(node){
            node[name] = !!value
        }) : !!this[0][name]
    }

})

// className

var classes = function(className){
    var classNames = trim(className).replace(/\s+/g, " ").split(" "),
        uniques    = {}

    return filter(classNames, function(className){
        if (className !== "" && !uniques[className]) return uniques[className] = className
    }).sort()
}

accessors.className = function(className){
    return (className !== undefined) ? this.forEach(function(node){
        node.className = classes(className).join(" ")
    }) : classes(this[0].className).join(" ")
}

// attribute

$.implement({

    attribute: function(name, value){
        var accessor = accessors[name]
        if (accessor) return accessor.call(this, value)
        if (value != null) return this.setAttribute(name, value)
        if (value === null) return this.removeAttribute(name)
        if (value === undefined) return this.getAttribute(name)
    }

})

$.implement(accessors)

// shortcuts

$.implement({

    check: function(){
        return this.checked(true)
    },

    uncheck: function(){
        return this.checked(false)
    },

    disable: function(){
        return this.disabled(true)
    },

    enable: function(){
        return this.disabled(false)
    },

    select: function(){
        return this.selected(true)
    },

    deselect: function(){
        return this.selected(false)
    }

})

// classNames, has / add / remove Class

$.implement({

    classNames: function(){
        return classes(this[0].className)
    },

    hasClass: function(className){
        return indexOf(this.classNames(), className) > -1
    },

    addClass: function(className){
        return this.forEach(function(node){
            var nodeClassName = node.className
            var classNames = classes(nodeClassName + " " + className).join(" ")
            if (nodeClassName !== classNames) node.className = classNames
        })
    },

    removeClass: function(className){
        return this.forEach(function(node){
            var classNames = classes(node.className)
            forEach(classes(className), function(className){
                var index = indexOf(classNames, className)
                if (index > -1) classNames.splice(index, 1)
            })
            node.className = classNames.join(" ")
        })
    },

    toggleClass: function(className, force){
        var add = force !== undefined ? force : !this.hasClass(className)
        if (add)
            this.addClass(className)
        else
            this.removeClass(className)
        return !!add
    }

})

// toString

$.prototype.toString = function(){
    var tag     = this.tag(),
        id      = this.id(),
        classes = this.classNames()

    var str = tag
    if (id) str += '#' + id
    if (classes.length) str += '.' + classes.join(".")
    return str
}

var textProperty = (document.createElement('div').textContent == null) ? 'innerText' : 'textContent'

// tag, html, text, data

$.implement({

    tag: function(){
        return this[0].tagName.toLowerCase()
    },

    html: function(html){
        return (html !== undefined) ? this.forEach(function(node){
            node.innerHTML = html
        }) : this[0].innerHTML
    },

    text: function(text){
        return (text !== undefined) ? this.forEach(function(node){
            node[textProperty] = text
        }) : this[0][textProperty]
    },

    data: function(key, value){
        switch(value) {
            case undefined: return this.getAttribute("data-" + key)
            case null: return this.removeAttribute("data-" + key)
            default: return this.setAttribute("data-" + key, value)
        }
    }

})

module.exports = $

},{"./base":12,"mout/array/filter":19,"mout/array/forEach":20,"mout/array/indexOf":21,"mout/string/trim":38}],12:[function(require,module,exports){
/*
elements
*/"use strict"

var prime   = require("prime")

var forEach = require("mout/array/forEach"),
    map     = require("mout/array/map"),
    filter  = require("mout/array/filter"),
    every   = require("mout/array/every"),
    some    = require("mout/array/some")

// uniqueID

var index = 0,
    __dc = document.__counter,
    counter = document.__counter = (__dc ? parseInt(__dc, 36) + 1 : 0).toString(36),
    key = "uid:" + counter

var uniqueID = function(n){
    if (n === window) return "window"
    if (n === document) return "document"
    if (n === document.documentElement) return "html"
    return n[key] || (n[key] = (index++).toString(36))
}

var instances = {}

// elements prime

var $ = prime({constructor: function $(n, context){

    if (n == null) return (this && this.constructor === $) ? new Elements : null

    var self, uid

    if (n.constructor !== Elements){

        self = new Elements

        if (typeof n === "string"){
            if (!self.search) return null
            self[self.length++] = context || document
            return self.search(n)
        }

        if (n.nodeType || n === window){

            self[self.length++] = n

        } else if (n.length){

            // this could be an array, or any object with a length attribute,
            // including another instance of elements from another interface.

            var uniques = {}

            for (var i = 0, l = n.length; i < l; i++){ // perform elements flattening
                var nodes = $(n[i], context)
                if (nodes && nodes.length) for (var j = 0, k = nodes.length; j < k; j++){
                    var node = nodes[j]
                    uid = uniqueID(node)
                    if (!uniques[uid]){
                        self[self.length++] = node
                        uniques[uid] = true
                    }
                }
            }

        }

    } else {
      self = n
    }

    if (!self.length) return null

    // when length is 1 always use the same elements instance

    if (self.length === 1){
        uid = uniqueID(self[0])
        return instances[uid] || (instances[uid] = self)
    }

    return self

}})

var Elements = prime({

    inherits: $,

    constructor: function Elements(){
        this.length = 0
    },

    unlink: function(){
        return this.map(function(node){
            delete instances[uniqueID(node)]
            return node
        })
    },

    // methods

    forEach: function(method, context){
        forEach(this, method, context)
        return this
    },

    map: function(method, context){
        return map(this, method, context)
    },

    filter: function(method, context){
        return filter(this, method, context)
    },

    every: function(method, context){
        return every(this, method, context)
    },

    some: function(method, context){
        return some(this, method, context)
    }

})

module.exports = $

},{"mout/array/every":18,"mout/array/filter":19,"mout/array/forEach":20,"mout/array/map":22,"mout/array/some":23,"prime":76}],13:[function(require,module,exports){
/*
delegation
*/"use strict"

var Map = require("prime/map")

var $ = require("./events")
        require('./traversal')

$.implement({

    delegate: function(event, selector, handle){

        return this.forEach(function(node){

            var self = $(node)

            var delegation = self._delegation || (self._delegation = {}),
                events     = delegation[event] || (delegation[event] = {}),
                map        = (events[selector] || (events[selector] = new Map))

            if (map.get(handle)) return

            var action = function(e){
                var target = $(e.target || e.srcElement),
                    match  = target.matches(selector) ? target : target.parent(selector)

                var res

                if (match) res = handle.call(self, e, match)

                return res
            }

            map.set(handle, action)

            self.on(event, action)

        })

    },

    undelegate: function(event, selector, handle){

        return this.forEach(function(node){

            var self = $(node), delegation, events, map

            if (!(delegation = self._delegation) || !(events = delegation[event]) || !(map = events[selector])) return;

            var action = map.get(handle)

            if (action){
                self.off(event, action)
                map.remove(action)

                // if there are no more handles in a given selector, delete it
                if (!map.count()) delete events[selector]
                // var evc = evd = 0, x
                var e1 = true, e2 = true, x
                for (x in events){
                    e1 = false
                    break
                }
                // if no more selectors in a given event type, delete it
                if (e1) delete delegation[event]
                for (x in delegation){
                    e2 = false
                    break
                }
                // if there are no more delegation events in the element, delete the _delegation object
                if (e2) delete self._delegation
            }

        })

    }

})

module.exports = $

},{"./events":15,"./traversal":42,"prime/map":77}],14:[function(require,module,exports){
/*
domready
*/"use strict"

var $ = require("./events")

var readystatechange = 'onreadystatechange' in document,
    shouldPoll       = false,
    loaded           = false,
    readys           = [],
    checks           = [],
    ready            = null,
    timer            = null,
    test             = document.createElement('div'),
    doc              = $(document),
    win              = $(window)

var domready = function(){

    if (timer) timer = clearTimeout(timer)

    if (!loaded){

        if (readystatechange) doc.off('readystatechange', check)
        doc.off('DOMContentLoaded', domready)
        win.off('load', domready)

        loaded = true

        for (var i = 0; ready = readys[i++];) ready()
    }

    return loaded

}

var check = function(){
    for (var i = checks.length; i--;) if (checks[i]()) return domready()
    return false
}

var poll = function(){
    clearTimeout(timer)
    if (!check()) timer = setTimeout(poll, 1e3 / 60)
}

if (document.readyState){ // use readyState if available

    var complete = function(){
        return !!(/loaded|complete/).test(document.readyState)
    }

    checks.push(complete)

    if (!complete()){ // unless dom is already loaded
        if (readystatechange) doc.on('readystatechange', check) // onreadystatechange event
        else shouldPoll = true //or poll readyState check
    } else { // dom is already loaded
        domready()
    }

}

if (test.doScroll){ // also use doScroll if available (doscroll comes before readyState "complete")

    // LEGAL DEPT:
    // doScroll technique discovered by, owned by, and copyrighted to Diego Perini http://javascript.nwbox.com/IEContentLoaded/

    // testElement.doScroll() throws when the DOM is not ready, only in the top window

    var scrolls = function(){
        try {
            test.doScroll()
            return true
        } catch (e){}
        return false
    }

    // If doScroll works already, it can't be used to determine domready
    // e.g. in an iframe

    if (!scrolls()){
        checks.push(scrolls)
        shouldPoll = true
    }

}

if (shouldPoll) poll()

// make sure that domready fires before load, also if not onreadystatechange and doScroll and DOMContentLoaded load will fire
doc.on('DOMContentLoaded', domready)
win.on('load', domready)

module.exports = function(ready){
    (loaded) ? ready() : readys.push(ready)
    return null
}

},{"./events":15}],15:[function(require,module,exports){
/*
events
*/"use strict"

var Emitter = require("prime/emitter")

var $ = require("./base")

var html = document.documentElement

var addEventListener = html.addEventListener ? function(node, event, handle, useCapture){
    node.addEventListener(event, handle, useCapture || false)
    return handle
} : function(node, event, handle){
    node.attachEvent('on' + event, handle)
    return handle
}

var removeEventListener = html.removeEventListener ? function(node, event, handle, useCapture){
    node.removeEventListener(event, handle, useCapture || false)
} : function(node, event, handle){
    node.detachEvent("on" + event, handle)
}

$.implement({

    on: function(event, handle, useCapture){

        return this.forEach(function(node){
            var self = $(node)

            var internalEvent = event + (useCapture ? ":capture" : "")

            Emitter.prototype.on.call(self, internalEvent, handle)

            var domListeners = self._domListeners || (self._domListeners = {})
            if (!domListeners[internalEvent]) domListeners[internalEvent] = addEventListener(node, event, function(e){
                Emitter.prototype.emit.call(self, internalEvent, e || window.event, Emitter.EMIT_SYNC)
            }, useCapture)
        })
    },

    off: function(event, handle, useCapture){

        return this.forEach(function(node){

            var self = $(node)

            var internalEvent = event + (useCapture ? ":capture" : "")

            var domListeners = self._domListeners, domEvent, listeners = self._listeners, events

            if (domListeners && (domEvent = domListeners[internalEvent]) && listeners && (events = listeners[internalEvent])){

                Emitter.prototype.off.call(self, internalEvent, handle)

                if (!self._listeners || !self._listeners[event]){
                    removeEventListener(node, event, domEvent)
                    delete domListeners[event]

                    for (var l in domListeners) return
                    delete self._domListeners
                }

            }
        })
    },

    emit: function(){
        var args = arguments
        return this.forEach(function(node){
            Emitter.prototype.emit.apply($(node), args)
        })
    }

})

module.exports = $

},{"./base":12,"prime/emitter":75}],16:[function(require,module,exports){
/*
elements
*/"use strict"

var $ = require("./base")
        require("./attributes")
        require("./events")
        require("./insertion")
        require("./traversal")
        require("./delegation")

module.exports = $

},{"./attributes":11,"./base":12,"./delegation":13,"./events":15,"./insertion":17,"./traversal":42}],17:[function(require,module,exports){
/*
insertion
*/"use strict"

var $ = require("./base")

// base insertion

$.implement({

    appendChild: function(child){
        this[0].appendChild($(child)[0])
        return this
    },

    insertBefore: function(child, ref){
        this[0].insertBefore($(child)[0], $(ref)[0])
        return this
    },

    removeChild: function(child){
        this[0].removeChild($(child)[0])
        return this
    },

    replaceChild: function(child, ref){
        this[0].replaceChild($(child)[0], $(ref)[0])
        return this
    }

})

// before, after, bottom, top

$.implement({

    before: function(element){
        element = $(element)[0]
        var parent = element.parentNode
        if (parent) this.forEach(function(node){
            parent.insertBefore(node, element)
        })
        return this
    },

    after: function(element){
        element = $(element)[0]
        var parent = element.parentNode
        if (parent) this.forEach(function(node){
            parent.insertBefore(node, element.nextSibling)
        })
        return this
    },

    bottom: function(element){
        element = $(element)[0]
        return this.forEach(function(node){
            element.appendChild(node)
        })
    },

    top: function(element){
        element = $(element)[0]
        return this.forEach(function(node){
            element.insertBefore(node, element.firstChild)
        })
    }

})

// insert, replace

$.implement({

    insert: $.prototype.bottom,

    remove: function(){
        return this.forEach(function(node){
            var parent = node.parentNode
            if (parent) parent.removeChild(node)
        })
    },

    replace: function(element){
        element = $(element)[0]
        element.parentNode.replaceChild(this[0], element)
        return this
    }

})

module.exports = $

},{"./base":12}],18:[function(require,module,exports){
var makeIterator = require('../function/makeIterator_');

    /**
     * Array every
     */
    function every(arr, callback, thisObj) {
        callback = makeIterator(callback, thisObj);
        var result = true;
        if (arr == null) {
            return result;
        }

        var i = -1, len = arr.length;
        while (++i < len) {
            // we iterate over sparse items since there is no way to make it
            // work properly on IE 7-8. see #64
            if (!callback(arr[i], i, arr) ) {
                result = false;
                break;
            }
        }

        return result;
    }

    module.exports = every;


},{"../function/makeIterator_":25}],19:[function(require,module,exports){
var makeIterator = require('../function/makeIterator_');

    /**
     * Array filter
     */
    function filter(arr, callback, thisObj) {
        callback = makeIterator(callback, thisObj);
        var results = [];
        if (arr == null) {
            return results;
        }

        var i = -1, len = arr.length, value;
        while (++i < len) {
            value = arr[i];
            if (callback(value, i, arr)) {
                results.push(value);
            }
        }

        return results;
    }

    module.exports = filter;



},{"../function/makeIterator_":25}],20:[function(require,module,exports){


    /**
     * Array forEach
     */
    function forEach(arr, callback, thisObj) {
        if (arr == null) {
            return;
        }
        var i = -1,
            len = arr.length;
        while (++i < len) {
            // we iterate over sparse items since there is no way to make it
            // work properly on IE 7-8. see #64
            if ( callback.call(thisObj, arr[i], i, arr) === false ) {
                break;
            }
        }
    }

    module.exports = forEach;



},{}],21:[function(require,module,exports){


    /**
     * Array.indexOf
     */
    function indexOf(arr, item, fromIndex) {
        fromIndex = fromIndex || 0;
        if (arr == null) {
            return -1;
        }

        var len = arr.length,
            i = fromIndex < 0 ? len + fromIndex : fromIndex;
        while (i < len) {
            // we iterate over sparse items since there is no way to make it
            // work properly on IE 7-8. see #64
            if (arr[i] === item) {
                return i;
            }

            i++;
        }

        return -1;
    }

    module.exports = indexOf;


},{}],22:[function(require,module,exports){
var makeIterator = require('../function/makeIterator_');

    /**
     * Array map
     */
    function map(arr, callback, thisObj) {
        callback = makeIterator(callback, thisObj);
        var results = [];
        if (arr == null){
            return results;
        }

        var i = -1, len = arr.length;
        while (++i < len) {
            results[i] = callback(arr[i], i, arr);
        }

        return results;
    }

     module.exports = map;


},{"../function/makeIterator_":25}],23:[function(require,module,exports){
var makeIterator = require('../function/makeIterator_');

    /**
     * Array some
     */
    function some(arr, callback, thisObj) {
        callback = makeIterator(callback, thisObj);
        var result = false;
        if (arr == null) {
            return result;
        }

        var i = -1, len = arr.length;
        while (++i < len) {
            // we iterate over sparse items since there is no way to make it
            // work properly on IE 7-8. see #64
            if ( callback(arr[i], i, arr) ) {
                result = true;
                break;
            }
        }

        return result;
    }

    module.exports = some;


},{"../function/makeIterator_":25}],24:[function(require,module,exports){


    /**
     * Returns the first argument provided to it.
     */
    function identity(val){
        return val;
    }

    module.exports = identity;



},{}],25:[function(require,module,exports){
var identity = require('./identity');
var prop = require('./prop');
var deepMatches = require('../object/deepMatches');

    /**
     * Converts argument into a valid iterator.
     * Used internally on most array/object/collection methods that receives a
     * callback/iterator providing a shortcut syntax.
     */
    function makeIterator(src, thisObj){
        if (src == null) {
            return identity;
        }
        switch(typeof src) {
            case 'function':
                // function is the first to improve perf (most common case)
                // also avoid using `Function#call` if not needed, which boosts
                // perf a lot in some cases
                return (typeof thisObj !== 'undefined')? function(val, i, arr){
                    return src.call(thisObj, val, i, arr);
                } : src;
            case 'object':
                return function(val){
                    return deepMatches(val, src);
                };
            case 'string':
            case 'number':
                return prop(src);
        }
    }

    module.exports = makeIterator;



},{"../object/deepMatches":31,"./identity":24,"./prop":26}],26:[function(require,module,exports){


    /**
     * Returns a function that gets a property of the passed object
     */
    function prop(name){
        return function(obj){
            return obj[name];
        };
    }

    module.exports = prop;



},{}],27:[function(require,module,exports){
var isKind = require('./isKind');
    /**
     */
    var isArray = Array.isArray || function (val) {
        return isKind(val, 'Array');
    };
    module.exports = isArray;


},{"./isKind":28}],28:[function(require,module,exports){
var kindOf = require('./kindOf');
    /**
     * Check if value is from a specific "kind".
     */
    function isKind(val, kind){
        return kindOf(val) === kind;
    }
    module.exports = isKind;


},{"./kindOf":29}],29:[function(require,module,exports){


    var _rKind = /^\[object (.*)\]$/,
        _toString = Object.prototype.toString,
        UNDEF;

    /**
     * Gets the "kind" of value. (e.g. "String", "Number", etc)
     */
    function kindOf(val) {
        if (val === null) {
            return 'Null';
        } else if (val === UNDEF) {
            return 'Undefined';
        } else {
            return _rKind.exec( _toString.call(val) )[1];
        }
    }
    module.exports = kindOf;


},{}],30:[function(require,module,exports){


    /**
     * Typecast a value to a String, using an empty string value for null or
     * undefined.
     */
    function toString(val){
        return val == null ? '' : val.toString();
    }

    module.exports = toString;



},{}],31:[function(require,module,exports){
var forOwn = require('./forOwn');
var isArray = require('../lang/isArray');

    function containsMatch(array, pattern) {
        var i = -1, length = array.length;
        while (++i < length) {
            if (deepMatches(array[i], pattern)) {
                return true;
            }
        }

        return false;
    }

    function matchArray(target, pattern) {
        var i = -1, patternLength = pattern.length;
        while (++i < patternLength) {
            if (!containsMatch(target, pattern[i])) {
                return false;
            }
        }

        return true;
    }

    function matchObject(target, pattern) {
        var result = true;
        forOwn(pattern, function(val, key) {
            if (!deepMatches(target[key], val)) {
                // Return false to break out of forOwn early
                return (result = false);
            }
        });

        return result;
    }

    /**
     * Recursively check if the objects match.
     */
    function deepMatches(target, pattern){
        if (target && typeof target === 'object') {
            if (isArray(target) && isArray(pattern)) {
                return matchArray(target, pattern);
            } else {
                return matchObject(target, pattern);
            }
        } else {
            return target === pattern;
        }
    }

    module.exports = deepMatches;



},{"../lang/isArray":27,"./forOwn":33}],32:[function(require,module,exports){
var hasOwn = require('./hasOwn');

    var _hasDontEnumBug,
        _dontEnums;

    function checkDontEnum(){
        _dontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
            ];

        _hasDontEnumBug = true;

        for (var key in {'toString': null}) {
            _hasDontEnumBug = false;
        }
    }

    /**
     * Similar to Array/forEach but works over object properties and fixes Don't
     * Enum bug on IE.
     * based on: http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
     */
    function forIn(obj, fn, thisObj){
        var key, i = 0;
        // no need to check if argument is a real object that way we can use
        // it for arrays, functions, date, etc.

        //post-pone check till needed
        if (_hasDontEnumBug == null) checkDontEnum();

        for (key in obj) {
            if (exec(fn, obj, key, thisObj) === false) {
                break;
            }
        }


        if (_hasDontEnumBug) {
            var ctor = obj.constructor,
                isProto = !!ctor && obj === ctor.prototype;

            while (key = _dontEnums[i++]) {
                // For constructor, if it is a prototype object the constructor
                // is always non-enumerable unless defined otherwise (and
                // enumerated above).  For non-prototype objects, it will have
                // to be defined on this object, since it cannot be defined on
                // any prototype objects.
                //
                // For other [[DontEnum]] properties, check if the value is
                // different than Object prototype value.
                if (
                    (key !== 'constructor' ||
                        (!isProto && hasOwn(obj, key))) &&
                    obj[key] !== Object.prototype[key]
                ) {
                    if (exec(fn, obj, key, thisObj) === false) {
                        break;
                    }
                }
            }
        }
    }

    function exec(fn, obj, key, thisObj){
        return fn.call(thisObj, obj[key], key, obj);
    }

    module.exports = forIn;



},{"./hasOwn":34}],33:[function(require,module,exports){
var hasOwn = require('./hasOwn');
var forIn = require('./forIn');

    /**
     * Similar to Array/forEach but works over object properties and fixes Don't
     * Enum bug on IE.
     * based on: http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
     */
    function forOwn(obj, fn, thisObj){
        forIn(obj, function(val, key){
            if (hasOwn(obj, key)) {
                return fn.call(thisObj, obj[key], key, obj);
            }
        });
    }

    module.exports = forOwn;



},{"./forIn":32,"./hasOwn":34}],34:[function(require,module,exports){


    /**
     * Safer Object.hasOwnProperty
     */
     function hasOwn(obj, prop){
         return Object.prototype.hasOwnProperty.call(obj, prop);
     }

     module.exports = hasOwn;



},{}],35:[function(require,module,exports){

    /**
     * Contains all Unicode white-spaces. Taken from
     * http://en.wikipedia.org/wiki/Whitespace_character.
     */
    module.exports = [
        ' ', '\n', '\r', '\t', '\f', '\v', '\u00A0', '\u1680', '\u180E',
        '\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005', '\u2006',
        '\u2007', '\u2008', '\u2009', '\u200A', '\u2028', '\u2029', '\u202F',
        '\u205F', '\u3000'
    ];


},{}],36:[function(require,module,exports){
var toString = require('../lang/toString');
var WHITE_SPACES = require('./WHITE_SPACES');
    /**
     * Remove chars from beginning of string.
     */
    function ltrim(str, chars) {
        str = toString(str);
        chars = chars || WHITE_SPACES;

        var start = 0,
            len = str.length,
            charLen = chars.length,
            found = true,
            i, c;

        while (found && start < len) {
            found = false;
            i = -1;
            c = str.charAt(start);

            while (++i < charLen) {
                if (c === chars[i]) {
                    found = true;
                    start++;
                    break;
                }
            }
        }

        return (start >= len) ? '' : str.substr(start, len);
    }

    module.exports = ltrim;


},{"../lang/toString":30,"./WHITE_SPACES":35}],37:[function(require,module,exports){
var toString = require('../lang/toString');
var WHITE_SPACES = require('./WHITE_SPACES');
    /**
     * Remove chars from end of string.
     */
    function rtrim(str, chars) {
        str = toString(str);
        chars = chars || WHITE_SPACES;

        var end = str.length - 1,
            charLen = chars.length,
            found = true,
            i, c;

        while (found && end >= 0) {
            found = false;
            i = -1;
            c = str.charAt(end);

            while (++i < charLen) {
                if (c === chars[i]) {
                    found = true;
                    end--;
                    break;
                }
            }
        }

        return (end >= 0) ? str.substring(0, end + 1) : '';
    }

    module.exports = rtrim;


},{"../lang/toString":30,"./WHITE_SPACES":35}],38:[function(require,module,exports){
var toString = require('../lang/toString');
var WHITE_SPACES = require('./WHITE_SPACES');
var ltrim = require('./ltrim');
var rtrim = require('./rtrim');
    /**
     * Remove white-spaces from beginning and end of string.
     */
    function trim(str, chars) {
        str = toString(str);
        chars = chars || WHITE_SPACES;
        return ltrim(rtrim(str, chars), chars);
    }

    module.exports = trim;


},{"../lang/toString":30,"./WHITE_SPACES":35,"./ltrim":36,"./rtrim":37}],39:[function(require,module,exports){
/*
Slick Finder
*/"use strict"

// Notable changes from Slick.Finder 1.0.x

// faster bottom -> up expression matching
// prefers mental sanity over *obsessive compulsive* milliseconds savings
// uses prototypes instead of objects
// tries to use matchesSelector smartly, whenever available
// can populate objects as well as arrays
// lots of stuff is broken or not implemented

var parse = require("./parser")

// utilities

var index = 0,
    counter = document.__counter = (parseInt(document.__counter || -1, 36) + 1).toString(36),
    key = "uid:" + counter

var uniqueID = function(n, xml){
    if (n === window) return "window"
    if (n === document) return "document"
    if (n === document.documentElement) return "html"

    if (xml) {
        var uid = n.getAttribute(key)
        if (!uid) {
            uid = (index++).toString(36)
            n.setAttribute(key, uid)
        }
        return uid
    } else {
        return n[key] || (n[key] = (index++).toString(36))
    }
}

var uniqueIDXML = function(n) {
    return uniqueID(n, true)
}

var isArray = Array.isArray || function(object){
    return Object.prototype.toString.call(object) === "[object Array]"
}

// tests

var uniqueIndex = 0;

var HAS = {

    GET_ELEMENT_BY_ID: function(test, id){
        id = "slick_" + (uniqueIndex++);
        // checks if the document has getElementById, and it works
        test.innerHTML = '<a id="' + id + '"></a>'
        return !!this.getElementById(id)
    },

    QUERY_SELECTOR: function(test){
        // this supposedly fixes a webkit bug with matchesSelector / querySelector & nth-child
        test.innerHTML = '_<style>:nth-child(2){}</style>'

        // checks if the document has querySelectorAll, and it works
        test.innerHTML = '<a class="MiX"></a>'

        return test.querySelectorAll('.MiX').length === 1
    },

    EXPANDOS: function(test, id){
        id = "slick_" + (uniqueIndex++);
        // checks if the document has elements that support expandos
        test._custom_property_ = id
        return test._custom_property_ === id
    },

    // TODO: use this ?

    // CHECKED_QUERY_SELECTOR: function(test){
    //
    //     // checks if the document supports the checked query selector
    //     test.innerHTML = '<select><option selected="selected">a</option></select>'
    //     return test.querySelectorAll(':checked').length === 1
    // },

    // TODO: use this ?

    // EMPTY_ATTRIBUTE_QUERY_SELECTOR: function(test){
    //
    //     // checks if the document supports the empty attribute query selector
    //     test.innerHTML = '<a class=""></a>'
    //     return test.querySelectorAll('[class*=""]').length === 1
    // },

    MATCHES_SELECTOR: function(test){

        test.className = "MiX"

        // checks if the document has matchesSelector, and we can use it.

        var matches = test.matchesSelector || test.mozMatchesSelector || test.webkitMatchesSelector

        // if matchesSelector trows errors on incorrect syntax we can use it
        if (matches) try {
            matches.call(test, ':slick')
        } catch(e){
            // just as a safety precaution, also test if it works on mixedcase (like querySelectorAll)
            return matches.call(test, ".MiX") ? matches : false
        }

        return false
    },

    GET_ELEMENTS_BY_CLASS_NAME: function(test){
        test.innerHTML = '<a class="f"></a><a class="b"></a>'
        if (test.getElementsByClassName('b').length !== 1) return false

        test.firstChild.className = 'b'
        if (test.getElementsByClassName('b').length !== 2) return false

        // Opera 9.6 getElementsByClassName doesnt detects the class if its not the first one
        test.innerHTML = '<a class="a"></a><a class="f b a"></a>'
        if (test.getElementsByClassName('a').length !== 2) return false

        // tests passed
        return true
    },

    // no need to know

    // GET_ELEMENT_BY_ID_NOT_NAME: function(test, id){
    //     test.innerHTML = '<a name="'+ id +'"></a><b id="'+ id +'"></b>'
    //     return this.getElementById(id) !== test.firstChild
    // },

    // this is always checked for and fixed

    // STAR_GET_ELEMENTS_BY_TAG_NAME: function(test){
    //
    //     // IE returns comment nodes for getElementsByTagName('*') for some documents
    //     test.appendChild(this.createComment(''))
    //     if (test.getElementsByTagName('*').length > 0) return false
    //
    //     // IE returns closed nodes (EG:"</foo>") for getElementsByTagName('*') for some documents
    //     test.innerHTML = 'foo</foo>'
    //     if (test.getElementsByTagName('*').length) return false
    //
    //     // tests passed
    //     return true
    // },

    // this is always checked for and fixed

    // STAR_QUERY_SELECTOR: function(test){
    //
    //     // returns closed nodes (EG:"</foo>") for querySelector('*') for some documents
    //     test.innerHTML = 'foo</foo>'
    //     return !!(test.querySelectorAll('*').length)
    // },

    GET_ATTRIBUTE: function(test){
        // tests for working getAttribute implementation
        var shout = "fus ro dah"
        test.innerHTML = '<a class="' + shout + '"></a>'
        return test.firstChild.getAttribute('class') === shout
    }

}

// Finder

var Finder = function Finder(document){

    this.document        = document
    var root = this.root = document.documentElement
    this.tested          = {}

    // uniqueID

    this.uniqueID = this.has("EXPANDOS") ? uniqueID : uniqueIDXML

    // getAttribute

    this.getAttribute = (this.has("GET_ATTRIBUTE")) ? function(node, name){

        return node.getAttribute(name)

    } : function(node, name){

        node = node.getAttributeNode(name)
        return (node && node.specified) ? node.value : null

    }

    // hasAttribute

    this.hasAttribute = (root.hasAttribute) ? function(node, attribute){

        return node.hasAttribute(attribute)

    } : function(node, attribute) {

        node = node.getAttributeNode(attribute)
        return !!(node && node.specified)

    }

    // contains

    this.contains = (document.contains && root.contains) ? function(context, node){

        return context.contains(node)

    } : (root.compareDocumentPosition) ? function(context, node){

        return context === node || !!(context.compareDocumentPosition(node) & 16)

    } : function(context, node){

        do {
            if (node === context) return true
        } while ((node = node.parentNode))

        return false
    }

    // sort
    // credits to Sizzle (http://sizzlejs.com/)

    this.sorter = (root.compareDocumentPosition) ? function(a, b){

        if (!a.compareDocumentPosition || !b.compareDocumentPosition) return 0
        return a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1

    } : ('sourceIndex' in root) ? function(a, b){

        if (!a.sourceIndex || !b.sourceIndex) return 0
        return a.sourceIndex - b.sourceIndex

    } : (document.createRange) ? function(a, b){

        if (!a.ownerDocument || !b.ownerDocument) return 0
        var aRange = a.ownerDocument.createRange(),
            bRange = b.ownerDocument.createRange()

        aRange.setStart(a, 0)
        aRange.setEnd(a, 0)
        bRange.setStart(b, 0)
        bRange.setEnd(b, 0)
        return aRange.compareBoundaryPoints(Range.START_TO_END, bRange)

    } : null

    this.failed = {}

    var nativeMatches = this.has("MATCHES_SELECTOR")

    if (nativeMatches) this.matchesSelector = function(node, expression){

        if (this.failed[expression]) return null

        try {
            return nativeMatches.call(node, expression)
        } catch(e){
            if (slick.debug) console.warn("matchesSelector failed on " + expression)
            this.failed[expression] = true
            return null
        }

    }

    if (this.has("QUERY_SELECTOR")){

        this.querySelectorAll = function(node, expression){

            if (this.failed[expression]) return true

            var result, _id, _expression, _combinator, _node


            // non-document rooted QSA
            // credits to Andrew Dupont

            if (node !== this.document){

                _combinator = expression[0].combinator

                _id         = node.getAttribute("id")
                _expression = expression

                if (!_id){
                    _node = node
                    _id = "__slick__"
                    _node.setAttribute("id", _id)
                }

                expression = "#" + _id + " " + _expression


                // these combinators need a parentNode due to how querySelectorAll works, which is:
                // finding all the elements that match the given selector
                // then filtering by the ones that have the specified element as an ancestor
                if (_combinator.indexOf("~") > -1 || _combinator.indexOf("+") > -1){

                    node = node.parentNode
                    if (!node) result = true
                    // if node has no parentNode, we return "true" as if it failed, without polluting the failed cache

                }

            }

            if (!result) try {
                result = node.querySelectorAll(expression.toString())
            } catch(e){
                if (slick.debug) console.warn("querySelectorAll failed on " + (_expression || expression))
                result = this.failed[_expression || expression] = true
            }

            if (_node) _node.removeAttribute("id")

            return result

        }

    }

}

Finder.prototype.has = function(FEATURE){

    var tested        = this.tested,
        testedFEATURE = tested[FEATURE]

    if (testedFEATURE != null) return testedFEATURE

    var root     = this.root,
        document = this.document,
        testNode = document.createElement("div")

    testNode.setAttribute("style", "display: none;")

    root.appendChild(testNode)

    var TEST = HAS[FEATURE], result = false

    if (TEST) try {
        result = TEST.call(document, testNode)
    } catch(e){}

    if (slick.debug && !result) console.warn("document has no " + FEATURE)

    root.removeChild(testNode)

    return tested[FEATURE] = result

}

var combinators = {

    " ": function(node, part, push){

        var item, items

        var noId = !part.id, noTag = !part.tag, noClass = !part.classes

        if (part.id && node.getElementById && this.has("GET_ELEMENT_BY_ID")){
            item = node.getElementById(part.id)

            // return only if id is found, else keep checking
            // might be a tad slower on non-existing ids, but less insane

            if (item && item.getAttribute('id') === part.id){
                items = [item]
                noId = true
                // if tag is star, no need to check it in match()
                if (part.tag === "*") noTag = true
            }
        }

        if (!items){

            if (part.classes && node.getElementsByClassName && this.has("GET_ELEMENTS_BY_CLASS_NAME")){
                items = node.getElementsByClassName(part.classList)
                noClass = true
                // if tag is star, no need to check it in match()
                if (part.tag === "*") noTag = true
            } else {
                items = node.getElementsByTagName(part.tag)
                // if tag is star, need to check it in match because it could select junk, boho
                if (part.tag !== "*") noTag = true
            }

            if (!items || !items.length) return false

        }

        for (var i = 0; item = items[i++];)
            if ((noTag && noId && noClass && !part.attributes && !part.pseudos) || this.match(item, part, noTag, noId, noClass))
                push(item)

        return true

    },

    ">": function(node, part, push){ // direct children
        if ((node = node.firstChild)) do {
            if (node.nodeType == 1 && this.match(node, part)) push(node)
        } while ((node = node.nextSibling))
    },

    "+": function(node, part, push){ // next sibling
        while ((node = node.nextSibling)) if (node.nodeType == 1){
            if (this.match(node, part)) push(node)
            break
        }
    },

    "^": function(node, part, push){ // first child
        node = node.firstChild
        if (node){
            if (node.nodeType === 1){
                if (this.match(node, part)) push(node)
            } else {
                combinators['+'].call(this, node, part, push)
            }
        }
    },

    "~": function(node, part, push){ // next siblings
        while ((node = node.nextSibling)){
            if (node.nodeType === 1 && this.match(node, part)) push(node)
        }
    },

    "++": function(node, part, push){ // next sibling and previous sibling
        combinators['+'].call(this, node, part, push)
        combinators['!+'].call(this, node, part, push)
    },

    "~~": function(node, part, push){ // next siblings and previous siblings
        combinators['~'].call(this, node, part, push)
        combinators['!~'].call(this, node, part, push)
    },

    "!": function(node, part, push){ // all parent nodes up to document
        while ((node = node.parentNode)) if (node !== this.document && this.match(node, part)) push(node)
    },

    "!>": function(node, part, push){ // direct parent (one level)
        node = node.parentNode
        if (node !== this.document && this.match(node, part)) push(node)
    },

    "!+": function(node, part, push){ // previous sibling
        while ((node = node.previousSibling)) if (node.nodeType == 1){
            if (this.match(node, part)) push(node)
            break
        }
    },

    "!^": function(node, part, push){ // last child
        node = node.lastChild
        if (node){
            if (node.nodeType == 1){
                if (this.match(node, part)) push(node)
            } else {
                combinators['!+'].call(this, node, part, push)
            }
        }
    },

    "!~": function(node, part, push){ // previous siblings
        while ((node = node.previousSibling)){
            if (node.nodeType === 1 && this.match(node, part)) push(node)
        }
    }

}

Finder.prototype.search = function(context, expression, found){

    if (!context) context = this.document
    else if (!context.nodeType && context.document) context = context.document

    var expressions = parse(expression)

    // no expressions were parsed. todo: is this really necessary?
    if (!expressions || !expressions.length) throw new Error("invalid expression")

    if (!found) found = []

    var uniques, push = isArray(found) ? function(node){
        found[found.length] = node
    } : function(node){
        found[found.length++] = node
    }

    // if there is more than one expression we need to check for duplicates when we push to found
    // this simply saves the old push and wraps it around an uid dupe check.
    if (expressions.length > 1){
        uniques = {}
        var plush = push
        push = function(node){
            var uid = uniqueID(node)
            if (!uniques[uid]){
                uniques[uid] = true
                plush(node)
            }
        }
    }

    // walker

    var node, nodes, part

    main: for (var i = 0; expression = expressions[i++];){

        // querySelector

        // TODO: more functional tests

        // if there is querySelectorAll (and the expression does not fail) use it.
        if (!slick.noQSA && this.querySelectorAll){

            nodes = this.querySelectorAll(context, expression)
            if (nodes !== true){
                if (nodes && nodes.length) for (var j = 0; node = nodes[j++];) if (node.nodeName > '@'){
                    push(node)
                }
                continue main
            }
        }

        // if there is only one part in the expression we don't need to check each part for duplicates.
        // todo: this might be too naive. while solid, there can be expression sequences that do not
        // produce duplicates. "body div" for instance, can never give you each div more than once.
        // "body div a" on the other hand might.
        if (expression.length === 1){

            part = expression[0]
            combinators[part.combinator].call(this, context, part, push)

        } else {

            var cs = [context], c, f, u, p = function(node){
                var uid = uniqueID(node)
                if (!u[uid]){
                    u[uid] = true
                    f[f.length] = node
                }
            }

            // loop the expression parts
            for (var j = 0; part = expression[j++];){
                f = []; u = {}
                // loop the contexts
                for (var k = 0; c = cs[k++];) combinators[part.combinator].call(this, c, part, p)
                // nothing was found, the expression failed, continue to the next expression.
                if (!f.length) continue main
                cs = f // set the contexts for future parts (if any)
            }

            if (i === 0) found = f // first expression. directly set found.
            else for (var l = 0; l < f.length; l++) push(f[l]) // any other expression needs to push to found.
        }

    }

    if (uniques && found && found.length > 1) this.sort(found)

    return found

}

Finder.prototype.sort = function(nodes){
    return this.sorter ? Array.prototype.sort.call(nodes, this.sorter) : nodes
}

// TODO: most of these pseudo selectors include <html> and qsa doesnt. fixme.

var pseudos = {


    // TODO: returns different results than qsa empty.

    'empty': function(){
        return !(this && this.nodeType === 1) && !(this.innerText || this.textContent || '').length
    },

    'not': function(expression){
        return !slick.matches(this, expression)
    },

    'contains': function(text){
        return (this.innerText || this.textContent || '').indexOf(text) > -1
    },

    'first-child': function(){
        var node = this
        while ((node = node.previousSibling)) if (node.nodeType == 1) return false
        return true
    },

    'last-child': function(){
        var node = this
        while ((node = node.nextSibling)) if (node.nodeType == 1) return false
        return true
    },

    'only-child': function(){
        var prev = this
        while ((prev = prev.previousSibling)) if (prev.nodeType == 1) return false

        var next = this
        while ((next = next.nextSibling)) if (next.nodeType == 1) return false

        return true
    },

    'first-of-type': function(){
        var node = this, nodeName = node.nodeName
        while ((node = node.previousSibling)) if (node.nodeName == nodeName) return false
        return true
    },

    'last-of-type': function(){
        var node = this, nodeName = node.nodeName
        while ((node = node.nextSibling)) if (node.nodeName == nodeName) return false
        return true
    },

    'only-of-type': function(){
        var prev = this, nodeName = this.nodeName
        while ((prev = prev.previousSibling)) if (prev.nodeName == nodeName) return false
        var next = this
        while ((next = next.nextSibling)) if (next.nodeName == nodeName) return false
        return true
    },

    'enabled': function(){
        return !this.disabled
    },

    'disabled': function(){
        return this.disabled
    },

    'checked': function(){
        return this.checked || this.selected
    },

    'selected': function(){
        return this.selected
    },

    'focus': function(){
        var doc = this.ownerDocument
        return doc.activeElement === this && (this.href || this.type || slick.hasAttribute(this, 'tabindex'))
    },

    'root': function(){
        return (this === this.ownerDocument.documentElement)
    }

}

Finder.prototype.match = function(node, bit, noTag, noId, noClass){

    // TODO: more functional tests ?

    if (!slick.noQSA && this.matchesSelector){
        var matches = this.matchesSelector(node, bit)
        if (matches !== null) return matches
    }

    // normal matching

    if (!noTag && bit.tag){

        var nodeName = node.nodeName.toLowerCase()
        if (bit.tag === "*"){
            if (nodeName < "@") return false
        } else if (nodeName != bit.tag){
            return false
        }

    }

    if (!noId && bit.id && node.getAttribute('id') !== bit.id) return false

    var i, part

    if (!noClass && bit.classes){

        var className = this.getAttribute(node, "class")
        if (!className) return false

        for (part in bit.classes) if (!RegExp('(^|\\s)' + bit.classes[part] + '(\\s|$)').test(className)) return false
    }

    var name, value

    if (bit.attributes) for (i = 0; part = bit.attributes[i++];){

        var operator  = part.operator,
            escaped   = part.escapedValue

        name  = part.name
        value = part.value

        if (!operator){

            if (!this.hasAttribute(node, name)) return false

        } else {

            var actual = this.getAttribute(node, name)
            if (actual == null) return false

            switch (operator){
                case '^=' : if (!RegExp(      '^' + escaped            ).test(actual)) return false; break
                case '$=' : if (!RegExp(            escaped + '$'      ).test(actual)) return false; break
                case '~=' : if (!RegExp('(^|\\s)' + escaped + '(\\s|$)').test(actual)) return false; break
                case '|=' : if (!RegExp(      '^' + escaped + '(-|$)'  ).test(actual)) return false; break

                case '='  : if (actual !== value) return false; break
                case '*=' : if (actual.indexOf(value) === -1) return false; break
                default   : return false
            }

        }
    }

    if (bit.pseudos) for (i = 0; part = bit.pseudos[i++];){

        name  = part.name
        value = part.value

        if (pseudos[name]) return pseudos[name].call(node, value)

        if (value != null){
            if (this.getAttribute(node, name) !== value) return false
        } else {
            if (!this.hasAttribute(node, name)) return false
        }

    }

    return true

}

Finder.prototype.matches = function(node, expression){

    var expressions = parse(expression)

    if (expressions.length === 1 && expressions[0].length === 1){ // simplest match
        return this.match(node, expressions[0][0])
    }

    // TODO: more functional tests ?

    if (!slick.noQSA && this.matchesSelector){
        var matches = this.matchesSelector(node, expressions)
        if (matches !== null) return matches
    }

    var nodes = this.search(this.document, expression, {length: 0})

    for (var i = 0, res; res = nodes[i++];) if (node === res) return true
    return false

}

var finders = {}

var finder = function(context){
    var doc = context || document
    if (doc.ownerDocument) doc = doc.ownerDocument
    else if (doc.document) doc = doc.document

    if (doc.nodeType !== 9) throw new TypeError("invalid document")

    var uid = uniqueID(doc)
    return finders[uid] || (finders[uid] = new Finder(doc))
}

// ... API ...

var slick = function(expression, context){
    return slick.search(expression, context)
}

slick.search = function(expression, context, found){
    return finder(context).search(context, expression, found)
}

slick.find = function(expression, context){
    return finder(context).search(context, expression)[0] || null
}

slick.getAttribute = function(node, name){
    return finder(node).getAttribute(node, name)
}

slick.hasAttribute = function(node, name){
    return finder(node).hasAttribute(node, name)
}

slick.contains = function(context, node){
    return finder(context).contains(context, node)
}

slick.matches = function(node, expression){
    return finder(node).matches(node, expression)
}

slick.sort = function(nodes){
    if (nodes && nodes.length > 1) finder(nodes[0]).sort(nodes)
    return nodes
}

slick.parse = parse;

// slick.debug = true
// slick.noQSA  = true

module.exports = slick

},{"./parser":41}],40:[function(require,module,exports){
(function (global){
/*
slick
*/"use strict"

module.exports = "document" in global ? require("./finder") : { parse: require("./parser") }

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./finder":39,"./parser":41}],41:[function(require,module,exports){
/*
Slick Parser
 - originally created by the almighty Thomas Aylott <@subtlegradient> (http://subtlegradient.com)
*/"use strict"

// Notable changes from Slick.Parser 1.0.x

// The parser now uses 2 classes: Expressions and Expression
// `new Expressions` produces an array-like object containing a list of Expression objects
// - Expressions::toString() produces a cleaned up expressions string
// `new Expression` produces an array-like object
// - Expression::toString() produces a cleaned up expression string
// The only exposed method is parse, which produces a (cached) `new Expressions` instance
// parsed.raw is no longer present, use .toString()
// parsed.expression is now useless, just use the indices
// parsed.reverse() has been removed for now, due to its apparent uselessness
// Other changes in the Expressions object:
// - classNames are now unique, and save both escaped and unescaped values
// - attributes now save both escaped and unescaped values
// - pseudos now save both escaped and unescaped values

var escapeRe   = /([-.*+?^${}()|[\]\/\\])/g,
    unescapeRe = /\\/g

var escape = function(string){
    // XRegExp v2.0.0-beta-3
    // « https://github.com/slevithan/XRegExp/blob/master/src/xregexp.js
    return (string + "").replace(escapeRe, '\\$1')
}

var unescape = function(string){
    return (string + "").replace(unescapeRe, '')
}

var slickRe = RegExp(
/*
#!/usr/bin/env ruby
puts "\t\t" + DATA.read.gsub(/\(\?x\)|\s+#.*$|\s+|\\$|\\n/,'')
__END__
    "(?x)^(?:\
      \\s* ( , ) \\s*               # Separator          \n\
    | \\s* ( <combinator>+ ) \\s*   # Combinator         \n\
    |      ( \\s+ )                 # CombinatorChildren \n\
    |      ( <unicode>+ | \\* )     # Tag                \n\
    | \\#  ( <unicode>+       )     # ID                 \n\
    | \\.  ( <unicode>+       )     # ClassName          \n\
    |                               # Attribute          \n\
    \\[  \
        \\s* (<unicode1>+)  (?:  \
            \\s* ([*^$!~|]?=)  (?:  \
                \\s* (?:\
                    ([\"']?)(.*?)\\9 \
                )\
            )  \
        )?  \\s*  \
    \\](?!\\]) \n\
    |   :+ ( <unicode>+ )(?:\
    \\( (?:\
        (?:([\"'])([^\\12]*)\\12)|((?:\\([^)]+\\)|[^()]*)+)\
    ) \\)\
    )?\
    )"
*/
"^(?:\\s*(,)\\s*|\\s*(<combinator>+)\\s*|(\\s+)|(<unicode>+|\\*)|\\#(<unicode>+)|\\.(<unicode>+)|\\[\\s*(<unicode1>+)(?:\\s*([*^$!~|]?=)(?:\\s*(?:([\"']?)(.*?)\\9)))?\\s*\\](?!\\])|(:+)(<unicode>+)(?:\\((?:(?:([\"'])([^\\13]*)\\13)|((?:\\([^)]+\\)|[^()]*)+))\\))?)"
    .replace(/<combinator>/, '[' + escape(">+~`!@$%^&={}\\;</") + ']')
    .replace(/<unicode>/g, '(?:[\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
    .replace(/<unicode1>/g, '(?:[:\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
)

// Part

var Part = function Part(combinator){
    this.combinator = combinator || " "
    this.tag = "*"
}

Part.prototype.toString = function(){

    if (!this.raw){

        var xpr = "", k, part

        xpr += this.tag || "*"
        if (this.id) xpr += "#" + this.id
        if (this.classes) xpr += "." + this.classList.join(".")
        if (this.attributes) for (k = 0; part = this.attributes[k++];){
            xpr += "[" + part.name + (part.operator ? part.operator + '"' + part.value + '"' : '') + "]"
        }
        if (this.pseudos) for (k = 0; part = this.pseudos[k++];){
            xpr += ":" + part.name
            if (part.value) xpr += "(" + part.value + ")"
        }

        this.raw = xpr

    }

    return this.raw
}

// Expression

var Expression = function Expression(){
    this.length = 0
}

Expression.prototype.toString = function(){

    if (!this.raw){

        var xpr = ""

        for (var j = 0, bit; bit = this[j++];){
            if (j !== 1) xpr += " "
            if (bit.combinator !== " ") xpr += bit.combinator + " "
            xpr += bit
        }

        this.raw = xpr

    }

    return this.raw
}

var replacer = function(
    rawMatch,

    separator,
    combinator,
    combinatorChildren,

    tagName,
    id,
    className,

    attributeKey,
    attributeOperator,
    attributeQuote,
    attributeValue,

    pseudoMarker,
    pseudoClass,
    pseudoQuote,
    pseudoClassQuotedValue,
    pseudoClassValue
){

    var expression, current

    if (separator || !this.length){
        expression = this[this.length++] = new Expression
        if (separator) return ''
    }

    if (!expression) expression = this[this.length - 1]

    if (combinator || combinatorChildren || !expression.length){
        current = expression[expression.length++] = new Part(combinator)
    }

    if (!current) current = expression[expression.length - 1]

    if (tagName){

        current.tag = unescape(tagName)

    } else if (id){

        current.id = unescape(id)

    } else if (className){

        var unescaped = unescape(className)

        var classes = current.classes || (current.classes = {})
        if (!classes[unescaped]){
            classes[unescaped] = escape(className)
            var classList = current.classList || (current.classList = [])
            classList.push(unescaped)
            classList.sort()
        }

    } else if (pseudoClass){

        pseudoClassValue = pseudoClassValue || pseudoClassQuotedValue

        ;(current.pseudos || (current.pseudos = [])).push({
            type         : pseudoMarker.length == 1 ? 'class' : 'element',
            name         : unescape(pseudoClass),
            escapedName  : escape(pseudoClass),
            value        : pseudoClassValue ? unescape(pseudoClassValue) : null,
            escapedValue : pseudoClassValue ? escape(pseudoClassValue) : null
        })

    } else if (attributeKey){

        attributeValue = attributeValue ? escape(attributeValue) : null

        ;(current.attributes || (current.attributes = [])).push({
            operator     : attributeOperator,
            name         : unescape(attributeKey),
            escapedName  : escape(attributeKey),
            value        : attributeValue ? unescape(attributeValue) : null,
            escapedValue : attributeValue ? escape(attributeValue) : null
        })

    }

    return ''

}

// Expressions

var Expressions = function Expressions(expression){
    this.length = 0

    var self = this

    var original = expression, replaced

    while (expression){
        replaced = expression.replace(slickRe, function(){
            return replacer.apply(self, arguments)
        })
        if (replaced === expression) throw new Error(original + ' is an invalid expression')
        expression = replaced
    }
}

Expressions.prototype.toString = function(){
    if (!this.raw){
        var expressions = []
        for (var i = 0, expression; expression = this[i++];) expressions.push(expression)
        this.raw = expressions.join(", ")
    }

    return this.raw
}

var cache = {}

var parse = function(expression){
    if (expression == null) return null
    expression = ('' + expression).replace(/^\s+|\s+$/g, '')
    return cache[expression] || (cache[expression] = new Expressions(expression))
}

module.exports = parse

},{}],42:[function(require,module,exports){
/*
traversal
*/"use strict"

var map = require("mout/array/map")

var slick = require("slick")

var $ = require("./base")

var gen = function(combinator, expression){
    return map(slick.parse(expression || "*"), function(part){
        return combinator + " " + part
    }).join(", ")
}

var push_ = Array.prototype.push

$.implement({

    search: function(expression){
        if (this.length === 1) return $(slick.search(expression, this[0], new $))

        var buffer = []
        for (var i = 0, node; node = this[i]; i++) push_.apply(buffer, slick.search(expression, node))
        buffer = $(buffer)
        return buffer && buffer.sort()
    },

    find: function(expression){
        if (this.length === 1) return $(slick.find(expression, this[0]))

        for (var i = 0, node; node = this[i]; i++) {
            var found = slick.find(expression, node)
            if (found) return $(found)
        }

        return null
    },

    sort: function(){
        return slick.sort(this)
    },

    matches: function(expression){
        return slick.matches(this[0], expression)
    },

    contains: function(node){
        return slick.contains(this[0], node)
    },

    nextSiblings: function(expression){
        return this.search(gen('~', expression))
    },

    nextSibling: function(expression){
        return this.find(gen('+', expression))
    },

    previousSiblings: function(expression){
        return this.search(gen('!~', expression))
    },

    previousSibling: function(expression){
        return this.find(gen('!+', expression))
    },

    children: function(expression){
        return this.search(gen('>', expression))
    },

    firstChild: function(expression){
        return this.find(gen('^', expression))
    },

    lastChild: function(expression){
        return this.find(gen('!^', expression))
    },

    parent: function(expression){
        var buffer = []
        loop: for (var i = 0, node; node = this[i]; i++) while ((node = node.parentNode) && (node !== document)){
            if (!expression || slick.matches(node, expression)){
                buffer.push(node)
                break loop
                break
            }
        }
        return $(buffer)
    },

    parents: function(expression){
        var buffer = []
        for (var i = 0, node; node = this[i]; i++) while ((node = node.parentNode) && (node !== document)){
            if (!expression || slick.matches(node, expression)) buffer.push(node)
        }
        return $(buffer)
    }

})

module.exports = $

},{"./base":12,"mout/array/map":22,"slick":40}],43:[function(require,module,exports){
/*
zen
*/"use strict"

var forEach = require("mout/array/forEach"),
    map     = require("mout/array/map")

var parse = require("slick/parser")

var $ = require("./base")

module.exports = function(expression, doc){

    return $(map(parse(expression), function(expression){

        var previous, result

        forEach(expression, function(part, i){

            var node = (doc || document).createElement(part.tag)

            if (part.id) node.id = part.id

            if (part.classList) node.className = part.classList.join(" ")

            if (part.attributes) forEach(part.attributes, function(attribute){
                node.setAttribute(attribute.name, attribute.value || "")
            })

            if (part.pseudos) forEach(part.pseudos, function(pseudo){
                var n = $(node), method = n[pseudo.name]
                if (method) method.call(n, pseudo.value)
            })

            if (i === 0){

                result = node

            } else if (part.combinator === " "){

                previous.appendChild(node)

            } else if (part.combinator === "+"){
                var parentNode = previous.parentNode
                if (parentNode) parentNode.appendChild(node)
            }

            previous = node

        })

        return result

    }))

}

},{"./base":12,"mout/array/forEach":20,"mout/array/map":22,"slick/parser":41}],44:[function(require,module,exports){
var kindOf = require('./kindOf');
var isPlainObject = require('./isPlainObject');
var mixIn = require('../object/mixIn');

    /**
     * Clone native types.
     */
    function clone(val){
        switch (kindOf(val)) {
            case 'Object':
                return cloneObject(val);
            case 'Array':
                return cloneArray(val);
            case 'RegExp':
                return cloneRegExp(val);
            case 'Date':
                return cloneDate(val);
            default:
                return val;
        }
    }

    function cloneObject(source) {
        if (isPlainObject(source)) {
            return mixIn({}, source);
        } else {
            return source;
        }
    }

    function cloneRegExp(r) {
        var flags = '';
        flags += r.multiline ? 'm' : '';
        flags += r.global ? 'g' : '';
        flags += r.ignoreCase ? 'i' : '';
        return new RegExp(r.source, flags);
    }

    function cloneDate(date) {
        return new Date(+date);
    }

    function cloneArray(arr) {
        return arr.slice();
    }

    module.exports = clone;



},{"../object/mixIn":54,"./isPlainObject":48,"./kindOf":49}],45:[function(require,module,exports){
var clone = require('./clone');
var forOwn = require('../object/forOwn');
var kindOf = require('./kindOf');
var isPlainObject = require('./isPlainObject');

    /**
     * Recursively clone native types.
     */
    function deepClone(val, instanceClone) {
        switch ( kindOf(val) ) {
            case 'Object':
                return cloneObject(val, instanceClone);
            case 'Array':
                return cloneArray(val, instanceClone);
            default:
                return clone(val);
        }
    }

    function cloneObject(source, instanceClone) {
        if (isPlainObject(source)) {
            var out = {};
            forOwn(source, function(val, key) {
                this[key] = deepClone(val, instanceClone);
            }, out);
            return out;
        } else if (instanceClone) {
            return instanceClone(source);
        } else {
            return source;
        }
    }

    function cloneArray(arr, instanceClone) {
        var out = [],
            i = -1,
            n = arr.length,
            val;
        while (++i < n) {
            out[i] = deepClone(arr[i], instanceClone);
        }
        return out;
    }

    module.exports = deepClone;




},{"../object/forOwn":51,"./clone":44,"./isPlainObject":48,"./kindOf":49}],46:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"./kindOf":49,"dup":28}],47:[function(require,module,exports){
var isKind = require('./isKind');
    /**
     */
    function isObject(val) {
        return isKind(val, 'Object');
    }
    module.exports = isObject;


},{"./isKind":46}],48:[function(require,module,exports){


    /**
     * Checks if the value is created by the `Object` constructor.
     */
    function isPlainObject(value) {
        return (!!value && typeof value === 'object' &&
            value.constructor === Object);
    }

    module.exports = isPlainObject;



},{}],49:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],50:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"./hasOwn":52,"dup":32}],51:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"./forIn":50,"./hasOwn":52,"dup":33}],52:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],53:[function(require,module,exports){
var hasOwn = require('./hasOwn');
var deepClone = require('../lang/deepClone');
var isObject = require('../lang/isObject');

    /**
     * Deep merge objects.
     */
    function merge() {
        var i = 1,
            key, val, obj, target;

        // make sure we don't modify source element and it's properties
        // objects are passed by reference
        target = deepClone( arguments[0] );

        while (obj = arguments[i++]) {
            for (key in obj) {
                if ( ! hasOwn(obj, key) ) {
                    continue;
                }

                val = obj[key];

                if ( isObject(val) && isObject(target[key]) ){
                    // inception, deep merge objects
                    target[key] = merge(target[key], val);
                } else {
                    // make sure arrays, regexp, date, objects are cloned
                    target[key] = deepClone(val);
                }

            }
        }

        return target;
    }

    module.exports = merge;



},{"../lang/deepClone":45,"../lang/isObject":47,"./hasOwn":52}],54:[function(require,module,exports){
var forOwn = require('./forOwn');

    /**
    * Combine properties from all the objects into first one.
    * - This method affects target object in place, if you want to create a new Object pass an empty object as first param.
    * @param {object} target    Target Object
    * @param {...object} objects    Objects to be combined (0...n objects).
    * @return {object} Target Object.
    */
    function mixIn(target, objects){
        var i = 0,
            n = arguments.length,
            obj;
        while(++i < n){
            obj = arguments[i];
            if (obj != null) {
                forOwn(obj, copyProp, target);
            }
        }
        return target;
    }

    function copyProp(val, key){
        this[key] = val;
    }

    module.exports = mixIn;


},{"./forOwn":51}],55:[function(require,module,exports){
var kindOf = require('./kindOf');
var isPlainObject = require('./isPlainObject');
var mixIn = require('../object/mixIn');

    /**
     * Clone native types.
     */
    function clone(val){
        switch (kindOf(val)) {
            case 'Object':
                return cloneObject(val);
            case 'Array':
                return cloneArray(val);
            case 'RegExp':
                return cloneRegExp(val);
            case 'Date':
                return cloneDate(val);
            default:
                return val;
        }
    }

    function cloneObject(source) {
        if (isPlainObject(source)) {
            return mixIn({}, source);
        } else {
            return source;
        }
    }

    function cloneRegExp(r) {
        var flags = '';
        flags += r.multiline ? 'm' : '';
        flags += r.global ? 'g' : '';
        flags += r.ignorecase ? 'i' : '';
        return new RegExp(r.source, flags);
    }

    function cloneDate(date) {
        return new Date(+date);
    }

    function cloneArray(arr) {
        return arr.slice();
    }

    module.exports = clone;



},{"../object/mixIn":65,"./isPlainObject":59,"./kindOf":60}],56:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"../object/forOwn":62,"./clone":55,"./isPlainObject":59,"./kindOf":60,"dup":45}],57:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"./kindOf":60,"dup":28}],58:[function(require,module,exports){
arguments[4][47][0].apply(exports,arguments)
},{"./isKind":57,"dup":47}],59:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"dup":48}],60:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],61:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"./hasOwn":63,"dup":32}],62:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"./forIn":61,"./hasOwn":63,"dup":33}],63:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],64:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"../lang/deepClone":56,"../lang/isObject":58,"./hasOwn":63,"dup":53}],65:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"./forOwn":62,"dup":54}],66:[function(require,module,exports){
/*
prime
 - prototypal inheritance
*/"use strict"

var hasOwn = require("mout/object/hasOwn"),
    mixIn  = require("mout/object/mixIn"),
    create = require("mout/lang/createObject"),
    kindOf = require("mout/lang/kindOf")

var hasDescriptors = true

try {
    Object.defineProperty({}, "~", {})
    Object.getOwnPropertyDescriptor({}, "~")
} catch (e){
    hasDescriptors = false
}

// we only need to be able to implement "toString" and "valueOf" in IE < 9
var hasEnumBug = !({valueOf: 0}).propertyIsEnumerable("valueOf"),
    buggy      = ["toString", "valueOf"]

var verbs = /^constructor|inherits|mixin$/

var implement = function(proto){
    var prototype = this.prototype

    for (var key in proto){
        if (key.match(verbs)) continue
        if (hasDescriptors){
            var descriptor = Object.getOwnPropertyDescriptor(proto, key)
            if (descriptor){
                Object.defineProperty(prototype, key, descriptor)
                continue
            }
        }
        prototype[key] = proto[key]
    }

    if (hasEnumBug) for (var i = 0; (key = buggy[i]); i++){
        var value = proto[key]
        if (value !== Object.prototype[key]) prototype[key] = value
    }

    return this
}

var prime = function(proto){

    if (kindOf(proto) === "Function") proto = {constructor: proto}

    var superprime = proto.inherits

    // if our nice proto object has no own constructor property
    // then we proceed using a ghosting constructor that all it does is
    // call the parent's constructor if it has a superprime, else an empty constructor
    // proto.constructor becomes the effective constructor
    var constructor = (hasOwn(proto, "constructor")) ? proto.constructor : (superprime) ? function(){
        return superprime.apply(this, arguments)
    } : function(){}

    if (superprime){

        mixIn(constructor, superprime)

        var superproto = superprime.prototype
        // inherit from superprime
        var cproto = constructor.prototype = create(superproto)

        // setting constructor.parent to superprime.prototype
        // because it's the shortest possible absolute reference
        constructor.parent = superproto
        cproto.constructor = constructor
    }

    if (!constructor.implement) constructor.implement = implement

    var mixins = proto.mixin
    if (mixins){
        if (kindOf(mixins) !== "Array") mixins = [mixins]
        for (var i = 0; i < mixins.length; i++) constructor.implement(create(mixins[i].prototype))
    }

    // implement proto and return constructor
    return constructor.implement(proto)

}

module.exports = prime

},{"mout/lang/createObject":67,"mout/lang/kindOf":68,"mout/object/hasOwn":71,"mout/object/mixIn":72}],67:[function(require,module,exports){
var mixIn = require('../object/mixIn');

    /**
     * Create Object using prototypal inheritance and setting custom properties.
     * - Mix between Douglas Crockford Prototypal Inheritance <http://javascript.crockford.com/prototypal.html> and the EcmaScript 5 `Object.create()` method.
     * @param {object} parent    Parent Object.
     * @param {object} [props] Object properties.
     * @return {object} Created object.
     */
    function createObject(parent, props){
        function F(){}
        F.prototype = parent;
        return mixIn(new F(), props);

    }
    module.exports = createObject;



},{"../object/mixIn":72}],68:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],69:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"./hasOwn":71,"dup":32}],70:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"./forIn":69,"./hasOwn":71,"dup":33}],71:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],72:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"./forOwn":70,"dup":54}],73:[function(require,module,exports){
"use strict";

var prime = require("prime")
var merge = require("mout/object/merge")

var Options = prime({

    setOptions: function(options){
        var args = [{}, this.options]
        args.push.apply(args, arguments)
        this.options = merge.apply(null, args)
        return this
    }

})

module.exports = Options

},{"mout/object/merge":64,"prime":66}],74:[function(require,module,exports){
(function (process,global){
/*
defer
*/"use strict"

var kindOf  = require("mout/lang/kindOf"),
    now     = require("mout/time/now"),
    forEach = require("mout/array/forEach"),
    indexOf = require("mout/array/indexOf")

var callbacks = {
    timeout: {},
    frame: [],
    immediate: []
}

var push = function(collection, callback, context, defer){

    var iterator = function(){
        iterate(collection)
    }

    if (!collection.length) defer(iterator)

    var entry = {
        callback: callback,
        context: context
    }

    collection.push(entry)

    return function(){
        var io = indexOf(collection, entry)
        if (io > -1) collection.splice(io, 1)
    }
}

var iterate = function(collection){
    var time = now()

    forEach(collection.splice(0), function(entry) {
        entry.callback.call(entry.context, time)
    })
}

var defer = function(callback, argument, context){
    return (kindOf(argument) === "Number") ? defer.timeout(callback, argument, context) : defer.immediate(callback, argument)
}

if (global.process && process.nextTick){

    defer.immediate = function(callback, context){
        return push(callbacks.immediate, callback, context, process.nextTick)
    }

} else if (global.setImmediate){

    defer.immediate = function(callback, context){
        return push(callbacks.immediate, callback, context, setImmediate)
    }

} else if (global.postMessage && global.addEventListener){

    addEventListener("message", function(event){
        if (event.source === global && event.data === "@deferred"){
            event.stopPropagation()
            iterate(callbacks.immediate)
        }
    }, true)

    defer.immediate = function(callback, context){
        return push(callbacks.immediate, callback, context, function(){
            postMessage("@deferred", "*")
        })
    }

} else {

    defer.immediate = function(callback, context){
        return push(callbacks.immediate, callback, context, function(iterator){
            setTimeout(iterator, 0)
        })
    }

}

var requestAnimationFrame = global.requestAnimationFrame ||
    global.webkitRequestAnimationFrame ||
    global.mozRequestAnimationFrame ||
    global.oRequestAnimationFrame ||
    global.msRequestAnimationFrame ||
    function(callback) {
        setTimeout(callback, 1e3 / 60)
    }

defer.frame = function(callback, context){
    return push(callbacks.frame, callback, context, requestAnimationFrame)
}

var clear

defer.timeout = function(callback, ms, context){
    var ct = callbacks.timeout

    if (!clear) clear = defer.immediate(function(){
        clear = null
        callbacks.timeout = {}
    })

    return push(ct[ms] || (ct[ms] = []), callback, context, function(iterator){
        setTimeout(iterator, ms)
    })
}

module.exports = defer

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":1,"mout/array/forEach":78,"mout/array/indexOf":79,"mout/lang/kindOf":81,"mout/time/now":86}],75:[function(require,module,exports){
/*
Emitter
*/"use strict"

var indexOf = require("mout/array/indexOf"),
    forEach = require("mout/array/forEach")

var prime = require("./index"),
    defer = require("./defer")

var slice = Array.prototype.slice;

var Emitter = prime({

    constructor: function(stoppable){
        this._stoppable = stoppable
    },

    on: function(event, fn){
        var listeners = this._listeners || (this._listeners = {}),
            events = listeners[event] || (listeners[event] = [])

        if (indexOf(events, fn) === -1) events.push(fn)

        return this
    },

    off: function(event, fn){
        var listeners = this._listeners, events
        if (listeners && (events = listeners[event])){

            var io = indexOf(events, fn)
            if (io > -1) events.splice(io, 1)
            if (!events.length) delete listeners[event];
            for (var l in listeners) return this
            delete this._listeners
        }
        return this
    },

    emit: function(event){
        var self = this,
            args = slice.call(arguments, 1)

        var emit = function(){
            var listeners = self._listeners, events
            if (listeners && (events = listeners[event])){
                forEach(events.slice(0), function(event){
                    var result = event.apply(self, args)
                    if (self._stoppable) return result
                })
            }
        }

        if (args[args.length - 1] === Emitter.EMIT_SYNC){
            args.pop()
            emit()
        } else {
            defer(emit)
        }

        return this
    }

})

Emitter.EMIT_SYNC = {}

module.exports = Emitter

},{"./defer":74,"./index":76,"mout/array/forEach":78,"mout/array/indexOf":79}],76:[function(require,module,exports){
/*
prime
 - prototypal inheritance
*/"use strict"

var hasOwn = require("mout/object/hasOwn"),
    mixIn  = require("mout/object/mixIn"),
    create = require("mout/lang/createObject"),
    kindOf = require("mout/lang/kindOf")

var hasDescriptors = true

try {
    Object.defineProperty({}, "~", {})
    Object.getOwnPropertyDescriptor({}, "~")
} catch (e){
    hasDescriptors = false
}

// we only need to be able to implement "toString" and "valueOf" in IE < 9
var hasEnumBug = !({valueOf: 0}).propertyIsEnumerable("valueOf"),
    buggy      = ["toString", "valueOf"]

var verbs = /^constructor|inherits|mixin$/

var implement = function(proto){
    var prototype = this.prototype

    for (var key in proto){
        if (key.match(verbs)) continue
        if (hasDescriptors){
            var descriptor = Object.getOwnPropertyDescriptor(proto, key)
            if (descriptor){
                Object.defineProperty(prototype, key, descriptor)
                continue
            }
        }
        prototype[key] = proto[key]
    }

    if (hasEnumBug) for (var i = 0; (key = buggy[i]); i++){
        var value = proto[key]
        if (value !== Object.prototype[key]) prototype[key] = value
    }

    return this
}

var prime = function(proto){

    if (kindOf(proto) === "Function") proto = {constructor: proto}

    var superprime = proto.inherits

    // if our nice proto object has no own constructor property
    // then we proceed using a ghosting constructor that all it does is
    // call the parent's constructor if it has a superprime, else an empty constructor
    // proto.constructor becomes the effective constructor
    var constructor = (hasOwn(proto, "constructor")) ? proto.constructor : (superprime) ? function(){
        return superprime.apply(this, arguments)
    } : function(){}

    if (superprime){

        mixIn(constructor, superprime)

        var superproto = superprime.prototype
        // inherit from superprime
        var cproto = constructor.prototype = create(superproto)

        // setting constructor.parent to superprime.prototype
        // because it's the shortest possible absolute reference
        constructor.parent = superproto
        cproto.constructor = constructor
    }

    if (!constructor.implement) constructor.implement = implement

    var mixins = proto.mixin
    if (mixins){
        if (kindOf(mixins) !== "Array") mixins = [mixins]
        for (var i = 0; i < mixins.length; i++) constructor.implement(create(mixins[i].prototype))
    }

    // implement proto and return constructor
    return constructor.implement(proto)

}

module.exports = prime

},{"mout/lang/createObject":80,"mout/lang/kindOf":81,"mout/object/hasOwn":84,"mout/object/mixIn":85}],77:[function(require,module,exports){
/*
Map
*/"use strict"

var indexOf = require("mout/array/indexOf")

var prime = require("./index")

var Map = prime({

    constructor: function Map(){
        this.length = 0
        this._values = []
        this._keys = []
    },

    set: function(key, value){
        var index = indexOf(this._keys, key)

        if (index === -1){
            this._keys.push(key)
            this._values.push(value)
            this.length++
        } else {
            this._values[index] = value
        }

        return this
    },

    get: function(key){
        var index = indexOf(this._keys, key)
        return (index === -1) ? null : this._values[index]
    },

    count: function(){
        return this.length
    },

    forEach: function(method, context){
        for (var i = 0, l = this.length; i < l; i++){
            if (method.call(context, this._values[i], this._keys[i], this) === false) break
        }
        return this
    },

    map: function(method, context){
        var results = new Map
        this.forEach(function(value, key){
            results.set(key, method.call(context, value, key, this))
        }, this)
        return results
    },

    filter: function(method, context){
        var results = new Map
        this.forEach(function(value, key){
            if (method.call(context, value, key, this)) results.set(key, value)
        }, this)
        return results
    },

    every: function(method, context){
        var every = true
        this.forEach(function(value, key){
            if (!method.call(context, value, key, this)) return (every = false)
        }, this)
        return every
    },

    some: function(method, context){
        var some = false
        this.forEach(function(value, key){
            if (method.call(context, value, key, this)) return !(some = true)
        }, this)
        return some
    },

    indexOf: function(value){
        var index = indexOf(this._values, value)
        return (index > -1) ? this._keys[index] : null
    },

    remove: function(value){
        var index = indexOf(this._values, value)

        if (index !== -1){
            this._values.splice(index, 1)
            this.length--
            return this._keys.splice(index, 1)[0]
        }

        return null
    },

    unset: function(key){
        var index = indexOf(this._keys, key)

        if (index !== -1){
            this._keys.splice(index, 1)
            this.length--
            return this._values.splice(index, 1)[0]
        }

        return null
    },

    keys: function(){
        return this._keys.slice()
    },

    values: function(){
        return this._values.slice()
    }

})

var map = function(){
    return new Map
}

map.prototype = Map.prototype

module.exports = map

},{"./index":76,"mout/array/indexOf":79}],78:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],79:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"dup":21}],80:[function(require,module,exports){
arguments[4][67][0].apply(exports,arguments)
},{"../object/mixIn":85,"dup":67}],81:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],82:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"./hasOwn":84,"dup":32}],83:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"./forIn":82,"./hasOwn":84,"dup":33}],84:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34}],85:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"./forOwn":83,"dup":54}],86:[function(require,module,exports){


    /**
     * Get current time in miliseconds
     */
    function now(){
        // yes, we defer the work to another function to allow mocking it
        // during the tests
        return now.get();
    }

    now.get = (typeof Date.now === 'function')? Date.now : function(){
        return +(new Date());
    };

    module.exports = now;



},{}],87:[function(require,module,exports){

var prime = require('prime'),
	ready = require('elements/domready');

var Component = require('../../lib/component.js');
var Container = require('../../lib/container.js');
var Layout = require('../../lib/layout/layout.js');
var Button = require('../../lib/control/button.js');

ready(function() {
	console.log('ready', document.body);

	var layout = new Layout({
		container: document.body
	});

	var component = new Component().inject(document.body);
	var button = new Button({
		type: 'action',
		klass: 'is-primary'
	}).inject(document.body);

	var container = new Container().inject(document.body);
});

},{"../../lib/component.js":2,"../../lib/container.js":4,"../../lib/control/button.js":6,"../../lib/layout/layout.js":8,"elements/domready":14,"prime":76}]},{},[87])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsImxpYi9jb21wb25lbnQuanMiLCJsaWIvY29tcG9uZW50L21ldGhvZC5qcyIsImxpYi9jb250YWluZXIuanMiLCJsaWIvY29udGFpbmVyL2Rpc3BsYXkuanMiLCJsaWIvY29udHJvbC9idXR0b24uanMiLCJsaWIvbGF5b3V0L2NvbXBvbmVudC5qcyIsImxpYi9sYXlvdXQvbGF5b3V0LmpzIiwibGliL2xheW91dC9yZXNpemUuanMiLCJsaWIvbW9kdWxlL2JpbmRpbmcuanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvYXR0cmlidXRlcy5qcyIsIm5vZGVfbW9kdWxlcy9lbGVtZW50cy9iYXNlLmpzIiwibm9kZV9tb2R1bGVzL2VsZW1lbnRzL2RlbGVnYXRpb24uanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvZG9tcmVhZHkuanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzL2VsZW1lbnRzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2VsZW1lbnRzL2luc2VydGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9lbGVtZW50cy9ub2RlX21vZHVsZXMvbW91dC9hcnJheS9ldmVyeS5qcyIsIm5vZGVfbW9kdWxlcy9lbGVtZW50cy9ub2RlX21vZHVsZXMvbW91dC9hcnJheS9maWx0ZXIuanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvbm9kZV9tb2R1bGVzL21vdXQvYXJyYXkvZm9yRWFjaC5qcyIsIm5vZGVfbW9kdWxlcy9lbGVtZW50cy9ub2RlX21vZHVsZXMvbW91dC9hcnJheS9pbmRleE9mLmpzIiwibm9kZV9tb2R1bGVzL2VsZW1lbnRzL25vZGVfbW9kdWxlcy9tb3V0L2FycmF5L21hcC5qcyIsIm5vZGVfbW9kdWxlcy9lbGVtZW50cy9ub2RlX21vZHVsZXMvbW91dC9hcnJheS9zb21lLmpzIiwibm9kZV9tb2R1bGVzL2VsZW1lbnRzL25vZGVfbW9kdWxlcy9tb3V0L2Z1bmN0aW9uL2lkZW50aXR5LmpzIiwibm9kZV9tb2R1bGVzL2VsZW1lbnRzL25vZGVfbW9kdWxlcy9tb3V0L2Z1bmN0aW9uL21ha2VJdGVyYXRvcl8uanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvbm9kZV9tb2R1bGVzL21vdXQvZnVuY3Rpb24vcHJvcC5qcyIsIm5vZGVfbW9kdWxlcy9lbGVtZW50cy9ub2RlX21vZHVsZXMvbW91dC9sYW5nL2lzQXJyYXkuanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvbm9kZV9tb2R1bGVzL21vdXQvbGFuZy9pc0tpbmQuanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvbm9kZV9tb2R1bGVzL21vdXQvbGFuZy9raW5kT2YuanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvbm9kZV9tb2R1bGVzL21vdXQvbGFuZy90b1N0cmluZy5qcyIsIm5vZGVfbW9kdWxlcy9lbGVtZW50cy9ub2RlX21vZHVsZXMvbW91dC9vYmplY3QvZGVlcE1hdGNoZXMuanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvbm9kZV9tb2R1bGVzL21vdXQvb2JqZWN0L2ZvckluLmpzIiwibm9kZV9tb2R1bGVzL2VsZW1lbnRzL25vZGVfbW9kdWxlcy9tb3V0L29iamVjdC9mb3JPd24uanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvbm9kZV9tb2R1bGVzL21vdXQvb2JqZWN0L2hhc093bi5qcyIsIm5vZGVfbW9kdWxlcy9lbGVtZW50cy9ub2RlX21vZHVsZXMvbW91dC9zdHJpbmcvV0hJVEVfU1BBQ0VTLmpzIiwibm9kZV9tb2R1bGVzL2VsZW1lbnRzL25vZGVfbW9kdWxlcy9tb3V0L3N0cmluZy9sdHJpbS5qcyIsIm5vZGVfbW9kdWxlcy9lbGVtZW50cy9ub2RlX21vZHVsZXMvbW91dC9zdHJpbmcvcnRyaW0uanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvbm9kZV9tb2R1bGVzL21vdXQvc3RyaW5nL3RyaW0uanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvbm9kZV9tb2R1bGVzL3NsaWNrL2ZpbmRlci5qcyIsIm5vZGVfbW9kdWxlcy9lbGVtZW50cy9ub2RlX21vZHVsZXMvc2xpY2svaW5kZXguanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvbm9kZV9tb2R1bGVzL3NsaWNrL3BhcnNlci5qcyIsIm5vZGVfbW9kdWxlcy9lbGVtZW50cy90cmF2ZXJzYWwuanMiLCJub2RlX21vZHVsZXMvZWxlbWVudHMvemVuLmpzIiwibm9kZV9tb2R1bGVzL21vdXQvbGFuZy9jbG9uZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3V0L2xhbmcvZGVlcENsb25lLmpzIiwibm9kZV9tb2R1bGVzL21vdXQvbGFuZy9pc09iamVjdC5qcyIsIm5vZGVfbW9kdWxlcy9tb3V0L2xhbmcvaXNQbGFpbk9iamVjdC5qcyIsIm5vZGVfbW9kdWxlcy9tb3V0L29iamVjdC9tZXJnZS5qcyIsIm5vZGVfbW9kdWxlcy9tb3V0L29iamVjdC9taXhJbi5qcyIsIm5vZGVfbW9kdWxlcy9wcmltZS11dGlsL25vZGVfbW9kdWxlcy9tb3V0L2xhbmcvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvcHJpbWUtdXRpbC9ub2RlX21vZHVsZXMvcHJpbWUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJpbWUtdXRpbC9ub2RlX21vZHVsZXMvcHJpbWUvbm9kZV9tb2R1bGVzL21vdXQvbGFuZy9jcmVhdGVPYmplY3QuanMiLCJub2RlX21vZHVsZXMvcHJpbWUtdXRpbC9wcmltZS9vcHRpb25zLmpzIiwibm9kZV9tb2R1bGVzL3ByaW1lL2RlZmVyLmpzIiwibm9kZV9tb2R1bGVzL3ByaW1lL2VtaXR0ZXIuanMiLCJub2RlX21vZHVsZXMvcHJpbWUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJpbWUvbWFwLmpzIiwibm9kZV9tb2R1bGVzL3ByaW1lL25vZGVfbW9kdWxlcy9tb3V0L3RpbWUvbm93LmpzIiwicHVibGljL2RlbW8vbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM3ekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qXG5tYXRlcmlhbFxuIC0gb28gdWkgdG9vbGtpdFxuKi9cInVzZSBzdHJpY3RcIlxuXG52YXIgcHJpbWUgPSByZXF1aXJlKFwicHJpbWUvaW5kZXhcIiksXG5cdE9wdGlvbnMgPSByZXF1aXJlKCdwcmltZS11dGlsL3ByaW1lL29wdGlvbnMnKSxcblx0RW1pdHRlciA9IHJlcXVpcmUoXCJwcmltZS9lbWl0dGVyXCIpLFxuXHRiaW5kaW5nID0gcmVxdWlyZShcIi4vbW9kdWxlL2JpbmRpbmdcIiksXG5cdG1ldGhvZCA9IHJlcXVpcmUoXCIuL2NvbXBvbmVudC9tZXRob2RcIiksXG5cdCQgPSByZXF1aXJlKFwiZWxlbWVudHNcIiksXG5cdHplbiA9IHJlcXVpcmUoJ2VsZW1lbnRzL3plbicpO1xuXG52YXIgQ29tcG9uZW50ID0gcHJpbWUoe1xuXG5cdG1peGluOiBbT3B0aW9ucywgRW1pdHRlciwgYmluZGluZywgbWV0aG9kXSxcblxuXHRvcHRpb25zOiB7XG5cdFx0bGliOiAndWknLFxuXHRcdHByZWZpeDogJ3VpLScsXG5cblx0XHRjb21wb25lbnQ6ICdjb21wb25lbnQnLFxuXHRcdG5hbWU6ICdjb21wb25lbnQnLFxuXHRcdHR5cGU6IG51bGwsXHRcblx0XHRlbGVtZW50OiB7XG5cdFx0XHRhdHRyaWJ1dGVzOiBbJ2FjY2Vzc2tleScsICdjbGFzcycsICdjb250ZW50ZWRpdGFibGUnLCAnY29udGV4dG1lbnUnLFxuXHRcdFx0J2RpcicsICdkcmFnZ2FibGUnLCAnZHJvcHpvbmUnLCAnaGlkZGVuJywgJ2lkJywgJ2xhbmcnLFxuXHRcdFx0J3NwZWxsY2hlY2snLCAnc3R5bGUnLCAndGFiaW5kZXgnLCAndGl0bGUnLCAndHJhbnNsYXRlJ10sXG5cdFx0XHR0YWc6ICdzcGFuJyxcblx0XHRcdHR5cGU6IG51bGxcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIENvbnN0cnVjdG9yXG5cdCAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRjb25zdHJ1Y3RvcjogZnVuY3Rpb24ob3B0aW9ucyl7XG5cdFx0dGhpcy5zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG5cdFx0dGhpcy5lbWl0KCdpbml0Jyk7XG5cblx0XHR0aGlzLl9pbml0T3B0aW9ucygpO1xuXHRcdHRoaXMuX2luaXRFbGVtZW50KCk7XG5cdFx0dGhpcy5faW5pdEV2ZW50cygpO1xuXHRcdHRoaXMuX2luaXRCaW5kaW5nKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogW19pbml0RWxlbWVudCBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRfaW5pdEVsZW1lbnQ6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIG9wdHMgPSB0aGlzLm9wdGlvbnM7XG5cblx0XHR0aGlzLmVtaXQoJ2NyZWF0ZScpO1xuXG5cdFx0dmFyIHRhZyA9IHRoaXMub3B0aW9ucy5lbGVtZW50LnRhZztcblx0XHR2YXIgbmFtZSA9IHRoaXMub3B0aW9ucy5uYW1lO1xuXG5cdFx0dGhpcy5kb21FbGVtZW50ID0gemVuKHRhZyk7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSAkKHRoaXMuZG9tRWxlbWVudCk7XG5cblx0XHQvLyBpbml0IGF0dHJpYnV0ZXNcblx0XHR0aGlzLl9pbml0QXR0cmlidXRlcygpO1xuXG5cdFx0Ly8gc2V0IHRleHQgb3IgaHRtbCBpZiBuZWVkZWRcblx0XHR2YXIgdGV4dCA9IG9wdHMudGV4dCB8fCBvcHRzLmh0bWw7XG5cdFx0aWYgKHRleHQpIHRoaXMuc2V0VGV4dCh0ZXh0KTtcblxuXHRcdC8vZWxlbWVudC5zdG9yZSgnX2luc3RhbmNlJywgdGhpcyk7XG5cblx0XHRpZiAob3B0cy5rbGFzcyk7XG5cdFx0XHR0aGlzLmFkZENsYXNzKG9wdHMua2xhc3MpO1xuXG5cdFx0dGhpcy5lbWl0KCdjcmVhdGVkJyk7XG5cblx0XHRpZiAob3B0cy5zdGF0ZSlcblx0XHRcdHRoaXMuc2V0U3RhdGUob3B0cy5zdGF0ZSk7XG5cblx0XHR0aGlzLl9pbml0Q2xhc3MoKTtcblxuXHRcdHJldHVybiB0aGlzLmVsZW1lbnQ7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEluaXQgY29tcG9uZW50IGNsYXNzXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0X2luaXRDbGFzczogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIG9wdHMgPSB0aGlzLm9wdGlvbnM7XG5cblx0XHQvL3RoaXMuZWxlbWVudC5hZGRDbGFzcyhvcHRzLnByZWZpeCArIG9wdHMubmFtZSk7XG5cdFx0dmFyIGtsYXNzID0gb3B0cy5rbGFzcyB8fCBvcHRzLmVsZW1lbnQua2xhc3M7XG5cblx0XHRpZiAoa2xhc3MpIHtcblx0XHRcdHRoaXMuZWxlbWVudC5hZGRDbGFzcyhrbGFzcyk7XG5cdFx0fVxuXG5cdFx0aWYgKG9wdHMudHlwZSAmJiB0eXBlb2Ygb3B0cy50eXBlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuZWxlbWVudC5hZGRDbGFzcygndHlwZS0nICsgb3B0cy50eXBlKTtcblx0XHR9XG5cblx0XHRpZiAob3B0cy5zdGF0ZSAmJiB0eXBlb2Ygb3B0cy5zdGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLmVsZW1lbnQuYWRkQ2xhc3MoJ3N0YXRlLScgKyBvcHRzLnN0YXRlKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtnZXROYW1lIGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtzdHJpbmd9IG5hbWVcblx0ICovXG5cdGdldE5hbWU6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLm9wdGlvbnMubmFtZSB8fCB0aGlzLm5hbWU7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtzZXRUZXh0IGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0ge1t0eXBlXX0gdGV4dCBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRzZXRUZXh0OiBmdW5jdGlvbih0ZXh0KSB7XG5cdFx0dmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0ZXh0KTtcblx0XHR0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdH0sXG5cblxuXHQvKipcblx0ICogW19pbml0T3B0aW9ucyBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7dm9pZH1cblx0ICovXG5cdF9pbml0T3B0aW9uczogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIG9wdHMgPSB0aGlzLm9wdGlvbnM7XG5cdFx0Ly90aGlzLm5hbWUgPSB0aGlzLm9wdGlvbnMubmFtZTtcblx0XHR0aGlzLm1haW4gPSBvcHRzLm1haW4gfHwgb3B0cy5uYW1lO1xuXG5cdFx0Ly91aS5ub2RlID0gdWkubm9kZSB8fCB7fTtcblx0XHQvL3VpLm5vZGVbdGhpcy5tYWluXSA9IHVpLm5vZGVbdGhpcy5tYWluXSB8fCB7fTtcblxuXHRcdHRoaXMubGF5b3V0ID0gb3B0cy5sYXlvdXQgfHwge307XG5cdFx0dGhpcy5sYXlvdXRbdGhpcy5tYWluXSA9IHRoaXMubGF5b3V0W3RoaXMubWFpbl0gfHwge307XG5cblx0XHR0aGlzLmRyYWdIYW5kbGVycyA9IG9wdHMuZHJhZ0hhbmRsZXJzIHx8IFtdO1xuXHR9LFxuXG5cblx0LyoqXG5cdCAqIFtfaW5pdEV2ZW50cyBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7dm9pZH1cblx0ICovXG5cdF9pbml0RXZlbnRzOiBmdW5jdGlvbigpIHtcblx0XHQvL19sb2cuZGVidWcoJ19pbml0RXZlbnRzJyk7XG5cdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0b3B0cyA9IHRoaXMub3B0aW9ucztcblxuXHRcdHRoaXMub24oe1xuXHRcdFx0LyoqXG5cdFx0XHQgKiBAaWdub3JlXG5cdFx0XHQgKi9cblx0XHRcdGluamVjdGVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKG9wdHMucmVzaXphYmxlICYmIHNlbGYuX2luaXRSZXNpemVyKSB7XG5cdFx0XHRcdFx0c2VsZi5faW5pdFJlc2l6ZXIoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdC8qKlxuXHRcdFx0ICogQGlnbm9yZVxuXHRcdFx0ICovXG5cdFx0XHRkZXZpY2U6IGZ1bmN0aW9uKGRldmljZSkge1xuXHRcdFx0XHQvL19sb2cuZGVidWcoJ2RldmljZScsIGRldmljZSk7XG5cdFx0XHRcdHNlbGYuZGV2aWNlID0gZGV2aWNlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5kcmFnZ2FibGUgJiYgdGhpcy5lbmFibGVEcmFnKSB7XG5cdFx0XHR0aGlzLmVuYWJsZURyYWcoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHRlciBmb3IgdGhlIHN0YXRlIG9mIHRoZSBjb21wb25lbnRcblx0ICogQHBhcmFtIHtTdHJpbmd9IHN0YXRlIGFjdGl2ZS9kaXNhYmxlIGV0Yy4uLlxuXHQgKi9cblx0c2V0U3RhdGU6IGZ1bmN0aW9uKHN0YXRlKXtcblx0XHRpZiAodGhpcy5zdGF0ZSlcblx0XHRcdHRoaXMucmVtb3ZlQ2xhc3MoJ3N0YXRlLScrdGhpcy5zdGF0ZSk7XG5cblx0XHRpZiAoc3RhdGUpXG5cdFx0XHR0aGlzLmFkZENsYXNzKCdzdGF0ZS0nK3N0YXRlKTtcblxuXHRcdHRoaXMuc3RhdGUgPSBzdGF0ZTtcblx0XHR0aGlzLmVtaXQoJ3N0YXRlJywgc3RhdGUpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtfaW5pdENsYXNzIGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdGFkZENsYXNzOiBmdW5jdGlvbihrbGFzcykge1xuXHRcdHRoaXMuZWxlbWVudC5hZGRDbGFzcyhrbGFzcyk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogW19pbml0Q2xhc3MgZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0cmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uKGtsYXNzKSB7XG5cdFx0dGhpcy5lbGVtZW50LnJlbW92ZUNsYXNzKGtsYXNzKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbc2V0QXR0cmlidXRlIGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0ge1t0eXBlXX0gbmFtZSAgW2Rlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0ge1t0eXBlXX0gdmFsdWUgW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0c2V0QXR0cmlidXRlOiBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuXHRcdHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtfaW5pdFByb3BzIGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdF9pbml0QXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG5cdFx0Ly9jb25zb2xlLmxvZygnX2luaXRBdHRyaWJ1dGVzJyk7XG5cdFx0dmFyIG9wdHMgPSB0aGlzLm9wdGlvbnMsXG5cdFx0XHRhdHRyID0gb3B0cy5lbGVtZW50LmF0dHJpYnV0ZXM7XG5cblx0XHRmb3IgKHZhciBpID0gMCwgbGVuID0gYXR0ci5sZW5ndGg7IGkgPCBsZW47IGkrKyApIHtcblx0XHRcdHZhciBuYW1lID0gYXR0cltpXSxcblx0XHRcdFx0dmFsdWUgPSBvcHRzW25hbWVdO1xuXG5cdFx0XHRpZiAobmFtZSA9PT0gJ2tsYXNzJylcblx0XHRcdFx0bmFtZSA9ICdjbGFzcyc7XG5cblx0XHRcdGlmICh2YWx1ZSlcblx0XHRcdFx0dGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogSW5qZWN0IG1ldGhvZCBpbnNlcnQgZWxlbWVudCB0byB0aGUgZG9tdHJlZSB1c2luZyBEb20gbWV0aG9kc1xuXHQgKiBAcGFyYW0gIHtbdHlwZV19IGNvbnRhaW5lciBbZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge1t0eXBlXX0gcG9zaXRpb24gIFtkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSAgICAgICAgICAgW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0aW5qZWN0OiBmdW5jdGlvbihlbGVtZW50LCBjb250ZXh0KSB7XG5cdFx0Ly9jb25zb2xlLmxvZygnaW5qZWN0JywgdGhpcy5lbGVtZW50LCBjb250ZXh0KTtcblxuXHRcdGNvbnRleHQgPSBjb250ZXh0IHx8ICdib3R0b20nO1xuXG5cdFx0dmFyIGNvbnRleHRzID0gWyd0b3AnLCAnYm90dG9tJywgJ2FmdGVyJywgJ2JlZm9yZSddO1xuXHRcdHZhciBtZXRob2RzID0gWyd0b3AnLCAnYm90dG9tJywgJ2FmdGVyJywgJ2JlZm9yZSddO1xuXG5cdFx0dmFyIGluZGV4ID0gY29udGV4dHMuaW5kZXhPZihjb250ZXh0KTtcblx0XHRpZiAoaW5kZXggPT09IC0xKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0dmFyIG1ldGhvZCA9IG1ldGhvZHNbaW5kZXhdO1xuXG5cdFx0Ly8gaWYgZWxlbWVudCBpcyBhIGNvbXBvbmVudCB1c2UgaXRzIGVsZW1lbnQgaW5zdGVhZFxuXHRcdC8vIGlmIChlbGVtZW50IGluc3RhbmNlb2YgdWkuY29tcG9uZW50KVxuXHRcdC8vIFx0ZWxlbWVudCA9IGVsZW1lbnQuZWxlbWVudDtcblxuXHRcdHRoaXMuZW1pdCgnaW5qZWN0Jyk7XG5cblx0XHQvLyBpbnNlcnQgY29tcG9uZW50IGVsZW1lbnQgdG8gdGhlIGRvbSB0cmVlIHVzaW5nIERvbVxuXHRcdCQodGhpcy5lbGVtZW50KVttZXRob2RdKGVsZW1lbnQpO1xuXG5cdFx0dGhpcy5lbWl0KCdpbmplY3RlZCcpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtoaWRlIGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdGhpZGU6IGZ1bmN0aW9uKCkge1xuXHRcdC8vIHRoaXMuZWxlbWVudC5hdHRyaWJ1dGUoJ3N0eWxlJywge1xuXHRcdC8vIFx0ZGlzcGxheTogJ25vbmUnXG5cdFx0Ly8gfSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtyZW1vdmUgZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0cmVtb3ZlOiBmdW5jdGlvbigpIHtcblx0XHQvLyB0aGlzLmVsZW1lbnQuYXR0cmlidXRlKCdzdHlsZScsIHtcblx0XHQvLyBcdGRpc3BsYXk6ICdub25lJ1xuXHRcdC8vIH0pO1xuXHR9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudFxuXG4iLCIvKlxubWF0ZXJpYWxcbiAtIG9vIHVpIHRvb2xraXRcbiovXCJ1c2Ugc3RyaWN0XCJcblxudmFyIHByaW1lID0gcmVxdWlyZShcInByaW1lL2luZGV4XCIpO1xuXG52YXIgbWV0aG9kID0gcHJpbWUoe1xuXHQvKipcblx0ICogW3RvRWxlbWVudCBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHR0b0VsZW1lbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmVsZW1lbnQ7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtzaG93IGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdHNob3c6IGZ1bmN0aW9uKCl7XG5cdFx0dGhpcy5maXJlRXZlbnQoJ3Nob3cnKTtcblx0XHR0aGlzLmVsZW1lbnQuc2hvdygpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblxuXHQvKipcblx0ICogW2hpZGUgZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0aGlkZTogZnVuY3Rpb24oKXtcblx0XHR0aGlzLmZpcmVFdmVudCgnaGlkZScpO1xuXHRcdHRoaXMuZWxlbWVudC5oaWRlKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogW3Nob3cgZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0ZmFkZTogZnVuY3Rpb24odmFsdWUpe1xuXHRcdHRoaXMuZmlyZUV2ZW50KCdmYWRlJyk7XG5cdFx0dGhpcy5lbGVtZW50LmZhZGUodmFsdWUpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblxuXHQvKipcblx0ICogW2dldFN0eWxlIGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtbdHlwZV19IHN0eWxlIFtkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSAgICAgICBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRnZXRTdHlsZTogZnVuY3Rpb24oc3R5bGUpe1xuXHRcdHJldHVybiB0aGlzLmVsZW1lbnQuYXR0cmlidXRlKG5hbWUpO1xuXG5cblxuXHR9LFxuXG5cdC8qKlxuXHQgKiBbZ2V0U2l6ZSBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRnZXRTaXplOiBmdW5jdGlvbigpIHtcblx0XHQvL19sb2cuZGVidWcoJy0tLS0tLScsdHlwZU9mKHRoaXMuZWxlbWVudCkpO1xuXHRcdGlmICh0eXBlT2YodGhpcy5lbGVtZW50KSA9PSAnb2JqZWN0Jylcblx0XHRcdC8vX2xvZy5kZWJ1Zyh0aGlzLm9wdGlvbnMubmFtZSk7XG5cblx0XHRyZXR1cm4gdGhpcy5lbGVtZW50LmdldFNpemUoKTtcblx0fSxcblxuXHQvKipcblx0ICogW2dldENvbXB1dGVkU2l6ZSBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRnZXRDb21wdXRlZFNpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmVsZW1lbnQuZ2V0Q29tcHV0ZWRTaXplZCgpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbZ2V0Q29vcmRpbmF0ZXMgZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0Z2V0Q29vcmRpbmF0ZXM6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5lbGVtZW50LmdldENvb3JkaW5hdGVzKGNvbnRleHQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbYWRkQ2xhc3MgZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSB7W3R5cGVdfSBrbGFzcyBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRhZGRDbGFzczogZnVuY3Rpb24oa2xhc3Mpe1xuXHRcdHRoaXMuZWxlbWVudC5hZGRDbGFzcyhrbGFzcyk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtyZW1vdmVDbGFzcyBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7W3R5cGVdfSBrbGFzcyBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0cmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uKGtsYXNzKXtcblx0XHRyZXR1cm4gdGhpcy5lbGVtZW50LnJlbW92ZUNsYXNzKGtsYXNzKTtcblx0fSxcblxuXHQvKipcblx0ICogW2dldCBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7W3R5cGVdfSBwcm9wZXJ0eSBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgICAgW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0Z2V0OiBmdW5jdGlvbihwcm9wZXJ0eSl7XG5cdFx0cmV0dXJuIHRoaXMuZWxlbWVudC5nZXQocHJvcGVydHkpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbbW9ycGggZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge1t0eXBlXX0gcHJvcHMgW2Rlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdG1vcnBoOiBmdW5jdGlvbihwcm9wcyl7XG5cdFx0cmV0dXJuIHRoaXMuZWxlbWVudC5tb3JwaChwcm9wcyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtzZXRTaXplIGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0ge1t0eXBlXX0gd2lkdGggIFtkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtIHtbdHlwZV19IGhlaWdodCBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRzZXRTaXplOiBmdW5jdGlvbih3aWR0aCwgaGVpZ2h0KXtcblx0XHR0aGlzLmVsZW1lbnQueCA9IHdpZHRoIHx8IHRoaXMub3B0aW9ucy53aWR0aDtcblx0XHR0aGlzLmVsZW1lbnQueSA9IGhlaWdodCB8fCB0aGlzLm9wdGlvbnMuaGVpZ2h0O1xuXG5cdFx0aWYgKHRoaXMuZWxlbWVudC54KVxuXHRcdFx0dGhpcy5lbGVtZW50LnNldFN0eWxlKCd3aWR0aCcsIHRoaXMuZWxlbWVudC54KTtcblxuXHRcdGlmICh0aGlzLmVsZW1lbnQueSlcblx0XHRcdHRoaXMuZWxlbWVudC5zZXRTdHlsZSgnaGVpZ2h0JywgdGhpcy5lbGVtZW50LnkpO1xuXG5cdFx0dGhpcy5maXJlRXZlbnQoJ3Jlc2l6ZScpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbc2V0U3R5bGUgZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSB7W3R5cGVdfSBzdHlsZSBbZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSB7W3R5cGVdfSB2YWx1ZSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRzZXRTdHlsZTogZnVuY3Rpb24oc3R5bGUsIHZhbHVlKXtcblx0XHR0aGlzLmVsZW1lbnQuc2V0U3R5bGUoc3R5bGUsIHZhbHVlKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbc2V0U3R5bGVzIGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0ge1t0eXBlXX0gc3R5bGVzIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdHNldFN0eWxlczogZnVuY3Rpb24oc3R5bGVzKXtcblx0XHR0aGlzLmVsZW1lbnQuc2V0U3R5bGVzKHN0eWxlcyk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogW2dldEVsZW1lbnQgZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge1t0eXBlXX0gc3RyaW5nIFtkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSAgICAgICAgW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0Z2V0RWxlbWVudDogZnVuY3Rpb24oc3RyaW5nKXtcblx0XHRyZXR1cm4gdGhpcy5lbGVtZW50LmdldEVsZW1lbnQoc3RyaW5nKTtcblx0fSxcblxuXHQvKipcblx0ICogW2dldEVsZW1lbnRzIGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtbdHlwZV19IHN0cmluZyBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdGdldEVsZW1lbnRzOiBmdW5jdGlvbihzdHJpbmcpe1xuXHRcdHJldHVybiB0aGlzLmVsZW1lbnQuZ2V0RWxlbWVudHMoc3RyaW5nKTtcblx0fSxcblxuXHQvKipcblx0ICogW3N1Ym1pdCBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7W3R5cGVdfSBzdHJpbmcgW2Rlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgICBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRzdWJtaXQ6ICBmdW5jdGlvbihzdHJpbmcpe1xuXHRcdHJldHVybiB0aGlzLmVsZW1lbnQuc3VibWl0KHN0cmluZyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtkaXNwb3NlIGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdGRpc3Bvc2U6IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIHRoaXMuZWxlbWVudC5kaXNwb3NlKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtkZXN0cm95IGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdGRlc3Ryb3k6IGZ1bmN0aW9uKCl7XG5cdFx0dGhpcy5lbGVtZW50LmRlc3Ryb3koKTtcblx0XHRyZXR1cm47XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1ldGhvZDtcbiIsIi8qXG5tYXRlcmlhbFxuIC0gb28gdWkgdG9vbGtpdFxuKi9cInVzZSBzdHJpY3RcIlxuXG52YXIgcHJpbWUgPSByZXF1aXJlKFwicHJpbWUvaW5kZXhcIiksXG5cdE9wdGlvbnMgPSByZXF1aXJlKCdwcmltZS11dGlsL3ByaW1lL29wdGlvbnMnKSxcblx0RW1pdHRlciA9IHJlcXVpcmUoXCJwcmltZS9lbWl0dGVyXCIpLFxuXHRtZXJnZU9iamVjdCA9IHJlcXVpcmUoXCJtb3V0L29iamVjdC9tZXJnZVwiKSxcblx0JCA9IHJlcXVpcmUoXCJlbGVtZW50c1wiKSxcblx0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi9jb21wb25lbnQnKSxcblx0ZGlzcGxheSA9IHJlcXVpcmUoJy4vY29udGFpbmVyL2Rpc3BsYXknKTtcblxudmFyIENvbnRhaW5lciA9IHByaW1lKHtcblxuXHRtaXhpbjogW09wdGlvbnMsIEVtaXR0ZXIsIGRpc3BsYXldLFxuXG5cdGluaGVyaXRzOiBDb21wb25lbnQsXG5cblx0bmFtZTogJ2xheW91dCcsXG5cblx0b3B0aW9uczoge1xuXHRcdG5hbWU6ICdjb250YWluZXInLFxuXG5cdFx0bm9kZTogbnVsbCxcblxuXHRcdHRhZzogJ2RpdicsXG5cdFx0LypyZXNpemFibGU6IGZhbHNlLFxuXHRcdHJlc2l6ZUJvcmRlcnM6IFsndG9wJywncmlnaHQnLCdib3R0b20nLCdsZWZ0J10qL1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbaW5pdGlhbGl6ZSBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdGNvbnN0cnVjdG9yOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0dGhpcy5zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG5cdFx0dGhpcy5vcHRpb25zID0gbWVyZ2VPYmplY3QoQ29udGFpbmVyLnBhcmVudC5vcHRpb25zLCB0aGlzLm9wdGlvbnMpO1xuXG5cdFx0dGhpcy5faW5pdEVsZW1lbnQoKTtcblxuXHRcdGlmICh0aGlzLm9wdGlvbnMuY29tcCkge1xuXHRcdFx0dGhpcy5faW5pdENvbXAodGhpcy5vcHRpb25zLmNvbXApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9pbml0Q29tcG9uZW50KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgaHRtbCBzdHJ1Y3R1cmUgYW5kIGluamVjdCBpdCB0byB0aGUgZG9tLlxuXHQgKiBUaGUgY29udGFpbmVyIGlzIF9pbml0RWxlbWVudCB3aXRoIHR3byBlbGVtZW50czogdGhlIHdyYXBwZXIgYW5kIHRoZSBjb250ZW50LlxuXHQgKiBJZiB0aGUgb3B0aW9uIHNjcm9sbCBpcyBzZXQgdG8gdHJ1ZSwgaXQgd2lsbCBhbHNvIGFkZCB0aGUgc2Nyb2xsYmFyIG9iamVjdFxuXHQgKiBAcmV0dXJuIHt2b2lkfVxuXHQgKi9cblx0X2luaXRFbGVtZW50OiBmdW5jdGlvbigpIHtcblx0XHRDb250YWluZXIucGFyZW50Ll9pbml0RWxlbWVudC5jYWxsKHRoaXMpO1xuXG5cdFx0dmFyIG9wdHMgPSB0aGlzLm9wdGlvbnM7XG5cdFx0dGhpcy5tZW51ID0ge307XG5cblx0XHRpZiAob3B0cy5oZWFkKSB7XG5cdFx0XHR0aGlzLl9pbml0SGVhZChvcHRzLmhlYWQpO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLm5hbWUgPT09ICd3aW5kb3cnKSB7XG5cdFx0XHR0aGlzLl9pbml0Qm9keSgpO1xuXHRcdH1cblx0XHRpZiAob3B0cy51c2VPdmVybGF5KSB7XG5cdFx0XHR0aGlzLl9pbml0T3ZlcmxheSgpO1xuXHRcdH1cblxuXHRcdGlmIChvcHRzLmZvb3QpIHtcblx0XHRcdHRoaXMuX2luaXRGb290KG9wdHMuZm9vdCk7XG5cdFx0fVxuXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdC8vIHRoaXMub24oJ2luamVjdGVkJywgZnVuY3Rpb24oKSB7XG5cdFx0Ly8gXHR2YXIgZGlyZWN0aW9uID0gc2VsZi5jb250YWluZXIuZ2V0U3R5bGUoJ2ZsZXgtZGlyZWN0aW9uJyk7XG5cdFx0Ly8gXHRfY29uc29sZS5sb2coJ2RpcmVjdGlvbicsIGRpcmVjdGlvbiwgdGhpcy5lbGVtZW50KTtcblx0XHQvLyB9KTtcblxuXHRcdGlmICh0aGlzLm9wdGlvbnMudXNlVW5kZXJsYXkpIHtcblx0XHRcdHRoaXMuX2luaXRVbmRlcmxheSgpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogW19pbml0Q29tcG9uZW50IGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHt2b2lkfVxuXHQgKi9cblx0X2luaXRDb21wb25lbnQ6IGZ1bmN0aW9uKCkge1xuXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5ub2RlID09PSBudWxsKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5ub2RlID0gW107XG5cblx0XHR0aGlzLmFkZENvbXBvbmVudCh0aGlzLm9wdGlvbnMubm9kZSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemUgaW50ZXJuYWwgY29udGFpbmVyIGNvbXBvbmVudHNcblx0ICogQHBhcmFtICB7TWl4aW59IGNvbXAgQ29tcGVuZW50IGRlc2NyaXB0aW9uXG5cdCAqIEByZXR1cm4ge3ZvaWR9XG5cdCAqL1xuXHRfaW5pdENvbXA6IGZ1bmN0aW9uKGNvbXApIHtcblx0XHQvL19sb2cuZGVidWcoJ19pbml0Q29tcCcsIGNvbXApO1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdGlmICh0eXBlT2YoY29tcCkgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aGlzLmFkZENvbXAoY29tcCk7XG5cdFx0fSBlbHNlIGlmICh0eXBlT2YoY29tcCkgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRfbG9nLmRlYnVnKCdvYmplY3QnKTtcblx0XHR9IGVsc2UgaWYgKHR5cGVPZihjb21wKSA9PT0gJ2FycmF5Jykge1xuXHRcdFx0Y29tcC5lYWNoKGZ1bmN0aW9uKG5hbWUpIHtcblx0XHRcdFx0c2VsZi5hZGRDb21wKG5hbWUpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBbYWRkQ29tcG9uZW50IGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuXHQgKi9cblx0YWRkQ29tcG9uZW50OiBmdW5jdGlvbihub2RlKSB7XG5cdFx0X2xvZy5kZWJ1ZygnYWRkQ29tcG9uZW50Jywgbm9kZSk7XG5cdFx0aWYgKCFub2RlLmNvbXBvbmVudCkge1xuXHRcdFx0bm9kZS5jb21wb25lbnQgPSAnY29udGFpbmVyJztcblx0XHR9XG5cblx0XHRub2RlLmNvbnRhaW5lciA9IHRoaXMuZWxlbWVudDtcblx0XHRub2RlLm1haW4gPSB0aGlzLm1haW47XG5cblx0XHQvL19sb2cuZGVidWcobm9kZSk7XG5cblx0XHR2YXIgY29udGFpbmVyID0gbmV3IENvbnRhaW5lcihub2RlKTtcblxuXHRcdHRoaXMub24oJ3Jlc2l6ZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29udGFpbmVyLmZpcmVFdmVudCgncmVzaXplJyk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLm5vZGUucHVzaChjb250YWluZXIpO1xuXHRcdHRoaXMubGF5b3V0W3RoaXMubWFpbl1bY29udGFpbmVyLm5hbWVdID0gY29udGFpbmVyO1xuXHRcdC8vdWkubm9kZVt0aGlzLm1haW5dW25vZGUubmFtZV0gPSBjb250YWluZXI7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtfaW5pdENvbXAgZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge3N0cmluZ30gbmFtZVxuXHQgKiBAcGFyYW0gIHtzdHJpbmd9IHBvc2l0aW9uXG5cdCAqIEBwYXJhbSAge0RPTUVsZW1lbnR9IGVsZW1lbnRcblx0ICogQHJldHVybiB7RE9NRWxlbWVudHx2b2lkfVxuXHQgKi9cblx0YWRkQ29tcDogZnVuY3Rpb24obmFtZSwgcG9zaXRpb24sIGVsZW1lbnQpIHtcblx0XHQvL19sb2cuZGVidWcoJ2FkZENvbXAnLCBuYW1lLCBwb3NpdGlvbiwgZWxlbWVudCk7XG5cdFx0cG9zaXRpb24gPSBwb3NpdGlvbiB8fCAnYm90dG9tJztcblx0XHRlbGVtZW50ID0gZWxlbWVudCB8fCB0aGlzLmVsZW1lbnQ7XG5cblx0XHQvL19sb2cuZGVidWcoJ19hZGRDb21wJywgbmFtZSk7XG5cblx0XHRpZiAoIWVsZW1lbnQpIHtcblx0XHRcdF9sb2cud2FybignQ29udGFpbmVyIGlzICcsIGVsZW1lbnQpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBjb21wID0gdGhpc1tuYW1lXSA9IG5ldyBDb21wb25lbnQoKVxuXHRcdFx0LmFkZENsYXNzKCdjb250YWluZXItJyArIG5hbWUpXG5cdFx0XHQuaW5qZWN0KGVsZW1lbnQpO1xuXG5cdFx0cmV0dXJuIGNvbXA7XG5cdFx0Lyp0aGlzLmFkZEV2ZW50cyh7XG5cdFx0XHRyZXNpemU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvL19sb2cuZGVidWcoJ3Jlc2l6ZSBmcm9tIGhlYWQnLCB0aGlzLCB0aGlzLmhlYWQuZ2V0U2l6ZSgpLnkrJ3B4Jyk7XG5cdFx0XHRcdHRoaXMuZWxlbWVudC5zZXRTdHlsZSgncGFkZGluZy10b3AnLCB0aGlzLmhlYWQuZ2V0U2l6ZSgpLnkrJ3B4Jyk7XG5cdFx0XHR9XG5cdFx0fSk7Ki9cblx0fSxcblxuXHQvKipcblx0ICogX2luaXRDbGFzcyBjb250YWluZXIgcmVsYXRlZCBjbGFzc1xuXHQgKiBAcmV0dXJuIHt2b2lkfVxuXHQgKi9cblx0X2luaXRDbGFzczogZnVuY3Rpb24oKSB7XG5cdFx0Q29udGFpbmVyLnBhcmVudC5faW5pdENsYXNzLmNhbGwodGhpcyk7XG5cblx0XHR0aGlzLmVsZW1lbnQuYWRkQ2xhc3MoJ3VpLWNvbnRhaW5lcicpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBjcmVhdGUgYW4gb3ZlcmxheSBkaXNwbGF5ZWQgd2hlbiBjb250YWluZXIgaXMgZGlzYWJsZWQgKHdoZW4gbW92ZWQgb3IgcmVzaXplZClcblx0ICogQHJldHVybiB7dm9pZH1cblx0ICovXG5cdF9pbml0SGVhZDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dGhpcy5oZWFkID0gbmV3IENvbXBvbmVudCgnZGl2Jylcblx0XHRcdC5hZGRDbGFzcygnY29udGFpbmVyLWhlYWQnKVxuXHRcdFx0LmluamVjdCh0aGlzLmVsZW1lbnQsICd0b3AnKVxuXHRcdFx0Lm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLmVtaXQoJ21heCcpO1xuXHRcdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtzZXRUaXRsZSBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRpdGxlXG5cdCAqL1xuXHRzZXRUaXRsZTogZnVuY3Rpb24odGl0bGUpIHtcblx0XHRpZiAodGhpcy50aXRsZSAmJiB0aGlzLmhlYWQpIHtcblx0XHRcdHJldHVybiB0aGlzLnRpdGxlLnNldCgndGV4dCcsIHRpdGxlKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtzZXRUaXRsZSBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7c3RyaW5nfVxuXHQgKi9cblx0Z2V0VGl0bGU6IGZ1bmN0aW9uKCkge1xuXHRcdC8vX2xvZy5kZWJ1ZygnZ2V0VGl0bGUnLCB0aGlzLnRpdGxlKTtcblx0XHRpZiAodGhpcy50aXRsZSkge1xuXHRcdFx0cmV0dXJuIHRoaXMudGl0bGUuZ2V0KCdodG1sJyk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX2luaXRGb290IGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcblx0ICogQHJldHVybiB7dm9pZH1cblx0ICovXG5cdF9pbml0Rm9vdDogZnVuY3Rpb24oIC8qb3B0aW9ucyovICkge1xuXG5cdFx0dGhpcy5mb290ID0gbmV3IEVsZW1lbnQoJ2RpdicsIHtcblx0XHRcdCdjbGFzcyc6ICdjb250YWluZXItZm9vdCdcblx0XHR9KS5pbmplY3QodGhpcy5lbGVtZW50LCAnYm90dG9tJyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtfaW5pdFN0YXR1cyBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7c3RyaW5nfSBjb21wb25lbnRcblx0ICogQHBhcmFtICB7c3RyaW5nfSBjb250ZXh0XG5cdCAqIEByZXR1cm4ge3ZvaWR9XG5cdCAqL1xuXHRfaW5pdFN0YXR1czogZnVuY3Rpb24oY29tcG9uZW50IC8qLCBjb250ZXh0Ki8gKSB7XG5cblx0XHRjb21wb25lbnQgPSBjb21wb25lbnQgfHwgJ2Zvb3QnO1xuXG5cdFx0aWYgKCF0aGlzW2NvbXBvbmVudF0pIHtcblx0XHRcdHRoaXNbJ19pbml0JyArIGNvbXBvbmVudC5jYXBpdGFsaXplKCldKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5zdGF0dXMgPSBuZXcgRWxlbWVudCgnZGl2Jywge1xuXHRcdFx0J2NsYXNzJzogJ2NvbnRhaW5lci1zdGF0dXMnXG5cdFx0fSkuaW5qZWN0KHRoaXNbY29tcG9uZW50XSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIGNyZWF0ZSBhbiBvdmVybGF5IGRpc3BsYXllZCB3aGVuIGNvbnRhaW5lciBpcyBkaXNhYmxlZCAod2hlbiBtb3ZlZCBvciByZXNpemVkKVxuXHQgKiBAcmV0dXJuIHt2b2lkfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRfaW5pdE92ZXJsYXk6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHRoaXMub3ZlcmxheSA9IG5ldyBFbGVtZW50KCdkaXYnLCB7XG5cdFx0XHQnY2xhc3MnOiAnY29udGFpbmVyLW92ZXJsYXknXG5cdFx0fSkuaW5qZWN0KHRoaXMuZWxlbWVudCk7XG5cblx0XHR0aGlzLmFkZEV2ZW50KCdvbkxvYWRDb21wbGV0ZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5vdmVybGF5LmhpZGUoKTtcblx0XHR9KTtcblxuXHRcdHRoaXMub3ZlcmxheS5oaWRlKCk7XG5cblx0XHR0aGlzLmFkZEV2ZW50cyh7XG5cdFx0XHRvbkJsdXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvL19sb2cuZGVidWcoJ2JsdXInKTtcblx0XHRcdFx0c2VsZi5vdmVybGF5LnNob3coKTtcblx0XHRcdH0sXG5cdFx0XHRvbkRyYWdDb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vX2xvZy5kZWJ1ZygnZGFyZyBjb20nLCB1aS53aW5kb3cudW5kZXJsYXkpO1xuXHRcdFx0XHRzZWxmLm92ZXJsYXkuaGlkZSgpO1xuXHRcdFx0fSxcblx0XHRcdG9uRHJhZ1N0YXJ0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly9fbG9nLmRlYnVnKCdkYXJnIHN0YXJ0JywgdGhpcyk7XG5cdFx0XHRcdHNlbGYub3ZlcmxheS5zaG93KCk7XG5cdFx0XHR9LFxuXHRcdFx0b25SZXNpemVDb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYub3ZlcmxheS5oaWRlKCk7XG5cdFx0XHRcdHRoaXMuY29vcmQgPSB0aGlzLmVsZW1lbnQuZ2V0Q29vcmRpbmF0ZXMoKTtcblx0XHRcdH0sXG5cdFx0XHRvblJlc2l6ZVN0YXJ0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi5vdmVybGF5LnNob3coKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogW19pbml0VW5kZXJsYXkgZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge3ZvaWR9XG5cdCAqL1xuXHRfaW5pdFVuZGVybGF5OiBmdW5jdGlvbigpIHtcblx0XHQvL19sb2cuZGVidWcoJ19pbml0VW5kZXJsYXknLCB0aGlzLmRldmljZSk7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dGhpcy51bmRlcmxheSA9IG5ldyBDb21wb25lbnQoe1xuXHRcdFx0J2NsYXNzJzogJ2RpYWxvZy11bmRlcmxheScsXG5cdFx0XHRzdHlsZXM6IHtcblx0XHRcdFx0ekluZGV4OiAxMCxcblx0XHRcdFx0Ly9kaXNwbGF5OiAnbm9uZSdcblx0XHRcdH1cblx0XHR9KS5pbmplY3QodGhpcy5lbGVtZW50LCAnYmVmb3JlJyk7XG5cblxuXHRcdHRoaXMudW5kZXJsYXkub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRfbG9nLmRlYnVnKCdjbGljayB1bmRlcmxheScpO1xuXHRcdFx0c2VsZi5taW5pbWl6ZSgpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbignY2xvc2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdHNlbGYudW5kZXJsYXkuZGVzdHJveSgpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbZm9jdXMgZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge3ZvaWR9XG5cdCAqL1xuXHRmb2N1czogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSgnZm9jdXMnKTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGFpbmVyO1xuIiwiLypcbm1hdGVyaWFsXG4gLSBvbyB1aSB0b29sa2l0XG4qL1widXNlIHN0cmljdFwiXG5cbnZhciBwcmltZSA9IHJlcXVpcmUoXCJwcmltZS9pbmRleFwiKSxcblx0T3B0aW9ucyA9IHJlcXVpcmUoJ3ByaW1lLXV0aWwvcHJpbWUvb3B0aW9ucycpLFxuXHRFbWl0dGVyID0gcmVxdWlyZShcInByaW1lL2VtaXR0ZXJcIiksXG5cdENvbnRhaW5lciA9IHJlcXVpcmUoJy4uL2NvbnRhaW5lcicpLFxuXHQkID0gcmVxdWlyZShcImVsZW1lbnRzXCIpO1xuXG52YXIgZGlzcGxheSA9IG5ldyBwcmltZSh7XG5cblx0LyoqXG5cdCAqIERpc3BsYXkgb3B0aW9ucyBmb3IgY29udGFpbmVyXG5cdCAqIEB0eXBlIHtPYmplY3R9IG9wdGlvbnNcblx0ICovXG5cdG9wdGlvbnM6IHtcblx0XHRkaXNwbGF5OiB7XG5cdFx0XHRmeDoge1xuXHRcdFx0XHRkZWZhdWx0OiB7XG5cdFx0XHRcdFx0ZHVyYXRpb246IDE2MCxcblx0XHRcdFx0ICAgIHRyYW5zaXRpb246ICdzaW5lOm91dCcsXG5cdFx0XHRcdCAgICBsaW5rOiAnY2FuY2VsJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRtaW5pbWl6ZToge1xuXHRcdFx0XHRcdGR1cmF0aW9uOiAxNjAsXG5cdFx0XHRcdCAgICB0cmFuc2l0aW9uOiAnc2luZTpvdXQnLFxuXHRcdFx0XHQgICAgbGluazogJ2NhbmNlbCdcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogW19pbml0RGlzcGxheSBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRfaW5pdERpc3BsYXk6IGZ1bmN0aW9uKCkge1xuIFx0XHQvL19sb2cuZGVidWcoJ19pbml0RGlzcGxheScsIHRoaXMuZWxlbWVudCk7XG5cbiBcdFx0dGhpcy5fbW9kaWZpZXIgPSAnd2lkdGgnO1xuXG4gXHRcdHZhciBkaXJlY3Rpb24gPSB0aGlzLmNvbnRhaW5lci5nZXRTdHlsZSgnZmxleC1kaXJlY3Rpb24nKTtcblxuXHRcdGlmIChkaXJlY3Rpb24gPT09ICdjb2x1bW4nKVxuXHRcdFx0dGhpcy5fbW9kaWZpZXIgPSAnaGVpZ2h0JztcblxuXHRcdC8vX2xvZy5kZWJ1ZygnZGlyZWN0aW9uJywgZGlyZWN0aW9uLCB0aGlzLl9tb2RpZmllcik7XG5cblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRvcHRzID0gdGhpcy5vcHRpb25zLmRpc3BsYXksXG5cdFx0XHRmeCA9IG9wdHMuZnguZGVmYXVsdCxcblx0XHRcdG1vZGlmaWVyID0gdGhpcy5fbW9kaWZpZXI7XG5cblx0XHRpZiAoIXRoaXNbbW9kaWZpZXJdKVxuXHRcdFx0dGhpc1ttb2RpZmllcl0gPSAyMjA7XG5cblx0XHR0aGlzLmRldmljZSA9IHRoaXMuZGV2aWNlIHx8ICdkZXNrdG9wJztcblx0XHQvL3RoaXMudW5kZXJsYXkuaGlkZSgpO1xuXHRcdHRoaXMuZGlzcGxheSA9IHt9O1xuXG5cdFx0ZngucHJvcGVydHkgPSBtb2RpZmllcjtcblxuXHRcdHRoaXMuZGlzcGxheS5meCA9IG5ldyBGeC5Ud2Vlbih0aGlzLmVsZW1lbnQsIGZ4KVxuXHRcdC5hZGRFdmVudCgnY29tcGxldGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdHNlbGYuZmlyZUV2ZW50KCd0b2dnbGVkJyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcy5kaXNwbGF5O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbZ2V0RGlzcGxheSBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRnZXREaXNwbGF5OiBmdW5jdGlvbigpIHtcblxuXHRcdHJldHVybiB0aGlzLl9kaXNwbGF5O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbZ2V0RGlzcGxheSBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRzZXREaXNwbGF5OiBmdW5jdGlvbihkaXNwbGF5KSB7XG5cblx0XHR0aGlzLl9kaXNwbGF5ID0gZGlzcGxheTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbdG9nZ2xlIGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdHRvZ2dsZTogZnVuY3Rpb24oKSB7XG5cdFx0Ly9fbG9nLmRlYnVnKCdfX3RvZ2dsZSBjbGljaywgZGlzcGxheScsIHRoaXMuX2Rpc3BsYXkpO1xuXG5cdFx0aWYgKHRoaXMuX2Rpc3BsYXkgPT09ICdub3JtYWxpemVkJyl7XG5cdFx0XHR0aGlzLm1pbmltaXplKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMubm9ybWFsaXplKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuX2Rpc3BsYXk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFttaW5pbWl6ZSBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRtaW5pbWl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0Ly9fbG9nLmRlYnVnKCctLS0tLS1zdGFydCBtaW5pbWFsaXphdGlvbicsIHRoaXMuZGV2aWNlKTtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHRcblx0XHRpZiAoIXRoaXMuZGlzcGxheSkge1xuXHRcdFx0dGhpcy5faW5pdERpc3BsYXkoKTtcblx0XHR9XG5cblx0XHR0aGlzLmZpcmVFdmVudCgnbWluaW1pemUnKTtcblxuXHRcdHRoaXMuZGlzcGxheS5meC5zdGFydCgwKTtcblxuXHRcdChmdW5jdGlvbigpeyBcblx0XHRcdC8vc2VsZi5lbGVtZW50LnNldFN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcblx0XHR9KS5kZWxheSgxNjApO1xuXG5cdFx0dGhpcy5fZGlzcGxheSA9ICdtaW5pbWl6ZWQnO1xuXG5cdFx0aWYgKHRoaXMudW5kZXJsYXkgJiYgdGhpcy5kZXZpY2UgIT0gJ2Rlc2t0b3AnKSB7XG5cdFx0XHR0aGlzLnVuZGVybGF5LmZhZGUoMCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5maXJlRXZlbnQoJ2Rpc3BsYXknLCAnbWluaW1pemVkJyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtub3JtYWxpemUgZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0bm9ybWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHQvLyBfbG9nLmRlYnVnKCdub3JtYWxpemUnKTtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0aWYgKCF0aGlzLmRpc3BsYXkpIHtcblx0XHRcdHRoaXMuX2luaXREaXNwbGF5KCk7XG5cdFx0fVxuXHRcdFxuXHRcdHRoaXMuZmlyZUV2ZW50KCdub3JtYWxpemUnKTtcblxuXHRcdC8vc2VsZi5lbGVtZW50LnNldFN0eWxlKCdkaXNwbGF5JywgJ2ZsZXgnKTtcblxuXHRcdHZhciBzaXplID0gdGhpc1t0aGlzLl9tb2RpZmllcl07XG5cblx0XHRpZiAodGhpcy5kaXNwbGF5LmZ4KSB7XG5cdFx0XHR0aGlzLmRpc3BsYXkuZnguc3RhcnQoc2l6ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZWxlbWVudC5zZXRTdHlsZSh0aGlzLl9tb2RpZmllciwgc2l6ZSk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLnVuZGVybGF5ICYmIHRoaXMuZGV2aWNlICE9ICdkZXNrdG9wJykge1xuXHRcdFx0Ly9fbG9nLmRlYnVnKCctLS0nLCB0aGlzLmRldmljZSk7XG5cdFx0XHR0aGlzLnVuZGVybGF5LnNob3coKTtcblx0XHRcdHRoaXMudW5kZXJsYXkuZmFkZSgxKTtcblx0XHR9XG5cdFx0dGhpcy5fZGlzcGxheSA9ICdub3JtYWxpemVkJztcblxuXHRcdHRoaXMuZmlyZUV2ZW50KCdkaXNwbGF5JywgJ25vcm1hbGl6ZWQnKTtcblx0fSxcblxuXHQvKipcblx0ICogW25vcm1hbGl6ZSBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRtYXhpbWl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0Ly9fbG9nLmRlYnVnKCdtYXhpbWl6ZScsIHNpemUpO1xuXG5cdFx0cmV0dXJuO1xuXHRcdHRoaXMudG9nZ2xlRnguc3RhcnQoc2l6ZSk7XG5cblx0XHR0aGlzLmVsZW1lbnQuc2V0U3R5bGUoJ2Rpc3BsYXknLCBudWxsKTtcblx0XHR0aGlzLmVsZW1lbnQuYWRkQ2xhc3MoJ3N0YXRlLWZvY3VzJyk7XG5cblx0XHR0aGlzLmlzT3BlbiA9IHRydWU7XG5cblx0XHR0aGlzLmZpcmVFdmVudCgnbWF4aW1pemVkJywgdGhpcyk7XG5cblxuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBkaXNwbGF5O1xuXG4iLCIvKlxubWF0ZXJpYWxcbiAtIG9vIHVpIHRvb2xraXRcbiovXCJ1c2Ugc3RyaWN0XCJcblxudmFyIHByaW1lID0gcmVxdWlyZShcInByaW1lL2luZGV4XCIpLFxuXHRPcHRpb25zID0gcmVxdWlyZSgncHJpbWUtdXRpbC9wcmltZS9vcHRpb25zJyksXG5cdEVtaXR0ZXIgPSByZXF1aXJlKFwicHJpbWUvZW1pdHRlclwiKSxcblx0bWVyZ2VPYmplY3QgPSByZXF1aXJlKFwibW91dC9vYmplY3QvbWVyZ2VcIiksXG5cdCQgPSByZXF1aXJlKFwiZWxlbWVudHNcIiksXG5cdHplbiA9IHJlcXVpcmUoJ2VsZW1lbnRzL3plbicpLFxuXHRDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb21wb25lbnQnKTtcblxudmFyIEJ1dHRvbiA9IHByaW1lKHtcblxuXHRtaXhpbjogW09wdGlvbnMsIEVtaXR0ZXJdLFxuXG5cdGluaGVyaXRzOiBDb21wb25lbnQsXG5cdG5hbWU6ICdidXR0b24nLFxuXHRvcHRpb25zOiB7XG5cdFx0XHRuYW1lOiAnYnV0dG9uJyxcblx0XHRcdHR5cGU6IG51bGwsIC8vIHB1c2gsIGZpbGVcblx0XHRcdGluazogdHJ1ZSxcblx0XHRcdGVsZW1lbnQ6IHtcblx0XHRcdFx0dGFnOiAnc3Bhbidcblx0XHRcdH0sXG5cdFx0XHRiaW5kaW5nOiB7XG5cdFx0XHRcdF9saXN0OiBbJ2VsZW1lbnQnXSxcblx0XHRcdFx0ZWxlbWVudDoge1xuXHRcdFx0XHRcdCdzZW5zb3IuY2xpY2snOiAnX29uQ2xpY2snLFxuXHRcdFx0XHRcdCdzZW5zb3IuZGJsY2xpY2snOiAnX29uRGJsQ2xpY2snLFxuXHRcdFx0XHRcdCdzZW5zb3IubW91c2Vkb3duJzogJ19vbk1vdXNlRG93bicsXG5cdFx0XHRcdFx0J3NlbnNvci5tb3VzZXVwJzogJ19vbk1vdXNlVXAnLFxuXHRcdFx0XHRcdCdzZW5zb3IubW91c2VsZWF2ZSc6ICdfb25Nb3VzZUxlYXZlJ1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHQvKipcblx0ICogQ29uc3RydWN0b3Jcblx0ICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdGNvbnN0cnVjdG9yOiBmdW5jdGlvbihvcHRpb25zKXtcblx0XHR0aGlzLnNldE9wdGlvbnMob3B0aW9ucyk7XG5cblx0XHR0aGlzLm9wdGlvbnMgPSBtZXJnZU9iamVjdChCdXR0b24ucGFyZW50Lm9wdGlvbnMsIHRoaXMub3B0aW9ucyk7XG5cblx0XHR0aGlzLl9pbml0RWxlbWVudCgpO1xuXHRcdHRoaXMuX2luaXRCaW5kaW5nKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXG5cblx0LyoqXG5cdCAqIFtzZXQgZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRzZXQ6IGZ1bmN0aW9uKCkge30sXG5cblx0LyoqXG5cdCAqIFtfaW5pdEVsZW1lbnQgZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge3ZvaWR9XG5cdCAqL1xuXHRfaW5pdEVsZW1lbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciAkID0gcmVxdWlyZSgnZWxlbWVudHMvYXR0cmlidXRlcycpO1xuXHRcdEJ1dHRvbi5wYXJlbnQuX2luaXRFbGVtZW50LmNhbGwodGhpcyk7XG5cblx0XHR2YXIgb3B0cyA9IHRoaXMub3B0aW9ucztcblx0XHR2YXIgdHlwZSA9IG9wdHMudHlwZTtcblxuXHRcdG9wdHMudGV4dCA9IG9wdHMudGV4dCB8fCBvcHRzLm47XG5cblx0XHRpZiAodHlwZSA9PT0gbnVsbCkge1xuXHRcdFx0dHlwZSA9ICdpY29uLXRleHQnO1xuXHRcdH1cblxuXHRcdC8qaWYgKG9wdHMudGV4dCAmJiB0eXBlICE9ICdpY29uJykge1xuXHRcdFx0dGhpcy5lbGVtZW50LnNldCgnaHRtbCcsIG9wdHMudGV4dCk7XG5cdFx0fSovXG5cdFx0Ly92YXIgdGV4dCA9IG9wdHMudHlwZS5tYXRjaCgvdGV4dC9nKTtcblxuXHRcdC8vIGlmIChvcHRzLm5hbWUpIHtcblx0XHQvLyBcdHRoaXMuZWxlbWVudC5hdHRyaWJ1dGVzKCdkYXRhLW5hbWUnLCBvcHRzLm5hbWUpO1xuXHRcdC8vIH1cblxuXG5cdFx0Ly90aGlzLmVsZW1lbnQuYXR0cmlidXRlcygndGl0bGUnLCBvcHRzLnRleHQpO1xuXG5cdFx0aWYgKG9wdHMuaWNvbikge1xuXHRcdFx0dGhpcy5faW5pdEljb24odHlwZSwgb3B0cy5pY29uIHx8IG9wdHMubmFtZSk7XG5cdFx0fVxuXG5cdFx0aWYgKG9wdHMudGV4dCkge1xuXHRcdFx0dGhpcy5faW5pdFRleHQodHlwZSk7XG5cdFx0fVxuXG5cdFx0aWYgKG9wdHMuaW5rKSB7XG5cdFx0XHR0aGlzLl9pbml0U2Vuc29yKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuc2Vuc29yID0gdGhpcy5lbGVtZW50O1xuXHRcdH1cblx0fSxcblxuXG5cdC8qKlxuXHQgKiBbX2luaXRJY29uIGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtzdHJpbmd9IHR5cGVcblx0ICogQHJldHVybiB7c3RyaW5nfVxuXHQgKi9cblx0X2luaXRJY29uOiBmdW5jdGlvbih0eXBlLCBuYW1lKSB7XG5cdFx0X2xvZy5kZWJ1ZygnX2luaXRJY29uJywgdHlwZSwgbmFtZSk7XG5cblx0XHR2YXIgdGFnID0gJ3NwYW4nO1xuXHRcdHZhciBjb2RlID0gbmFtZTtcblx0XHR2YXIga2xzcyA9IG51bGw7XG5cblx0XHR2YXIgcHJvcCA9IHtcblx0XHRcdCdjbGFzcyc6ICd1aS1pY29uJ1xuXHRcdH07XG5cblx0XHR0aGlzLmljb24gPSBuZXcgRWxlbWVudCh0YWcsIHByb3ApLmluamVjdCh0aGlzLmVsZW1lbnQpO1xuXG5cblx0XHRpZiAobW5tbC5pY29uLm1kaVtuYW1lXSkge1xuXHRcdFx0Ly9fbG9nLmRlYnVnKCdtZGknKTtcblx0XHRcdGtsc3MgPSAnaWNvbi1tZGknO1xuXHRcdFx0Y29kZSA9IG1ubWwuaWNvbi5tZGlbbmFtZV07XG5cdFx0fSBlbHNlIGlmIChtbm1sLmljb24uZm9udFtuYW1lXSkge1xuXHRcdFx0Ly9fbG9nLmRlYnVnKCdpb2NuIGZvbnQgbmFtZScsIG5hbWUpO1xuXHRcdFx0a2xzcyA9ICdpY29uLWZvbnQnO1xuXHRcdFx0Y29kZSA9IG1ubWwuaWNvbi5mb250W25hbWVdO1xuXHRcdH1cblxuXHRcdGlmIChrbHNzKSB7XG5cdFx0XHR0aGlzLmljb24uYWRkQ2xhc3Moa2xzcyk7XG5cdFx0fVxuXG5cdFx0aWYgKGNvZGUpIHtcblx0XHRcdHRoaXMuaWNvbi5hZGRDbGFzcyhjb2RlKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtfaW5pdFRleHQgZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge3N0cmluZ30gdHlwZVxuXHQgKiBAcmV0dXJuIHt2b2lkfVxuXHQgKi9cblx0X2luaXRUZXh0OiBmdW5jdGlvbih0eXBlKSB7XG5cdFx0dmFyIG9wdHMgPSB0aGlzLm9wdGlvbnM7XG5cblx0XHR2YXIgdGFnID0gJ3NwYW4nO1xuXG5cdFx0dmFyIHBvcyA9ICdib3R0b20nO1xuXHRcdGlmICh0eXBlID09PSAndGV4dC1pY29uJykge1xuXHRcdFx0cG9zID0gJ3RvcCc7XG5cdFx0fVxuXG5cdFx0dGhpcy50ZXh0ID0gbmV3IEVsZW1lbnQodGFnLCB7XG5cdFx0XHQnY2xhc3MnOiAndWktdGV4dCcsXG5cdFx0XHQnaHRtbCc6IG9wdHMudGV4dFxuXHRcdH0pLmluamVjdCh0aGlzLmVsZW1lbnQsIHBvcyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtfaW5pdENsYXNzIGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHt2b2lkfVxuXHQgKi9cblx0X2luaXRDbGFzczogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIG9wdHMgPSB0aGlzLm9wdGlvbnM7XG5cdFx0Ly9fbG9nLmRlYnVnKHRoaXMubmFtZSk7XG5cblx0XHRpZiAodGhpcy5vcHRpb25zLmlzUHJpbWFyeSkge1xuXHRcdFx0dGhpcy5lbGVtZW50LmFkZENsYXNzKCdpcy1wcmltYXJ5Jyk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5rbHNzKSB7XG5cdFx0XHR0aGlzLmVsZW1lbnQuYWRkQ2xhc3Mob3B0cy5rbHNzKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5vcHRpb25zLnR5cGUpIHtcblx0XHRcdHRoaXMuZWxlbWVudC5hZGRDbGFzcygndHlwZS0nICsgdGhpcy5vcHRpb25zLnR5cGUpO1xuXHRcdH1cblxuXHRcdHRoaXMuZWxlbWVudC5hZGRDbGFzcyhvcHRzLnByZWZpeCArIHRoaXMubmFtZSk7XG5cblx0XHRpZiAodGhpcy5vcHRpb25zLmNsc3MpIHtcblx0XHRcdHRoaXMuZWxlbWVudC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuY2xzcyk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX2luaXRUZXh0IGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHt2b2lkfVxuXHQgKi9cblx0X2luaXRTZW5zb3I6IGZ1bmN0aW9uKCkge1xuXHRcdC8vX2xvZy5kZWJ1ZygnX2luaXRTZW5zb3InKTtcblxuXHRcdHRoaXMuc2Vuc29yID0gbmV3IENvbXBvbmVudCgnZGl2Jywge1xuXHRcdFx0dGFnOiAnZGl2Jyxcblx0XHRcdCdjbGFzcyc6ICd1aS1zZW5zb3InLFxuXHRcdH0pLmluamVjdCh0aGlzLmVsZW1lbnQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX2luaXRFZmZlY3QgZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge3N0cmluZ30gaW5rXG5cdCAqIEBwYXJhbSAge3N0cmluZ30geFxuXHQgKiBAcGFyYW0gIHtzdHJpbmd9IHlcblx0ICogQHBhcmFtICB7T2JqZWN0fSBjb29yZFxuXHQgKiBAcmV0dXJuIHt2b2lkfVxuXHQgKi9cblx0X3RvdWNoSW5rOiBmdW5jdGlvbihpbmssIHgsIHksIGNvb3JkKSB7XG5cdFx0dmFyIHNpemUgPSBjb29yZC5oZWlnaHQ7XG5cdFx0dmFyIHRvcCA9IDA7XG5cdFx0dmFyIGR1cmF0aW9uID0gMTAwMDtcblxuXHRcdHRoaXMuaW5rID0gaW5rO1xuXG5cdFx0aWYgKGNvb3JkLndpZHRoID4gc2l6ZSkge1xuXHRcdFx0c2l6ZSA9IGNvb3JkLndpZHRoO1xuXHRcdFx0dG9wID0gKGNvb3JkLmhlaWdodCAtIGNvb3JkLndpZHRoKSAvIDI7XG5cdFx0fVxuXG5cdFx0dmFyIGZ4ID0gbmV3IEZ4Lk1vcnBoKGluaywge1xuXHRcdFx0ZHVyYXRpb246IGR1cmF0aW9uLFxuXHRcdFx0bGluazogJ2NoYWluJyxcblx0XHRcdHRyYW5zaXRpb246IEZ4LlRyYW5zaXRpb25zLlF1YXJ0LmVhc2VPdXRcblx0XHR9KTtcblxuXHRcdGZ4LnN0YXJ0KHtcblx0XHRcdGhlaWdodDogc2l6ZSxcblx0XHRcdHdpZHRoOiBzaXplLFxuXHRcdFx0bGVmdDogMCxcblx0XHRcdHRvcDogdG9wLFxuXHRcdFx0b3BhY2l0eTogMFxuXHRcdH0pO1xuXG5cdFx0KGZ1bmN0aW9uKCkge1xuXHRcdFx0aW5rLmRlc3Ryb3koKTtcblx0XHR9KS5kZWxheShkdXJhdGlvbik7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtfb25FbGVtZW50TW91c2VEb3duIGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtldmVudH0gZVxuXHQgKiBAcmV0dXJuIHt2b2lkfVxuXHQgKi9cblx0X29uQ2xpY2s6IGZ1bmN0aW9uKGUpIHtcblx0XHQvL19sb2cuZGVidWcoJ19vbkVsZW1lbnRDbGljaycsIGUpO1xuXG5cdFx0dmFyIG9wdHMgPSB0aGlzLm9wdGlvbnM7XG5cblx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXG5cdFx0aWYgKG9wdHMuZW1pdCAmJiB0aGlzLnN0YXRlICE9PSAnZGlzYWJsZWQnKSB7XG5cdFx0XHR0aGlzLmZpcmVFdmVudChvcHRzLmVtaXQpO1xuXHRcdH1cblx0XHR0aGlzLmZpcmVFdmVudCgncHJlc3MnLCBvcHRzLmVtaXQpO1xuXHRcdHRoaXMuZmlyZUV2ZW50KCdwcmVzc2VkJywgb3B0cy5lbWl0KTtcblxuXHRcdGlmIChvcHRzLmNhbGwgJiYgdGhpcy5zdGF0ZSAhPT0gJ2Rpc2FibGVkJykge1xuXHRcdFx0b3B0cy5jYWxsKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX29uRWxlbWVudE1vdXNlRG93biBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7ZXZlbnR9IGVcblx0ICogQHJldHVybiB7dm9pZH1cblx0ICovXG5cdF9vbkRibENsaWNrOiBmdW5jdGlvbihlKSB7XG5cdFx0dmFyIG9wdHMgPSB0aGlzLm9wdGlvbnM7XG5cblx0XHRlLnN0b3AoKTtcblxuXHRcdGlmIChvcHRzLmVtaXQgJiYgdGhpcy5zdGF0ZSAhPT0gJ2Rpc2FibGVkJykge1xuXHRcdFx0dGhpcy5lbWl0KCdkYmxwcmVzcycsIG9wdHMuZW1pdCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5lbWl0KCdkYmxwcmVzc2VkJywgb3B0cy5lbWl0KTtcblx0fSxcblxuXHQvKipcblx0ICogW19vbkVsZW1lbnRNb3VzZURvd24gZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge2V2ZW50fSBlXG5cdCAqIEByZXR1cm4ge09iamVjdH1cblx0ICovXG5cdF9vbk1vdXNlRG93bjogZnVuY3Rpb24oZSkge1xuXHRcdC8vX2xvZy5kZWJ1ZygnX29uRWxlbWVudE1vdXNlRG93bicsIGUpO1xuXG5cdFx0ZS5zdG9wKCk7XG5cblx0XHRpZiAodGhpcy5zdGF0ZSA9PT0gJ2Rpc2FibGVkJykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciB4ID0gZS5ldmVudC5vZmZzZXRYO1xuXHRcdHZhciB5ID0gZS5ldmVudC5vZmZzZXRZO1xuXG5cdFx0dmFyIGNvb3JkID0gdGhpcy5lbGVtZW50LmdldENvb3JkaW5hdGVzKHRoaXMuZWxlbWVudCk7XG5cblx0XHR2YXIgaW5rID0gdGhpcy5pbmsgPSBuZXcgRWxlbWVudCgnc3BhbicsIHtcblx0XHRcdGNsYXNzOiAndWktaW5rJyxcblx0XHRcdHN0eWxlczoge1xuXHRcdFx0XHRsZWZ0OiB4LFxuXHRcdFx0XHR0b3A6IHlcblx0XHRcdH1cblx0XHR9KS5pbmplY3QodGhpcy5lbGVtZW50LCAndG9wJyk7XG5cblx0XHR0aGlzLl90b3VjaEluayhpbmssIHgsIHksIGNvb3JkKTtcblxuXHRcdHRoaXMuZmlyZUV2ZW50KCdtb3VzZWRvd24nKTtcblx0fSxcblxuXHQvKipcblx0ICogW19vbkVsZW1lbnRNb3VzZURvd24gZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge2V2ZW50fSBlXG5cdCAqIEByZXR1cm4ge3ZvaWR9XG5cdCAqL1xuXHRfb25Nb3VzZUxlYXZlOiBmdW5jdGlvbihlKSB7XG5cdFx0Ly9fbG9nLmRlYnVnKCdfb25Nb3VzZUxlYXZlJywgZSk7XG5cblxuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX29uRWxlbWVudE1vdXNlRG93biBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7ZXZlbnR9IGVcblx0ICogQHJldHVybiB7dm9pZH1cblx0ICovXG5cdF9vbk1vdXNlRW50ZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHQvL19sb2cuZGVidWcoJ19vbkVsZW1lbnRNb3VzZURvd24nLCBlKTtcblxuXG5cdH0sXG5cblx0LyoqXG5cdCAqIFtfb25FbGVtZW50TW91c2VVcCBkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7dm9pZH1cblx0ICovXG5cdF9vbk1vdXNlVXA6IGZ1bmN0aW9uKGUpIHtcblx0XHQvL19sb2cuZGVidWcoJ19vbkVsZW1lbnRNb3VzZVVwJywgZSk7XG5cblx0XHRpZiAodGhpcy5vcHRpb25zLnR5cGUgPT09ICdjaGVjaycpIHtcblx0XHRcdGlmICh0aGlzLnN0YXRlID09PSAnY2hlY2tlZCcpIHtcblx0XHRcdFx0dGhpcy5zZXRTdGF0ZShudWxsKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuc2V0U3RhdGUoJ2NoZWNrZWQnKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvL3RoaXMucmVhY3QuZGVzdHJveSgpO1xuXHR9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbjtcbiIsIi8qXG5tYXRlcmlhbFxuIC0gb28gdWkgdG9vbGtpdFxuKi9cInVzZSBzdHJpY3RcIlxuXG52YXIgcHJpbWUgPSByZXF1aXJlKFwicHJpbWUvaW5kZXhcIiksXG5cdE9wdGlvbnMgPSByZXF1aXJlKCdwcmltZS11dGlsL3ByaW1lL29wdGlvbnMnKSxcblx0RW1pdHRlciA9IHJlcXVpcmUoXCJwcmltZS9lbWl0dGVyXCIpLFxuXHRDb250YWluZXIgPSByZXF1aXJlKCcuLi9jb250YWluZXInKSxcblx0JCA9IHJlcXVpcmUoXCJlbGVtZW50c1wiKTtcblxudmFyIGNvbXBvbmVudCA9IG5ldyBwcmltZSh7XG5cblx0bWl4aW46IFtPcHRpb25zLCBFbWl0dGVyXSxcblxuXHRvcHRpb25zOiB7XG5cdFx0cmVzaXplcjoge1xuXHRcdFx0bW9kaWZpZXI6IHtcblx0XHRcdFx0cm93OiB7XG5cdFx0XHRcdFx0c2l6ZTogJ3dpZHRoJyxcblx0XHRcdFx0XHRmcm9tOiAnbGVmdCcsXG5cdFx0XHRcdFx0bW9kZToge1xuXHRcdFx0XHRcdFx0eTogZmFsc2Vcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNvbHVtbjoge1xuXHRcdFx0XHRcdHNpemU6ICdoZWlnaHQnLFxuXHRcdFx0XHRcdGZyb206ICd0b3AnLFxuXHRcdFx0XHRcdG1vZGU6IHtcblx0XHRcdFx0XHRcdHg6IGZhbHNlXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBJbnN0YW5jaWF0ZSB0aGUgZ2l2ZW4gb2JqZWN0IGNvbXBcblx0ICogQHBhcmFtICB7b2JqZWN0XX0gY29tcCBsaXN0IGNvbXBvbmVudFxuXHQgKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0X2luaXRDb21wb25lbnQ6IGZ1bmN0aW9uKGNvbXApIHtcblx0XHRjb25zb2xlLmxvZygnX2luaXRDb21wb25lbnQnLCBjb21wLm9wdHMubmFtZSwgY29tcCk7XG5cblx0XHQvLyBzaG9ydGN1dHNcblx0XHRjb21wLm9wdHMuZmxleCA9IGNvbXAub3B0cy5mbGV4IHx8IGNvbXAuZmxleDtcblx0XHRjb21wLm9wdHMuaGlkZSA9IGNvbXAub3B0cy5oaWRlIHx8IGNvbXAuaGlkZTtcblx0XHRjb21wLm9wdHMudGhlbWUgPSBjb21wLm9wdHMudGhlbWUgfHwgY29tcC50aGVtZTtcblxuXHRcdC8vX2xvZy5kZWJ1ZygnY29tcCcsIGNvbXAuY2xzcyk7XG5cblx0XHR2YXIgbmFtZSA9IGNvbXAub3B0cy5uYW1lO1xuXHRcdC8vdmFyIGNsc3MgPSBhcGkuc3RyVG9DbHNzKGNvbXAuY2xzcyk7XG5cblx0XHQvL2NvbXAub3B0cy5jb250YWluZXIgPSBjb21wLmNvbnRhaW5lcjtcblx0XHR2YXIgY29tcG9uZW50ID0gdGhpcy5jb21wb25lbnRbbmFtZV0gPSB0aGlzW25hbWVdID0gbmV3IENvbnRhaW5lcihjb21wLm9wdHMpO1xuXHRcdFxuXHRcdC8vX2xvZy5kZWJ1Zyhjb21wb25lbnQuY29udGFpbmVyKTtcblxuXHRcdC8vIHJlZ2lzdGVyIGNvbXBvbmVudFxuXHRcdHRoaXMuX2NvbXBvbmVudFJlZ2lzdGVyKG5hbWUsIGNvbXBvbmVudCk7XG5cblx0XHQvL3NldHRpbmdzXG5cdFx0Ly90aGlzLl9pbml0Q29tcG9uZW50U2V0dGluZ3MoY29tcG9uZW50KTtcblxuXHRcdC8vIHN0eWxlcyBhbmQgc2l6ZVxuXHRcdHRoaXMuX3NldENvbXBvbmVudFN0eWxlcyhjb21wb25lbnQpO1xuXHRcdHRoaXMuX3NldENvbXBvbmVudERpc3BsYXkoY29tcG9uZW50KTtcblx0XHR0aGlzLl9hdHRhY2hDb21wb25lbnRFdmVudHMoY29tcG9uZW50KTtcblxuXHRcdC8vIFxuXHRcdFxuXHRcdHJldHVybiBjb21wb25lbnQ7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtfY29tcG9uZW50UmVnaXN0ZXIgZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge1t0eXBlXX0gbmFtZSAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7W3R5cGVdfSBjb21wb25lbnQgW2Rlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgICAgICBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRfY29tcG9uZW50UmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUsIGNvbXBvbmVudCkge1xuXHRcdC8vX2xvZy5kZWJ1ZygnX2NvbXBvbmVudFJlZ2lzdGVyJywgbmFtZSwgY29tcG9uZW50KTtcblxuXHRcdHRoaXMuY29tcG9uZW50cyA9IHRoaXMuY29tcG9uZW50cyB8fCBbXTtcblx0XHR0aGlzLmNvbXBvbmVudHMucHVzaChjb21wb25lbnQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX2luaXRDb21wb25lbnRTZXR0aW5ncyBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7b2JqZWN0fSBuYW1lICAgW2Rlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtbdHlwZV19IG9iamVjdCBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdF9pbml0Q29tcG9uZW50U2V0dGluZ3M6IGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuXHRcdC8vX2xvZy5kZWJ1ZygnX2luaXRjb21wU2V0dGluZ3MnLCBjb21wb25lbnQpO1xuXG5cdFx0dmFyIG5hbWUgPSBjb21wb25lbnQuZ2V0TmFtZSgpO1xuXHRcdHZhciBlbGVtZW50ID0gY29tcG9uZW50LmVsZW1lbnQ7XG5cdFxuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX2luaXRDb21wb25lbnRTZXR0aW5ncyBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7b2JqZWN0fSBuYW1lICAgW2Rlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtbdHlwZV19IG9iamVjdCBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdF9zZXRDb21wb25lbnRTdHlsZXM6IGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuXHRcdC8vX2xvZy5kZWJ1ZygnX3NldENvbXBvbmVudFN0eWxlcycsIGNvbXBvbmVudCk7XG5cblx0XHRpZiAoY29tcG9uZW50Lm9wdGlvbnMuZmxleCkge1xuXHRcdFx0Ly9jb21wb25lbnQuZWxlbWVudC5zZXRTdHlsZSgnZmxleCcsIGNvbXBvbmVudC5vcHRpb25zLmZsZXgpO1xuXHRcdFx0Y29tcG9uZW50LmVsZW1lbnQuYWRkQ2xhc3MoJ2ZsZXgtJytjb21wb25lbnQub3B0aW9ucy5mbGV4KTtcblx0XHR9XG5cblx0XHRpZiAoY29tcG9uZW50Lm9wdGlvbnMuaGlkZSkge1xuXHRcdFx0Y29tcG9uZW50LmVsZW1lbnQuc2V0U3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuXG5cdFx0fVxuXG5cdFx0aWYgKGNvbXBvbmVudC5vcHRpb25zLnRoZW1lKSB7XG5cdFx0XHRjb21wb25lbnQuZWxlbWVudC5hZGRDbGFzcygndGhlbWUnICsgJy0nICsgY29tcG9uZW50Lm9wdGlvbnMudGhlbWUpO1xuXG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX2luaXRTaXplIGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtbdHlwZV19IG5hbWUgICBbZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge1t0eXBlXX0gb2JqZWN0IFtkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSAgICAgICAgW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0X3NldENvbXBvbmVudERpc3BsYXk6IGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuXHRcdC8vX2xvZy5kZWJ1ZygnY29tcCBvcHRzJywgY29tcG9uZW50Lm9wdGlvbnMpO1xuXHRcdHZhciBkaXNwbGF5ID0gJ25vcm1hbGl6ZWQnO1xuXG5cdFx0XG5cdFx0dmFyIG5hbWUgPSBjb21wb25lbnQuZ2V0TmFtZSgpO1xuXHRcdHZhciBlbGVtZW50ID0gY29tcG9uZW50LmVsZW1lbnQ7XG5cblx0XHRpZiAodGhpcy5zZXR0aW5nc1tuYW1lXSAmJiB0aGlzLnNldHRpbmdzW25hbWVdLmRpc3BsYXkpIHtcblx0XHRcdGRpc3BsYXkgPSB0aGlzLnNldHRpbmdzW25hbWVdLmRpc3BsYXk7XG5cdFx0fVxuXG5cdFx0Y29tcG9uZW50LnNldERpc3BsYXkoZGlzcGxheSwgJ3dpZHRoJyk7XG5cblx0XHRpZiAoY29tcG9uZW50Lm9wdGlvbnMuZmxleCkge1xuXHRcdFx0Ly9fbG9nLmRlYnVnKCctLS1mbGV4JywgbmFtZSwgY29tcG9uZW50Lm9wdGlvbnMpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLnNldHRpbmdzW25hbWVdICYmIHRoaXMuc2V0dGluZ3NbbmFtZV0ud2lkdGgpIHtcblx0XHRcdFx0Ly9fbG9nLmRlYnVnKCdzZXR0aW5ncycsIG5hbWUsIGRpc3BsYXkpO1xuXHRcdFx0XHQvL2VsZW1lbnQuc2V0U3R5bGUoJ2ZsZXgnLCAnbm9uZScpO1xuXHRcdFx0XHRlbGVtZW50LmFkZENsYXNzKCdmbGV4LW5vbmUnKTtcblx0XHRcdFx0aWYgKGRpc3BsYXkgPT09ICdtaW5pbWl6ZWQnKSB7XG5cdFx0XHRcdFxuXHRcdFx0XHRcdGVsZW1lbnQuc2V0U3R5bGUoJ3dpZHRoJywgMCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKHRoaXMuc2V0dGluZ3NbbmFtZV0ud2lkdGggPCAzMilcblx0XHRcdFx0XHRcdHRoaXMuc2V0dGluZ3NbbmFtZV0ud2lkdGggPSAzMjtcblxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vX2xvZy5kZWJ1ZygnLS0tLScsIG5hbWUsIGVsZW1lbnQpO1xuXHRcdFx0XHRcdGVsZW1lbnQuc2V0U3R5bGUoJ3dpZHRoJywgdGhpcy5zZXR0aW5nc1tuYW1lXS53aWR0aCB8fCAxNjApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29tcG9uZW50LndpZHRoID0gdGhpcy5zZXR0aW5nc1tuYW1lXS53aWR0aCB8fCAyMDA7XG5cdFx0XHRcdGNvbXBvbmVudC5fbW9kaWZpZXIgPSAnd2lkdGgnO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzLnNldHRpbmdzW25hbWVdICYmIHRoaXMuc2V0dGluZ3NbbmFtZV0uaGVpZ2h0KSB7XG5cdFx0XHRcdGVsZW1lbnQuc2V0U3R5bGUoJ2ZsZXgnLCAnbm9uZScpO1xuXHRcdFx0XHRlbGVtZW50LnNldFN0eWxlKCdoZWlnaHQnLCB0aGlzLnNldHRpbmdzW25hbWVdLmhlaWdodCk7XG5cdFx0XHRcdGNvbXBvbmVudC5oZWlnaHQgPSB0aGlzLnNldHRpbmdzW25hbWVdLmhlaWdodCB8fCAxNjA7XG5cdFx0XHRcdGNvbXBvbmVudC5fbW9kaWZpZXIgPSAnaGVpZ2h0Jztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5faW5pdFJlc2l6ZXIoY29tcG9uZW50KTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtfYXR0YWNoQ29tcG9uZW50RXZlbnRzIGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtbdHlwZV19IG9iamVjdCBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdF9hdHRhY2hDb21wb25lbnRFdmVudHM6IGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgbmFtZSA9IGNvbXBvbmVudC5nZXROYW1lKCk7XG5cblx0XHRjb21wb25lbnQub24oe1xuXHRcdFx0dG9nZ2xlZDogIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvL19sb2cuZGVidWcoJ3RvZ2dsZWQnKTtcblx0XHRcdFx0c2VsZi5maXJlRXZlbnQoJ3Jlc2l6ZScpO1xuXHRcdFx0fSxcblx0XHRcdHJlc2l6aW5nOiAgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vX2xvZy5kZWJ1ZygndG9nZ2xlZCcpO1xuXHRcdFx0XHRzZWxmLmZpcmVFdmVudCgncmVzaXplJyk7XG5cdFx0XHR9LFxuXHRcdFx0ZGlzcGxheTogZnVuY3Rpb24oc3RhdGUpIHtcblx0XHRcdFx0Ly9fbG9nLmRlYnVnKCdkaXNwbGF5JywgbmFtZSwgc3RhdGUpO1xuXHRcdFx0XHRzZWxmLmZpcmVFdmVudCgnZGlzcGxheScsIFtuYW1lLCBzdGF0ZV0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih7XG5cdFx0XHRyZXNpemU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb21wb25lbnQuZmlyZUV2ZW50KCdyZXNpemUnKTtcblx0XHRcdH0sXG5cdFx0XHRkcmFnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29tcG9uZW50LmZpcmVFdmVudCgncmVzaXplJyk7XG5cdFx0XHR9LFxuXHRcdFx0bm9ybWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29tcG9uZW50LmZpcmVFdmVudCgncmVzaXplJyk7XG5cdFx0XHR9LFxuXHRcdFx0bWF4aW1pemU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb21wb25lbnQuZmlyZUV2ZW50KCdyZXNpemUnKTtcblx0XHRcdH0sXG5cdFx0XHRtaW5pbWl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbXBvbmVudC5maXJlRXZlbnQoJ3Jlc2l6ZScpO1xuXHRcdFx0fSxcblx0XHRcdGRldmljZTogZnVuY3Rpb24oZGV2aWNlKSB7XG5cdFx0XHRcdC8vX2xvZy5kZWJ1ZygnZGV2aWNlJywgZGV2aWNlKTtcblx0XHRcdFx0Y29tcG9uZW50LmZpcmVFdmVudCgnZGV2aWNlJywgZGV2aWNlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29tcG9uZW50O1xuIiwiLypcbm1hdGVyaWFsXG4gLSBvbyB1aSB0b29sa2l0XG4qL1widXNlIHN0cmljdFwiXG5cbnZhciBwcmltZSA9IHJlcXVpcmUoXCJwcmltZS9pbmRleFwiKSxcblx0T3B0aW9ucyA9IHJlcXVpcmUoJ3ByaW1lLXV0aWwvcHJpbWUvb3B0aW9ucycpLFxuXHRFbWl0dGVyID0gcmVxdWlyZShcInByaW1lL2VtaXR0ZXJcIiksXG5cdCQgPSByZXF1aXJlKFwiZWxlbWVudHNcIiksXG5cdHplbiA9IHJlcXVpcmUoJ2VsZW1lbnRzL3plbicpLFxuXHRDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb21wb25lbnQnKSxcblx0Q29udGFpbmVyID0gcmVxdWlyZSgnLi4vY29udGFpbmVyJyksXG5cdGNvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2xheW91dC9jb21wb25lbnQnKSxcblx0cmVzaXplID0gcmVxdWlyZSgnLi4vbGF5b3V0L3Jlc2l6ZScpO1xuXG52YXIgTGF5b3V0ID0gbmV3IHByaW1lKHtcblxuXHRtaXhpbjogW09wdGlvbnMsIEVtaXR0ZXIsIGNvbXBvbmVudCwgcmVzaXplXSxcblxuXHRuYW1lOiAnbGF5b3V0Jyxcblx0LyoqXG5cdCAqIExheW91dCBvcHRpb25zXG5cdCAqIEB0eXBlIHtPYmplY3R9XG5cdCAqIEBwYXJhbSB7bmFtZX0gW25hbWVdIGxheW91dFxuXHQgKiBAcGFyYW0ge09iamVjdH0gW2Nsc3NdIERlZmF1bHQgY29tcG9uZW50IGNsYXNzXG5cdCAqL1xuXHRvcHRpb25zOiB7XG5cdFx0bmFtZTogJ2xheW91dCcsXG5cdFx0bm9kZToge1xuXHRcdFx0X25hbWU6ICdzdGFuZGFyZCcsXG5cdFx0XHRfbGlzdDogWyduYXZpJywgJ21haW4nLCAnc2lkZSddLFxuXHRcdFx0bWFpbjoge1xuXHRcdFx0XHRmbGV4OiAnMSdcblx0XHRcdH0sXG5cdFx0XHRuYXZpOiB7XG5cdFx0XHRcdHRoZW1lOiAnZGFyaydcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtjb25zdHJ1Y3RvciBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSAgICAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdGNvbnN0cnVjdG9yOiBmdW5jdGlvbihvcHRpb25zKXtcblx0XHR0aGlzLnNldE9wdGlvbnMob3B0aW9ucyk7XG5cblx0XHR0aGlzLl9pbml0TGF5b3V0KHRoaXMub3B0aW9ucyk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogW19pbml0TGF5b3V0IGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdF9pbml0TGF5b3V0OiBmdW5jdGlvbihvcHRzKSB7XG5cdFx0Ly9fbG9nLmRlYnVnKCdpbml0aWFsaXplJywgb3B0cyk7XG5cdFx0dmFyIG5vZGUgPSBvcHRzLm5vZGU7XG5cdFx0dGhpcy5zZXR0aW5ncyA9IG9wdHMuc2V0dGluZ3MgfHwge307XG5cdFx0dGhpcy5jb21wb25lbnQgPSB7fTtcblx0XHR0aGlzLmNvbXBvbmVudHMgPSBbXTtcblx0XHR0aGlzLnJlc2l6ZXIgPSB7fTtcblxuXHRcdHRoaXMuX2luaXRDb250YWluZXIob3B0cyk7XG5cblx0XHRjb25zb2xlLmxvZygncmVuZGVyJywgbm9kZSk7XG5cblx0XHR0aGlzLnJlbmRlcihub2RlKTtcblx0XHR0aGlzLl9pbml0RXZlbnRzKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFtfaW5pdEV2ZW50cyBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7W3R5cGVdfSBvcHRzIFtkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdF9pbml0RXZlbnRzOiBmdW5jdGlvbihvcHRzKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0Ly8gJCh3aW5kb3cpLm9uKCdyZXNpemUnLCBmdW5jdGlvbigpIHtcblx0XHQvLyBcdC8vX2xvZy5kZWJ1ZygnbGF5b3V0IHJlc2l6ZScsIHRoaXMuY29udGFpbmVyLmdldENvb3JkaW5hdGVzKCkpO1xuXHRcdC8vIFx0dmFyIGNvb3JkID0gc2VsZi5jb250YWluZXIuZ2V0Q29vcmRpbmF0ZXMoKTtcblx0XHQvLyBcdGlmIChjb29yZC53aWR0aCA8IDcyMCAmJiBzZWxmLm5hdmkpIHtcblx0XHQvLyBcdFx0c2VsZi5uYXZpLm1pbmltaXplKCk7XG5cdFx0Ly8gXHRcdC8vc2VsZi5yZXNpemVyLm5hdmkuaGlkZSgpO1xuXHRcdC8vIFx0fVxuXHRcdC8vIFx0c2VsZi5lbWl0KCdkcmFnJyk7XG5cdFx0Ly8gfSk7XG5cblxuXHRcdC8vIChmdW5jdGlvbigpIHtcblx0XHQvLyBcdHNlbGYuZW1pdCgnZHJhZycpO1xuXHRcdC8vIH0pLmRlbGF5KDEwMDApO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX2luaXRDb250YWluZXIgZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0X2luaXRDb250YWluZXI6IGZ1bmN0aW9uKG9wdHMpIHtcblxuXHRcdHRoaXMuY29udGFpbmVyID0gbmV3IENvbnRhaW5lcih7XG5cdFx0XHRyZXNpemFibGU6IGZhbHNlLFxuXHRcdFx0J2NsYXNzJzogJ3VpLWxheW91dCBsYXlvdXQtJyArIG9wdHMubm9kZS5fbmFtZVxuXHRcdH0pLmluamVjdChvcHRzLmNvbnRhaW5lcik7XG5cblx0XHR0aGlzLm1hc2sgPSBuZXcgQ29tcG9uZW50KHtcblx0XHRcdCdjbGFzcyc6ICdsYXlvdXQtbWFzaycsXG5cdFx0fSkuaW5qZWN0KHRoaXMuY29udGFpbmVyLmVsZW1lbnQpO1xuXG5cdFx0Ly9fbG9nLmRlYnVnKCdMYXlvdXQgY29udGFpbmVyJywgdGhpcy5jb250YWluZXIpO1xuXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2xhc3MoJ3VpLWxheW91dCcpO1xuXHRcdHRoaXMuY29udGFpbmVyLmFkZENsYXNzKCdsYXlvdXQtJyArIG9wdHMubm9kZS5fbmFtZSk7XG5cblx0XHRpZiAodGhpcy5vcHRpb25zLnRoZW1lKVxuXHRcdFx0dGhpcy5jb250YWluZXIuYWRkQ2xhc3MoJ3RoZW1lLScgKyB0aGlzLm9wdGlvbnMudGhlbWUpO1xuXG5cdFx0b3B0cy5ub2RlLmNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX3Byb2Nlc3MgZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge1t0eXBlXX0gbW5tbCBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gICAgICBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRyZW5kZXI6IGZ1bmN0aW9uKG5vZGUsIHR5cGUsIGxldmVsKSB7XG5cdFx0Y29uc29sZS5sb2coJ3JlbmRlcicsIG5vZGUsIHR5cGUsIGxldmVsIHx8IDEpO1xuXHRcdC8vX2xvZy5kZWJ1ZygnX3Byb2Nlc3NDb21wb25lbnRzJywgbm9kZSwgdHlwZSwgbGV2ZWwgfHwgMSk7XG5cdFx0dmFyIGxpc3QgPSBub2RlLl9saXN0IHx8IFtdO1xuXHRcdFx0bGV2ZWwgPSBsZXZlbCsrIHx8IDE7XG5cblx0XHQvL19sb2cuZGVidWcoJy0tLSEhISBheGlzJywgbm9kZS5fYXhpcyk7XG5cblx0XHRpZiAodHlwZSAhPT0gJ3RhYicpIHtcblx0XHRcdHRoaXMuX2luaXRGbGV4RGlyZWN0aW9uKG5vZGUuY29udGFpbmVyLCBub2RlLl9heGlzKTtcblx0XHR9XG5cblxuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSBsaXN0Lmxlbmd0aDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdC8vX2xvZy5kZWJ1ZygnLS0nLCBsaXN0W2ldKTtcblx0XHRcdHZhciBuYW1lID0gbGlzdFtpXSxcblx0XHRcdFx0Y29tcCA9IG5vZGVbbmFtZV0gfHwge307XG5cblx0XHRcdGNvbXAuY2xzcyA9IGNvbXAuY2xzcyB8fCB0aGlzLm9wdGlvbnMuY2xzcztcblx0XHRcdGNvbXAub3B0cyA9IGNvbXAub3B0cyB8fCB7fTtcblx0XHRcdGNvbXAub3B0cy5uYW1lID0gbmFtZTtcblx0XHRcdGNvbXAub3B0cy5wb3NpdGlvbiA9IGkgKyAxO1xuXHRcdFx0Y29tcC5vcHRzLm5Db21wID0gbGlzdC5sZW5ndGg7XG5cblx0XHRcdGlmIChuYW1lID09PSBcIm5hdmlcIilcblx0XHRcdFx0Y29tcC5vcHRzLnVzZVVuZGVybGF5ID0gdHJ1ZTtcblxuXHRcdFx0aWYgKGkgPT09IGxpc3QubGVuZ3RoIC0gMSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnbGFzdC0tJywgbmFtZSk7XG5cdFx0XHRcdGNvbXAub3B0cy5sYXN0ID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHR5cGUgIT09ICd0YWInKSB7XG5cdFx0XHRcdGNvbXAub3B0cy5jb250YWluZXIgPSBub2RlLmNvbnRhaW5lcjtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGNvbXBvbmVudCA9IHRoaXMuX2luaXRDb21wb25lbnQoY29tcCk7XG5cblx0XHRcdGlmICh0eXBlID09PSAndGFiJykge1xuXHRcdFx0XHQvL19sb2cuZGVidWcoJ3RhYicsIGNvbXBvbmVudCk7XG5cdFx0XHRcdGNvbXBvbmVudC5vcHRpb25zLm5vUmVzaXplciA9IHRydWU7XG5cdFx0XHRcdG5vZGUuY29udGFpbmVyLmFkZFRhYihjb21wb25lbnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb21wb25lbnQuZWxlbWVudC5hZGRDbGFzcygnY29udGFpbmVyLScrbmFtZSk7XG5cblx0XHRcdGlmIChjb21wLm5vZGUpIHtcblx0XHRcdFx0Y29tcC5ub2RlLmNvbnRhaW5lciA9IGNvbXBvbmVudDtcblxuXHRcdFx0XHRpZiAoY29tcG9uZW50Lm9wdGlvbnMuY2xzcyA9PT0gJ3RhYicpIHtcblx0XHRcdFx0XHR2YXIgYyA9IHRoaXMucmVuZGVyKGNvbXAubm9kZSwgJ3RhYicsIGxldmVsKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnJlbmRlcihjb21wLm5vZGUsIG51bGwsIGxldmVsKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogW19pbml0RmxleERpcmVjdGlvbiBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7W3R5cGVdfSBjb250YWluZXIgW2Rlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtbdHlwZV19IGF4aXMgICAgICBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdF9pbml0RmxleERpcmVjdGlvbjogZnVuY3Rpb24oY29udGFpbmVyLCBheGlzKSB7XG5cdFx0Ly9fbG9nLmRlYnVnKCdfaW5pdEZsZXhEaXJlY3Rpb24nLCBjb250YWluZXIsIGF4aXMpO1xuXG5cdFx0aWYgKCFjb250YWluZXIpIHJldHVybjtcblxuXHRcdGF4aXMgPSBheGlzIHx8ICd4JztcblxuXHRcdGlmIChheGlzID09PSAneCcpIHtcblx0XHRcdGNvbnRhaW5lci5hZGRDbGFzcygnZmxleC1ob3Jpem9udGFsJyk7XG5cdFx0fSBlbHNlIGlmIChheGlzID09PSAneScpIHtcblx0XHRcdGNvbnRhaW5lci5hZGRDbGFzcygnZmxleC12ZXJ0aWNhbCcpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogW3NldERldmljZSBkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtIHtbdHlwZV19IGRldmljZSBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRzZXREZXZpY2U6IGZ1bmN0aW9uKGRldmljZSkge1xuXHRcdC8vX2xvZy5kZWJ1Zygnc2V0RGV2aWNlJyk7XG5cblx0XHR0aGlzLmRldmljZSA9IGRldmljZTtcblxuXHRcdHRoaXMuZmlyZUV2ZW50KCdkZXZpY2UnLCBkZXZpY2UpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXQ7XG4iLCIvKlxubWF0ZXJpYWxcbiAtIG9vIHVpIHRvb2xraXRcbiovXCJ1c2Ugc3RyaWN0XCJcblxudmFyIHByaW1lID0gcmVxdWlyZShcInByaW1lL2luZGV4XCIpLFxuXHRPcHRpb25zID0gcmVxdWlyZSgncHJpbWUtdXRpbC9wcmltZS9vcHRpb25zJyksXG5cdEVtaXR0ZXIgPSByZXF1aXJlKFwicHJpbWUvZW1pdHRlclwiKSxcblx0JCA9IHJlcXVpcmUoXCJlbGVtZW50c1wiKTtcblxudmFyIHJlc2l6ZSA9IG5ldyBwcmltZSh7XG5cblx0bWl4aW46IFtPcHRpb25zLCBFbWl0dGVyXSxcblxuXHRvcHRpb25zOiB7XG5cdFx0cmVzaXplcjoge1xuXHRcdFx0bW9kaWZpZXI6IHtcblx0XHRcdFx0cm93OiB7XG5cdFx0XHRcdFx0c2l6ZTogJ3dpZHRoJyxcblx0XHRcdFx0XHRmcm9tOiAnbGVmdCcsXG5cdFx0XHRcdFx0bW9kZToge1xuXHRcdFx0XHRcdFx0eTogZmFsc2Vcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNvbHVtbjoge1xuXHRcdFx0XHRcdHNpemU6ICdoZWlnaHQnLFxuXHRcdFx0XHRcdGZyb206ICd0b3AnLFxuXHRcdFx0XHRcdG1vZGU6IHtcblx0XHRcdFx0XHRcdHg6IGZhbHNlXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX2luaXRSZXNpemVCb3JkZXIgZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge1t0eXBlXX0gY29tcG9uZW50IFtkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7W3R5cGVdfSBib3JkZXIgICAgW2Rlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgICAgICBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRfaW5pdFJlc2l6ZXI6IGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuXHRcdC8vX2xvZy5kZWJ1ZygnX2luaXRSZXNpemVyJywgY29tcG9uZW50Lm9wdGlvbnMubmFtZSk7XG5cblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRuYW1lID0gY29tcG9uZW50Lm9wdGlvbnMubmFtZSxcblx0XHRcdGVsZW1lbnQgPSBjb21wb25lbnQuZWxlbWVudCxcblx0XHRcdGNvbnRhaW5lciA9IGNvbXBvbmVudC5jb250YWluZXIsXG5cdFx0XHRsYXN0ID0gY29tcG9uZW50Lm9wdGlvbnMubGFzdDtcblxuXHRcdHRoaXMuX2luaXRNYXhpbWl6ZShjb21wb25lbnQpO1xuXG5cblx0XHRpZiAoIWNvbnRhaW5lcikgcmV0dXJuO1xuXG5cdFx0dmFyIGRpcmVjdGlvbiA9IGNvbnRhaW5lci5nZXRTdHlsZSgnZmxleC1kaXJlY3Rpb24nKTtcblx0XHRcblx0XHRpZiAoIWRpcmVjdGlvbilcdHJldHVybjtcblxuXHRcdHZhciBtb2RpZmllciA9IHRoaXMub3B0aW9ucy5yZXNpemVyLm1vZGlmaWVyW2RpcmVjdGlvbl07XG5cblx0XHRpZiAoIW1vZGlmaWVyKSByZXR1cm47XG5cblx0XHQvL19sb2cuZGVidWcoJ2RpcmVjdGlvbicsIGRpcmVjdGlvbiwgbW9kaWZpZXIpO1xuXG5cdFx0Ly9fbG9nLmRlYnVnKGVsZW1lbnQsIGNvb3JkKTtcblx0XHR2YXIgcmVzaXplciA9IHRoaXMucmVzaXplcltuYW1lXSA9IG5ldyBFbGVtZW50KCdkaXYnLCB7XG5cdFx0XHQnY2xhc3MnOiAndWktcmVzaXplcicsXG5cdFx0XHQnZGF0YS1uYW1lJzogY29tcG9uZW50Lm9wdGlvbnMubmFtZVxuXHRcdH0pLmFkZEV2ZW50cyh7XG5cdFx0XHRjbGljazogZnVuY3Rpb24oZSl7XG5cdFx0XHRcdGUuc3RvcCgpO1xuXHRcdFx0fSxcblx0XHRcdG1vdXNlZG93bjogZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRlLnN0b3AoKTtcblx0XHRcdFx0c2VsZi5tYXNrLnNldFN0eWxlKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG5cdFx0XHR9LFxuXHRcdFx0bW91c2V1cDogZnVuY3Rpb24oZSkge1xuXHRcdFx0XHQvL2Uuc3RvcCgpO1xuXHRcdFx0XHRzZWxmLm1hc2suc2V0U3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuXHRcdFx0fVxuXHRcdH0pLmluamVjdChjb250YWluZXIpO1xuXG5cdFx0aWYgKG1vZGlmaWVyLnNpemUpIHtcblx0XHRcdHJlc2l6ZXIuYWRkQ2xhc3MoJ3Jlc2l6ZXItJysgbW9kaWZpZXIuc2l6ZSk7XG5cdFx0fVxuXG5cdFx0aWYgKGxhc3QpIHtcblx0XHRcdC8vX2xvZy5kZWJ1ZygnLS0tLS0tbGFzdCcgKTtcblx0XHRcdC8vcmVzaXplci5hZGRDbGFzcygncmVzaXplci1sYXN0Jyk7XG5cdFx0fVxuXG5cdFx0dGhpcy5faW5pdFJlc2l6ZXJEcmFnKHJlc2l6ZXIsIG1vZGlmaWVyLCBjb21wb25lbnQpO1xuXHRcdHRoaXMuX2luaXRSZXNpemVyRXZlbnQoY29tcG9uZW50LCByZXNpemVyLCBtb2RpZmllcik7XG5cblx0XHR0aGlzLmZpcmVFdmVudCgnZHJhZycpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX2luaXREcmFnIGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtbdHlwZV19IHJlc2l6ZXIgIFtkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7W3R5cGVdfSBtb2RpZmllciBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgICAgW2Rlc2NyaXB0aW9uXVxuXHQgKi9cblx0X2luaXRSZXNpemVyRHJhZzogZnVuY3Rpb24ocmVzaXplciwgbW9kaWZpZXIsIGNvbXBvbmVudCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHQvL19sb2cuZGVidWcoJ2luaXRSZXNpemVyRHJhZycsIHJlc2l6ZXIsIG1vZGlmaWVyKTtcblxuXHRcdHZhciBlbGVtZW50ID0gY29tcG9uZW50LmVsZW1lbnQsXG5cdFx0XHRjb250YWluZXIgPSBjb21wb25lbnQuY29udGFpbmVyLFxuXHRcdFx0bGFzdCA9IGNvbXBvbmVudC5vcHRpb25zLmxhc3Q7XG5cblx0XHR2YXIgZHJhZyA9IG5ldyBEcmFnLk1vdmUocmVzaXplciwge1xuXHRcdFx0bW9kaWZpZXJzOiBtb2RpZmllci5tb2RlLFxuXHRcdCAgICBvblN0YXJ0OiBmdW5jdGlvbihlbCl7XG5cdFx0XHRcdC8vX2xvZy5kZWJ1Zygnb25TdGFydCcsIGVsKTtcblx0XHRcdFx0Ly9zZWxmLmZpcmVFdmVudCgncmVzaXplU3RhcnQnLCBlbCk7XG5cdFx0XHRcdHNlbGYubWFzay5zZXRTdHlsZSgnZGlzcGxheScsICdibG9jaycpO1xuXHRcdFx0fSxcblx0XHRcdG9uRHJhZzogZnVuY3Rpb24oZWwsIGV2KXtcblx0XHRcdFx0Ly9fbG9nLmRlYnVnKCdvbkRyYWcnLCBlbCk7XG5cdFx0XHRcdHNlbGYubWFzay5zZXRTdHlsZSgnZGlzcGxheScsICdibG9jaycpO1xuXHRcdFx0XHR2YXIgY29vcmQgPSBlbGVtZW50LmdldENvb3JkaW5hdGVzKGNvbnRhaW5lcik7XG5cdFx0XHRcdHZhciBjb29yZGMgPSBjb250YWluZXIuZ2V0Q29vcmRpbmF0ZXMoKTtcblx0XHRcdFx0dmFyIGMgPSByZXNpemVyLmdldENvb3JkaW5hdGVzKGNvbnRhaW5lcik7XG5cblx0XHRcdFx0Ly9lbGVtZW50LnNldFN0eWxlKCdmbGV4Jywnbm9uZScpO1xuXHRcdFx0XHQvL2VsZW1lbnQuc2V0U3R5bGUobW9kaWZpZXIuc2l6ZSwgY1ttb2RpZmllci5mcm9tXSAtIGNvb3JkW21vZGlmaWVyLmZyb21dKTtcblx0XHRcdFx0aWYgKGxhc3Qpe1xuXHRcdFx0XHRcdC8vX2xvZy5kZWJ1Zyhtb2RpZmllci5zaXplLCBjb29yZGNbbW9kaWZpZXIuc2l6ZV0sIGNbbW9kaWZpZXIuZnJvbV0pO1xuXHRcdFx0XHRcdGVsZW1lbnQuc2V0U3R5bGUobW9kaWZpZXIuc2l6ZSwgY29vcmRjW21vZGlmaWVyLnNpemVdIC0gY1ttb2RpZmllci5mcm9tXSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0ZWxlbWVudC5zZXRTdHlsZShtb2RpZmllci5zaXplLCBjW21vZGlmaWVyLmZyb21dIC0gY29vcmRbbW9kaWZpZXIuZnJvbV0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2VsZi5maXJlRXZlbnQoJ2RyYWcnKTtcblx0XHRcdH0sXG5cdFx0XHRvbkNvbXBsZXRlOiBmdW5jdGlvbihlbCl7XG5cdFx0XHRcdHNlbGYubWFzay5zZXRTdHlsZSgnZGlzcGxheScsICdub25lJyk7XG5cdFx0XHRcdC8vX2xvZy5kZWJ1Zygnb25Db21wbGV0ZScsIGNvbXBvbmVudC5tYWluLCBtb2RpZmllci5zaXplLCBzaXplKTtcblx0XHRcdFx0Ly9fbG9nLmRlYnVnKCdvbkNvbXBsZXRlJywgbW9kaWZpZXIuc2l6ZSwgZWxlbWVudC5nZXRDb29yZGluYXRlcyhjb250YWluZXIpW21vZGlmaWVyLnNpemVdKTtcblx0XHRcdFx0dmFyIGNvb3JkID0gZWxlbWVudC5nZXRDb29yZGluYXRlcyhjb250YWluZXIpO1xuXHRcdFx0XHR2YXIgc2l6ZSA9IGVsZW1lbnQuZ2V0Q29vcmRpbmF0ZXMoY29udGFpbmVyKVttb2RpZmllci5zaXplXTtcblx0XHRcdFx0c2VsZi5maXJlRXZlbnQoJ3Jlc2l6ZXInLCBbY29tcG9uZW50Lm1haW4sIG1vZGlmaWVyLnNpemUsIHNpemVdKTtcblx0XHRcdFx0Y29tcG9uZW50LmZpcmVFdmVudCgncmVzaXplQ29tcGxldGUnLCBbbW9kaWZpZXIuc2l6ZSwgc2l6ZV0pO1xuXG5cdFx0XHRcdC8vX2xvZy5kZWJ1Zygnc2l6ZScsIG1vZGlmaWVyLCBzaXplKTtcblxuXHRcdFx0XHRjb21wb25lbnRbbW9kaWZpZXIuc2l6ZV0gPSBzaXplO1xuXHRcdFx0XHRcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHJldHVybiBkcmFnO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBbX2luaXRSZXNpemVyRXZlbnQgZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge1t0eXBlXX0gY29tcG9uZW50IFtkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7W3R5cGVdfSByZXNpemVyICAgW2Rlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtbdHlwZV19IG1vZGlmaWVyICBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdC8vIHdpbGwgZGVmaW5pdGx5IHVzZSBhIGNvbnRyb2xsZXIgZm9yIHRoYXRcblx0X2luaXRSZXNpemVyRXZlbnQ6IGZ1bmN0aW9uKGNvbXBvbmVudCwgcmVzaXplciwgbW9kaWZpZXIpIHtcblx0XHQvL19sb2cuZGVidWcoJ19pbml0UmVzaXplckV2ZW50JywgY29tcG9uZW50Lm9wdGlvbnMubmFtZSwgY29tcG9uZW50Lm9wdGlvbnMubGFzdCk7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dGhpcy5hZGRFdmVudHMoe1xuXHRcdFx0ZHJhZzogZnVuY3Rpb24oZSkge1xuXHRcdFx0XHQvL19sb2cuZGVidWcoJ2RyYWcnLCBlKTtcblx0XHRcdFx0c2VsZi5fdXBkYXRlU2l6ZShjb21wb25lbnQsIHJlc2l6ZXIsIG1vZGlmaWVyKTtcblx0XHRcdH0sXG5cdFx0XHRtYXhpbWl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vX2xvZy5kZWJ1ZyhkaXJlY3Rpb24pO1xuXHRcdFx0XHRzZWxmLl91cGRhdGVTaXplKGNvbXBvbmVudCwgcmVzaXplciwgbW9kaWZpZXIpO1xuXHRcdFx0fSxcblx0XHRcdG5vcm1hbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vX2xvZy5kZWJ1ZyhkaXJlY3Rpb24pO1xuXHRcdFx0XHRzZWxmLl91cGRhdGVTaXplKGNvbXBvbmVudCwgcmVzaXplciwgbW9kaWZpZXIpO1xuXHRcdFx0fSxcblx0XHRcdHJlc2l6ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vX2xvZy5kZWJ1ZygncmVzaXplJywgY29tcG9uZW50LmVsZW1lbnQsIHJlc2l6ZXIpO1xuXHRcdFx0XHRcblx0XHRcdFx0c2VsZi5fdXBkYXRlU2l6ZShjb21wb25lbnQsIHJlc2l6ZXIsIG1vZGlmaWVyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogW191cGRhdGVTaXplIGRlc2NyaXB0aW9uXVxuXHQgKiBAcGFyYW0gIHtbdHlwZV19IGNvbXBvbmVudCBbZGVzY3JpcHRpb25dXG5cdCAqIEBwYXJhbSAge1t0eXBlXX0gcmVzaXplciAgIFtkZXNjcmlwdGlvbl1cblx0ICogQHBhcmFtICB7W3R5cGVdfSBtb2RpZmllciAgW2Rlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgICAgICBbZGVzY3JpcHRpb25dXG5cdCAqL1xuXHRfdXBkYXRlU2l6ZTogZnVuY3Rpb24oY29tcG9uZW50LCByZXNpemVyLCBtb2RpZmllcikge1xuXHRcdC8vX2xvZy5kZWJ1ZygnX3VwZGF6ZVNpemUnKTtcblx0XHR2YXIgY29udGFpbmVyID0gY29tcG9uZW50LmNvbnRhaW5lcixcblx0XHRcdGVsZW1lbnQgPSBjb21wb25lbnQuZWxlbWVudDtcblxuXHRcdHZhciBjb29yZCA9IGVsZW1lbnQuZ2V0Q29vcmRpbmF0ZXMoY29udGFpbmVyKTtcblx0XHQvL19sb2cuZGVidWcoJ2Nvb3JkJywgIGNvb3JkW21vZGlmaWVyLmZyb21dKTtcblx0XHQvL1xuXHRcdC8vIHRoZSBsYXN0IGNvbnRhaW5lciBkb2VzbnQgbmVlZCByZXNpemVkclxuXHRcdGlmIChjb21wb25lbnQub3B0aW9ucy5sYXN0KSB7XG5cdFx0XHRyZXNpemVyLnNldFN0eWxlKG1vZGlmaWVyLmZyb20sIGNvb3JkW21vZGlmaWVyLmZyb21dIC0zKTtcblx0XHR9IGVsc2UgeyBcblx0XHRcdHJlc2l6ZXIuc2V0U3R5bGUobW9kaWZpZXIuZnJvbSwgY29vcmRbbW9kaWZpZXIuZnJvbV0gKyBjb29yZFttb2RpZmllci5zaXplXSAtMyk7XG5cdFx0fVxuXG5cdFx0dGhpcy5maXJlRXZlbnQoJ3NpemUnKTtcblx0fSxcblxuXHQvKipcblx0ICogSW5pdCBtYXhpbWlzYXRpb24uIGRibGNsaWNrIHRyaWdnZXIgdGhlIHRvZ2dsZVxuXHQgKiBAcGFyYW0gIHtbdHlwZV19IGNvbXBvbmVudCBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdF9pbml0TWF4aW1pemU6IGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuXHRcdC8vX2xvZy5kZWJ1ZygnX2luaXRNYXhpbWl6ZScsIGNvbXBvbmVudCk7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBlbGVtZW50ID0gY29tcG9uZW50LmVsZW1lbnQ7XG5cdFx0dmFyIGNvbnRhaW5lciA9IGNvbXBvbmVudC5jb250YWluZXI7XG5cblx0XHRpZiAoIWNvbnRhaW5lcikgcmV0dXJuO1xuXG5cdFx0Y29tcG9uZW50LmFkZEV2ZW50KCdtYXgnLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBuYW1lID0gY29tcG9uZW50Lm9wdGlvbnMubmFtZTtcblxuXHRcdFx0X2xvZy5kZWJ1ZygnbWF4JywgY29tcG9uZW50KTtcblx0XHRcdGlmIChlbGVtZW50Lmhhc0NsYXNzKCdjb250YWluZXItbWF4JykpIHtcblx0XHRcdFx0ZWxlbWVudC5yZW1vdmVDbGFzcygnY29udGFpbmVyLW1heCcpO1xuXHRcdFx0XHRjb250YWluZXIuZ2V0Q2hpbGRyZW4oJy51aS1jb250YWluZXInKS5lYWNoKGZ1bmN0aW9uKGMpIHtcblx0XHRcdFx0XHRjLnNldFN0eWxlKCdkaXNwbGF5JywgYy5yZXRyaWV2ZSgnZGlzcGxheScpKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0ZWxlbWVudC5zZXRTdHlsZSgnd2lkdGgnLCBlbGVtZW50LnJldHJpZXZlKCd3aWR0aCcpKTtcblx0XHRcdFx0ZWxlbWVudC5zZXRTdHlsZSgnaGVpZ2h0JywgZWxlbWVudC5yZXRyaWV2ZSgnaGVpZ2h0JykpO1xuXG5cdFx0XHRcdHNlbGYuZmlyZUV2ZW50KCdub3JtYWxpemUnLCBjb21wb25lbnQpO1xuXHRcdFx0fSBlbHNle1xuXHRcdFx0XHRlbGVtZW50LmFkZENsYXNzKCdjb250YWluZXItbWF4Jyk7XG5cdFx0XHRcdGVsZW1lbnQuc3RvcmUoJ3dpZHRoJywgZWxlbWVudC5nZXRTdHlsZSgnd2lkdGgnKSk7XG5cdFx0XHRcdGVsZW1lbnQuc3RvcmUoJ2hlaWdodCcsIGVsZW1lbnQuZ2V0U3R5bGUoJ2hlaWdodCcpKTtcblx0XHRcdFx0ZWxlbWVudC5zZXRTdHlsZSgnd2lkdGgnLCAnaW5pdGlhbCcpO1xuXHRcdFx0XHRlbGVtZW50LnNldFN0eWxlKCdoZWlnaHQnLCAnaW5pdGlhbCcpO1xuXHRcdFx0XHRjb250YWluZXIuZ2V0Q2hpbGRyZW4oJy51aS1jb250YWluZXInKS5lYWNoKGZ1bmN0aW9uKGMpIHtcblx0XHRcdFx0XHRpZiAoIWMuaGFzQ2xhc3MoJ2NvbnRhaW5lci0nK25hbWUpKSB7XG5cdFx0XHRcdFx0XHRjLnN0b3JlKCdkaXNwbGF5JywgYy5nZXRTdHlsZSgnZGlzcGxheScpKTtcblx0XHRcdFx0XHRcdGMuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0c2VsZi5maXJlRXZlbnQoJ3Jlc2l6ZScsIGNvbXBvbmVudCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblxuXHQvKipcblx0ICogW19pbml0UmVzaXplIGRlc2NyaXB0aW9uXVxuXHQgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cblx0ICovXG5cdF9pbml0UmVzaXplcnM6IGZ1bmN0aW9uKGNvbXBvbmVudHMpIHtcblx0XHQvL19sb2cuZGVidWcoJ19pbml0UmVzaXplcnMnKTtcblx0XHR2YXIgbGVuID0gY29tcG9uZW50cy5sZW5ndGg7XG5cblx0XHQvLyBhZGQgcmVzaXplIEJvcmRlciBvbiB0aGUgcmlnaHQgb3Igb24gdGhlIGJvdHRvbVxuXHRcdC8vIGV4ZWNwdCBmb3IgdGhlIGxhc3Qgb25lIFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdHZhciBjb21wb25lbnQgPSBjb21wb25lbnRzW2ldO1xuXG5cdFx0XHRpZiAoY29tcG9uZW50Lm9wdGlvbnMubm9SZXNpemVyKSB7XG5cdFx0XHRcdC8vX2xvZy5kZWJ1ZygnLS0nLCBjb21wb25lbnQubWFpbik7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9pbml0UmVzaXplcihjb21wb25lbnQpO1xuXHRcdFx0XG5cdFx0fVxuXHR9LFxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXNpemU7XG4iLCIvKlxubWF0ZXJpYWxcbiAtIG9vIHVpIHRvb2xraXRcbiovXCJ1c2Ugc3RyaWN0XCJcblxudmFyIHByaW1lID0gcmVxdWlyZShcInByaW1lL2luZGV4XCIpLFxuXHRFbWl0dGVyID0gcmVxdWlyZShcInByaW1lL2VtaXR0ZXJcIik7XG5cbnZhciBiaW5kaW5nID0gcHJpbWUoe1xuXG5cdG1peGluOiBbRW1pdHRlcl0sXG5cblx0LyoqXG5cdCAqIEV2ZW50cyBjb21tdW5pY2F0aW9uIGNvbnRyb2xsZXJcblx0ICogRXZlbnQgYmluZGluZ3Ncblx0ICogQG1ldGhvZCBfaW5pdEJpbmRpbmdcblx0ICogQHJldHVybiB7b2JqZWN0fSAgICAgIHRoaXMuYmluZFxuXHQgKi9cblx0X2luaXRCaW5kaW5nOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgYmluZGluZyA9IHRoaXMub3B0aW9ucy5iaW5kaW5nO1xuXHRcdC8vX2xvZy5kZWJ1ZygnX2luaXRCaW5kaW5nJywgYmluZGluZyk7XG5cblx0XHRpZiAoIWJpbmRpbmcpIHJldHVybjtcblxuXHRcdHZhciBsaXN0ID0gYmluZGluZy5fbGlzdDtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBsaXN0Lmxlbmd0aCA+IGk7IGkrKyApIHtcblx0XHRcdHZhciBiaW5kID0gYmluZGluZ1tsaXN0W2ldXTtcblx0XHRcdHRoaXMuYmluZGluZyA9IHRoaXMuYmluZGluZyB8fCB7fTtcblxuXHRcdFx0dGhpcy5fYmluZE9iamVjdChiaW5kKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5iaW5kaW5nO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBCaW5kIGFuIG9iamVjdFxuXHQgKiBAcGFyYW0gIHtvYmplY3R9IG9iaiBvYmogd2hpdCBrZXkgYW5kIHZhbHVlIHRvIGJlIGJvdW5kXG5cdCAqIEByZXR1cm4ge3ZvaWR9XG5cdCAqL1xuXHRfYmluZE9iamVjdDogZnVuY3Rpb24ob2JqKSB7XG5cdFx0Ly9fbG9nLmRlYnVnKCdfYmluZE9iamVjdCcsIG9iaik7XG5cdFx0Zm9yICh2YXIga2V5IGluIG9iaikge1xuXHRcdFx0dmFyIHZhbHVlID0gb2JqW2tleV07XG5cblx0XHRcdGlmICh0eXBlb2YgdmFsdWUgIT0gJ29iamVjdCcpIHtcblx0XHRcdFx0dGhpcy5fYmluZGtleShrZXksIHZhbHVlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX2JpbmRMaXN0KGtleSwgdmFsdWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogQmluZCBhIGxpc3Qgb2YgZXZlbnRzIHRvIGEgc3BlY2lmaWMgb2JqZWN0XG5cdCAqIEBwYXJhbSAge3N0cmluZ30ga2V5IE9iamVjdCBwYXRoIHRoYXQgd2lsbCBsaXN0ZW5cblx0ICogQHBhcmFtICB7YXJyYXl9IHZhbHVlcyBMaXN0IGlmIHZhbHVlcyB0byBiaW5kXG5cdCAqIEByZXR1cm4ge3ZvaWR9XG5cdCAqL1xuXHRfYmluZExpc3Q6IGZ1bmN0aW9uKGtleSwgdmFsdWVzKSB7XG5cdFx0Ly9fbG9nLmRlYnVnKCdfYmluZExpc3QnLCBrZXksIHZhbHVlcyk7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuX2JpbmRrZXkoa2V5LCB2YWx1ZXNbaV0pO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogQmluZCB0byBvYmplY3QgcGF0aFxuXHQgKiBnZXQgdGhlIGV2ZW50LFxuXHQgKiBnZXQgdGhlIHJlZmVyZW5jZSB0byB0aGUgbGFzdCBrZXkgb2YgdGhlIGZpcnN0IG9iamVjdCxcblx0ICogY2hlY2sgaWYgdGhlcmUgaXMgYSBldmVudCBvciBhIG1laHRvZCB0byBiaW5kXG5cdCAqIEBwYXJhbSAge3N0cmluZ30ga2V5IE9iamVjdCBwYXRoIHRoYXQgd2lsbCBsaXN0ZW5cblx0ICogQHBhcmFtICB7c3RyaW5nfSB2YWwgT2JqZWN0IHBhdGggdG8gYmUgYm91bmRcblx0ICogQHJldHVybiB7dm9pZH1cblx0ICovXG5cdF9iaW5ka2V5OiBmdW5jdGlvbihrZXksIHZhbCkge1xuXHRcdC8vX2xvZy5kZWJ1ZygnX2JpbmRrZXknLCBrZXksIHZhbCk7XG5cdFx0dmFyIGV2ZW50S2V5cyA9IGtleS5zcGxpdCgnLicpO1xuXHRcdHZhciBldiA9IGV2ZW50S2V5c1tldmVudEtleXMubGVuZ3RoIC0gMV07XG5cblx0XHRldmVudEtleXMucG9wKCk7XG5cdFx0dmFyIGxpc3RlbmVyQ3R4ID0gdGhpcy5fcGF0aChldmVudEtleXMuam9pbignLicpKTtcblxuXHRcdHZhciB2YWxLZXlzID0gdmFsLnNwbGl0KCcuJyk7XG5cblx0XHQvL0NoZWNrIGlmIGl0J3MgYW4gZXZlbnRcblx0XHRpZiAodmFsS2V5c1t2YWxLZXlzLmxlbmd0aCAtIDJdID09ICdlbWl0Jykge1xuXHRcdFx0dmFyIGVtaXQgPSB2YWxLZXlzW3ZhbEtleXMubGVuZ3RoIC0gMV07XG5cdFx0XHR0aGlzLl9iaW5kRXZlbnQobGlzdGVuZXJDdHgsIGV2LCBlbWl0LCB2YWwpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9iaW5kTWV0aG9kKGxpc3RlbmVyQ3R4LCBldiwgdmFsKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIExpc3RlbiB0byB0aGUgZ2l2ZW4gZXZlbnQgYW5kIHRyaWdnZXIgYW5vdGhlclxuXHQgKiBAcGFyYW0gIHtvYmplY3R9IGxpc3RlbmVyQ3R4IE9iamVjdCB0byBsaXN0ZW5cblx0ICogQHBhcmFtICB7c3RyaW5nfSBldiBFdmVudCB0aGF0IHdpbGwgYmUgbGlzdGVuZWRcblx0ICogQHBhcmFtICB7c3RyaW5nfSBlbWl0IEV2ZW50IHRoYXQgd2lsbCBiZSBlbWl0dGVkXG5cdCAqIEBwYXJhbSAge3N0cmluZ30gdmFsIE1ldGhvZCBwYXRoIHRvIGJlIGJvdW5kXG5cdCAqIEByZXR1cm4ge3ZvaWR9XG5cdCAqL1xuXHRfYmluZEV2ZW50OiBmdW5jdGlvbihsaXN0ZW5lckN0eCwgZXYsIGVtaXQsIHZhbCkge1xuXHRcdC8vX2xvZy5kZWJ1ZygnX2JpbmRFdmVudCcsIGxpc3RlbmVyQ3R4LCBldiwgZW1pdCwgdmFsKTtcblx0XHR2YXIgZW1pdHRlciA9IHRoaXMub3B0aW9ucy5hcGkuZW1pdDtcblxuXHRcdHZhciB2YWxLZXlzID0gdmFsLnNwbGl0KCcuJyk7XG5cdFx0dmFsS2V5cy5zcGxpY2UoLTIsIDIpO1xuXG5cdFx0dmFyIGJvdW5kQ3R4ID0gdGhpcy5fcGF0aCh2YWxLZXlzLmpvaW4oJy4nKSk7XG5cblx0XHRpZiAobGlzdGVuZXJDdHggJiYgbGlzdGVuZXJDdHguYWRkRXZlbnQgJiYgYm91bmRDdHggJiYgYm91bmRDdHguZmlyZUV2ZW50KSB7XG5cdFx0XHRsaXN0ZW5lckN0eC5hZGRFdmVudChldiwgYm91bmRDdHguZmlyZUV2ZW50LmJpbmQoYm91bmRDdHgsIGVtaXQpKTtcblx0XHRcdC8vIGtlZXAgdHJhY2sgb2YgdGhlIGJpbmRpbmdcblx0XHRcdC8vdGhpcy5iaW5kaW5nW2tleV0gPSBldmVudDtcblx0XHR9IGVsc2UgaWYgKGxpc3RlbmVyQ3R4ICYmIGxpc3RlbmVyQ3R4Lm9uICYmIGJvdW5kQ3R4ICYmIGJvdW5kQ3R4LmVtaXQpIHtcblx0XHRcdGxpc3RlbmVyQ3R4Lm9uKGV2LCBib3VuZEN0eC5lbWl0LmJpbmQoYm91bmRDdHgsIGVtaXQpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0X2xvZy5kZWJ1ZygnTWlzc2luZyBjb250ZXh0IG9yIG1ldGhvZCcsIGxpc3RlbmVyQ3R4LCB2YWwpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogTGlzdGVuIHRvIHRoZSBnaXZlbiBldmVudCBhbmQgYmluZCB0byB0aGUgZ2l2ZW4gbWV0aG9kXG5cdCAqIEBwYXJhbSAge29iamVjdH0gbGlzdGVuZXJDdHggT2JqZWN0IHRvIGxpc3RlblxuXHQgKiBAcGFyYW0gIHtzdHJpbmd9IGV2IEV2ZW50IHRoYXQgd2lsbCBiZSBsaXN0ZW5lZFxuXHQgKiBAcGFyYW0gIHtzdHJpbmd9IHZhbCBNZXRob2QgcGF0aCB0byBiZSBib3VuZFxuXHQgKiBAcmV0dXJuIHt2b2lkfVxuXHQgKi9cblx0X2JpbmRNZXRob2Q6IGZ1bmN0aW9uKGxpc3RlbmVyQ3R4LCBldiwgdmFsKSB7XG5cdFx0Ly9fbG9nLmRlYnVnKCdfYmluZE1ldGhvZCcsIGxpc3RlbmVyQ3R4LCBldiwgdmFsKTtcblx0XHR2YXIgbWV0aG9kID0gdGhpcy5fcGF0aCh2YWwpO1xuXG5cdFx0dmFyIHZhbEtleXMgPSB2YWwuc3BsaXQoJy4nKTtcblx0XHR2YWxLZXlzLnBvcCgpO1xuXHRcdHZhciBib3VuZEN0eCA9IHRoaXMuX3BhdGgodmFsS2V5cy5qb2luKCcuJykpO1xuXG5cdFx0aWYgKGxpc3RlbmVyQ3R4ICYmIGxpc3RlbmVyQ3R4LmFkZEV2ZW50ICYmIG1ldGhvZCkge1xuXHRcdFx0bGlzdGVuZXJDdHguYWRkRXZlbnQoZXYsIG1ldGhvZC5iaW5kKGJvdW5kQ3R4KSk7XG5cdFx0XHQvLyBrZWVwIHRyYWNrIG9mIHRoZSBiaW5kaW5nXG5cdFx0XHQvL3RoaXMuYmluZGluZ1trZXldID0gbWV0aG9kO1xuXHRcdH0gZWxzZSBpZiAobGlzdGVuZXJDdHggJiYgbGlzdGVuZXJDdHgub24gJiYgbWV0aG9kKSB7XG5cdFx0XHRsaXN0ZW5lckN0eC5vbihldiwgbWV0aG9kLmJpbmQoYm91bmRDdHgpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly9fbG9nLmRlYnVnKCdNaXNzaW5nIGNvbnRleHQgb3IgbWV0aG9kJywgbGlzdGVuZXJDdHgsIHZhbCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm4gdGhlIGxhc3QgcmVmZXJlbmNlIHRvIGEgb2JqZWN0XG5cdCAqIEBwYXJhbSAge3N0cmluZ30gc3RyIE9iamVjdCBwYXRoIGZvciBleGFtcGxlIGtleTEua2V5Mi5rZXkzXG5cdCAqIEByZXR1cm4ge29iamVjdH1cblx0ICovXG5cdF9wYXRoOiBmdW5jdGlvbihzdHIpIHtcblx0XHQvL19sb2cuZGVidWcoJ19wYXRoJywgc3RyKTtcblx0XHRpZiAoIXN0cikgcmV0dXJuIHRoaXM7XG5cdFx0ZWxzZSBpZiAoIXN0ci5tYXRjaCgvXFwuLykpIHJldHVybiB0aGlzW3N0cl07XG5cblx0XHR2YXIgbGFzdDtcblxuXHRcdHZhciBrZXlzID0gc3RyLnNwbGl0KCcuJyk7XG5cdFx0Zm9yICh2YXIgaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuXHRcdFx0dmFyIGtleSA9IGtleXNbaV07XG5cblx0XHRcdGxhc3QgPSBsYXN0IHx8IHRoaXM7XG5cdFx0XHRsYXN0ID0gbGFzdFtrZXldO1xuXHRcdH1cblxuXHRcdHJldHVybiBsYXN0O1xuXHR9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmRpbmc7XG4iLCIvKlxyXG5hdHRyaWJ1dGVzXHJcbiovXCJ1c2Ugc3RyaWN0XCJcclxuXHJcbnZhciAkICAgICAgID0gcmVxdWlyZShcIi4vYmFzZVwiKVxyXG5cclxudmFyIHRyaW0gICAgPSByZXF1aXJlKFwibW91dC9zdHJpbmcvdHJpbVwiKSxcclxuICAgIGZvckVhY2ggPSByZXF1aXJlKFwibW91dC9hcnJheS9mb3JFYWNoXCIpLFxyXG4gICAgZmlsdGVyICA9IHJlcXVpcmUoXCJtb3V0L2FycmF5L2ZpbHRlclwiKSxcclxuICAgIGluZGV4T2YgPSByZXF1aXJlKFwibW91dC9hcnJheS9pbmRleE9mXCIpXHJcblxyXG4vLyBhdHRyaWJ1dGVzXHJcblxyXG4kLmltcGxlbWVudCh7XHJcblxyXG4gICAgc2V0QXR0cmlidXRlOiBmdW5jdGlvbihuYW1lLCB2YWx1ZSl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcclxuICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcblxyXG4gICAgZ2V0QXR0cmlidXRlOiBmdW5jdGlvbihuYW1lKXtcclxuICAgICAgICB2YXIgYXR0ciA9IHRoaXNbMF0uZ2V0QXR0cmlidXRlTm9kZShuYW1lKVxyXG4gICAgICAgIHJldHVybiAoYXR0ciAmJiBhdHRyLnNwZWNpZmllZCkgPyBhdHRyLnZhbHVlIDogbnVsbFxyXG4gICAgfSxcclxuXHJcbiAgICBoYXNBdHRyaWJ1dGU6IGZ1bmN0aW9uKG5hbWUpe1xyXG4gICAgICAgIHZhciBub2RlID0gdGhpc1swXVxyXG4gICAgICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZSkgcmV0dXJuIG5vZGUuaGFzQXR0cmlidXRlKG5hbWUpXHJcbiAgICAgICAgdmFyIGF0dHIgPSBub2RlLmdldEF0dHJpYnV0ZU5vZGUobmFtZSlcclxuICAgICAgICByZXR1cm4gISEoYXR0ciAmJiBhdHRyLnNwZWNpZmllZClcclxuICAgIH0sXHJcblxyXG4gICAgcmVtb3ZlQXR0cmlidXRlOiBmdW5jdGlvbihuYW1lKXtcclxuICAgICAgICByZXR1cm4gdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpe1xyXG4gICAgICAgICAgICB2YXIgYXR0ciA9IG5vZGUuZ2V0QXR0cmlidXRlTm9kZShuYW1lKVxyXG4gICAgICAgICAgICBpZiAoYXR0cikgbm9kZS5yZW1vdmVBdHRyaWJ1dGVOb2RlKGF0dHIpXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbn0pXHJcblxyXG52YXIgYWNjZXNzb3JzID0ge31cclxuXHJcbmZvckVhY2goW1widHlwZVwiLCBcInZhbHVlXCIsIFwibmFtZVwiLCBcImhyZWZcIiwgXCJ0aXRsZVwiLCBcImlkXCJdLCBmdW5jdGlvbihuYW1lKXtcclxuXHJcbiAgICBhY2Nlc3NvcnNbbmFtZV0gPSBmdW5jdGlvbih2YWx1ZSl7XHJcbiAgICAgICAgcmV0dXJuICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IHRoaXMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcclxuICAgICAgICAgICAgbm9kZVtuYW1lXSA9IHZhbHVlXHJcbiAgICAgICAgfSkgOiB0aGlzWzBdW25hbWVdXHJcbiAgICB9XHJcblxyXG59KVxyXG5cclxuLy8gYm9vbGVhbnNcclxuXHJcbmZvckVhY2goW1wiY2hlY2tlZFwiLCBcImRpc2FibGVkXCIsIFwic2VsZWN0ZWRcIl0sIGZ1bmN0aW9uKG5hbWUpe1xyXG5cclxuICAgIGFjY2Vzc29yc1tuYW1lXSA9IGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgICAgICByZXR1cm4gKHZhbHVlICE9PSB1bmRlZmluZWQpID8gdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpe1xyXG4gICAgICAgICAgICBub2RlW25hbWVdID0gISF2YWx1ZVxyXG4gICAgICAgIH0pIDogISF0aGlzWzBdW25hbWVdXHJcbiAgICB9XHJcblxyXG59KVxyXG5cclxuLy8gY2xhc3NOYW1lXHJcblxyXG52YXIgY2xhc3NlcyA9IGZ1bmN0aW9uKGNsYXNzTmFtZSl7XHJcbiAgICB2YXIgY2xhc3NOYW1lcyA9IHRyaW0oY2xhc3NOYW1lKS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS5zcGxpdChcIiBcIiksXHJcbiAgICAgICAgdW5pcXVlcyAgICA9IHt9XHJcblxyXG4gICAgcmV0dXJuIGZpbHRlcihjbGFzc05hbWVzLCBmdW5jdGlvbihjbGFzc05hbWUpe1xyXG4gICAgICAgIGlmIChjbGFzc05hbWUgIT09IFwiXCIgJiYgIXVuaXF1ZXNbY2xhc3NOYW1lXSkgcmV0dXJuIHVuaXF1ZXNbY2xhc3NOYW1lXSA9IGNsYXNzTmFtZVxyXG4gICAgfSkuc29ydCgpXHJcbn1cclxuXHJcbmFjY2Vzc29ycy5jbGFzc05hbWUgPSBmdW5jdGlvbihjbGFzc05hbWUpe1xyXG4gICAgcmV0dXJuIChjbGFzc05hbWUgIT09IHVuZGVmaW5lZCkgPyB0aGlzLmZvckVhY2goZnVuY3Rpb24obm9kZSl7XHJcbiAgICAgICAgbm9kZS5jbGFzc05hbWUgPSBjbGFzc2VzKGNsYXNzTmFtZSkuam9pbihcIiBcIilcclxuICAgIH0pIDogY2xhc3Nlcyh0aGlzWzBdLmNsYXNzTmFtZSkuam9pbihcIiBcIilcclxufVxyXG5cclxuLy8gYXR0cmlidXRlXHJcblxyXG4kLmltcGxlbWVudCh7XHJcblxyXG4gICAgYXR0cmlidXRlOiBmdW5jdGlvbihuYW1lLCB2YWx1ZSl7XHJcbiAgICAgICAgdmFyIGFjY2Vzc29yID0gYWNjZXNzb3JzW25hbWVdXHJcbiAgICAgICAgaWYgKGFjY2Vzc29yKSByZXR1cm4gYWNjZXNzb3IuY2FsbCh0aGlzLCB2YWx1ZSlcclxuICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkgcmV0dXJuIHRoaXMuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKVxyXG4gICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkgcmV0dXJuIHRoaXMucmVtb3ZlQXR0cmlidXRlKG5hbWUpXHJcbiAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZShuYW1lKVxyXG4gICAgfVxyXG5cclxufSlcclxuXHJcbiQuaW1wbGVtZW50KGFjY2Vzc29ycylcclxuXHJcbi8vIHNob3J0Y3V0c1xyXG5cclxuJC5pbXBsZW1lbnQoe1xyXG5cclxuICAgIGNoZWNrOiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNoZWNrZWQodHJ1ZSlcclxuICAgIH0sXHJcblxyXG4gICAgdW5jaGVjazogZnVuY3Rpb24oKXtcclxuICAgICAgICByZXR1cm4gdGhpcy5jaGVja2VkKGZhbHNlKVxyXG4gICAgfSxcclxuXHJcbiAgICBkaXNhYmxlOiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpc2FibGVkKHRydWUpXHJcbiAgICB9LFxyXG5cclxuICAgIGVuYWJsZTogZnVuY3Rpb24oKXtcclxuICAgICAgICByZXR1cm4gdGhpcy5kaXNhYmxlZChmYWxzZSlcclxuICAgIH0sXHJcblxyXG4gICAgc2VsZWN0OiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdGVkKHRydWUpXHJcbiAgICB9LFxyXG5cclxuICAgIGRlc2VsZWN0OiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdGVkKGZhbHNlKVxyXG4gICAgfVxyXG5cclxufSlcclxuXHJcbi8vIGNsYXNzTmFtZXMsIGhhcyAvIGFkZCAvIHJlbW92ZSBDbGFzc1xyXG5cclxuJC5pbXBsZW1lbnQoe1xyXG5cclxuICAgIGNsYXNzTmFtZXM6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuIGNsYXNzZXModGhpc1swXS5jbGFzc05hbWUpXHJcbiAgICB9LFxyXG5cclxuICAgIGhhc0NsYXNzOiBmdW5jdGlvbihjbGFzc05hbWUpe1xyXG4gICAgICAgIHJldHVybiBpbmRleE9mKHRoaXMuY2xhc3NOYW1lcygpLCBjbGFzc05hbWUpID4gLTFcclxuICAgIH0sXHJcblxyXG4gICAgYWRkQ2xhc3M6IGZ1bmN0aW9uKGNsYXNzTmFtZSl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcclxuICAgICAgICAgICAgdmFyIG5vZGVDbGFzc05hbWUgPSBub2RlLmNsYXNzTmFtZVxyXG4gICAgICAgICAgICB2YXIgY2xhc3NOYW1lcyA9IGNsYXNzZXMobm9kZUNsYXNzTmFtZSArIFwiIFwiICsgY2xhc3NOYW1lKS5qb2luKFwiIFwiKVxyXG4gICAgICAgICAgICBpZiAobm9kZUNsYXNzTmFtZSAhPT0gY2xhc3NOYW1lcykgbm9kZS5jbGFzc05hbWUgPSBjbGFzc05hbWVzXHJcbiAgICAgICAgfSlcclxuICAgIH0sXHJcblxyXG4gICAgcmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uKGNsYXNzTmFtZSl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcclxuICAgICAgICAgICAgdmFyIGNsYXNzTmFtZXMgPSBjbGFzc2VzKG5vZGUuY2xhc3NOYW1lKVxyXG4gICAgICAgICAgICBmb3JFYWNoKGNsYXNzZXMoY2xhc3NOYW1lKSwgZnVuY3Rpb24oY2xhc3NOYW1lKXtcclxuICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IGluZGV4T2YoY2xhc3NOYW1lcywgY2xhc3NOYW1lKVxyXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID4gLTEpIGNsYXNzTmFtZXMuc3BsaWNlKGluZGV4LCAxKVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICBub2RlLmNsYXNzTmFtZSA9IGNsYXNzTmFtZXMuam9pbihcIiBcIilcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICB0b2dnbGVDbGFzczogZnVuY3Rpb24oY2xhc3NOYW1lLCBmb3JjZSl7XHJcbiAgICAgICAgdmFyIGFkZCA9IGZvcmNlICE9PSB1bmRlZmluZWQgPyBmb3JjZSA6ICF0aGlzLmhhc0NsYXNzKGNsYXNzTmFtZSlcclxuICAgICAgICBpZiAoYWRkKVxyXG4gICAgICAgICAgICB0aGlzLmFkZENsYXNzKGNsYXNzTmFtZSlcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoY2xhc3NOYW1lKVxyXG4gICAgICAgIHJldHVybiAhIWFkZFxyXG4gICAgfVxyXG5cclxufSlcclxuXHJcbi8vIHRvU3RyaW5nXHJcblxyXG4kLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgdGFnICAgICA9IHRoaXMudGFnKCksXHJcbiAgICAgICAgaWQgICAgICA9IHRoaXMuaWQoKSxcclxuICAgICAgICBjbGFzc2VzID0gdGhpcy5jbGFzc05hbWVzKClcclxuXHJcbiAgICB2YXIgc3RyID0gdGFnXHJcbiAgICBpZiAoaWQpIHN0ciArPSAnIycgKyBpZFxyXG4gICAgaWYgKGNsYXNzZXMubGVuZ3RoKSBzdHIgKz0gJy4nICsgY2xhc3Nlcy5qb2luKFwiLlwiKVxyXG4gICAgcmV0dXJuIHN0clxyXG59XHJcblxyXG52YXIgdGV4dFByb3BlcnR5ID0gKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnRleHRDb250ZW50ID09IG51bGwpID8gJ2lubmVyVGV4dCcgOiAndGV4dENvbnRlbnQnXHJcblxyXG4vLyB0YWcsIGh0bWwsIHRleHQsIGRhdGFcclxuXHJcbiQuaW1wbGVtZW50KHtcclxuXHJcbiAgICB0YWc6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXNbMF0udGFnTmFtZS50b0xvd2VyQ2FzZSgpXHJcbiAgICB9LFxyXG5cclxuICAgIGh0bWw6IGZ1bmN0aW9uKGh0bWwpe1xyXG4gICAgICAgIHJldHVybiAoaHRtbCAhPT0gdW5kZWZpbmVkKSA/IHRoaXMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcclxuICAgICAgICAgICAgbm9kZS5pbm5lckhUTUwgPSBodG1sXHJcbiAgICAgICAgfSkgOiB0aGlzWzBdLmlubmVySFRNTFxyXG4gICAgfSxcclxuXHJcbiAgICB0ZXh0OiBmdW5jdGlvbih0ZXh0KXtcclxuICAgICAgICByZXR1cm4gKHRleHQgIT09IHVuZGVmaW5lZCkgPyB0aGlzLmZvckVhY2goZnVuY3Rpb24obm9kZSl7XHJcbiAgICAgICAgICAgIG5vZGVbdGV4dFByb3BlcnR5XSA9IHRleHRcclxuICAgICAgICB9KSA6IHRoaXNbMF1bdGV4dFByb3BlcnR5XVxyXG4gICAgfSxcclxuXHJcbiAgICBkYXRhOiBmdW5jdGlvbihrZXksIHZhbHVlKXtcclxuICAgICAgICBzd2l0Y2godmFsdWUpIHtcclxuICAgICAgICAgICAgY2FzZSB1bmRlZmluZWQ6IHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZShcImRhdGEtXCIgKyBrZXkpXHJcbiAgICAgICAgICAgIGNhc2UgbnVsbDogcmV0dXJuIHRoaXMucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1cIiArIGtleSlcclxuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuIHRoaXMuc2V0QXR0cmlidXRlKFwiZGF0YS1cIiArIGtleSwgdmFsdWUpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSlcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gJFxyXG4iLCIvKlxyXG5lbGVtZW50c1xyXG4qL1widXNlIHN0cmljdFwiXHJcblxyXG52YXIgcHJpbWUgICA9IHJlcXVpcmUoXCJwcmltZVwiKVxyXG5cclxudmFyIGZvckVhY2ggPSByZXF1aXJlKFwibW91dC9hcnJheS9mb3JFYWNoXCIpLFxyXG4gICAgbWFwICAgICA9IHJlcXVpcmUoXCJtb3V0L2FycmF5L21hcFwiKSxcclxuICAgIGZpbHRlciAgPSByZXF1aXJlKFwibW91dC9hcnJheS9maWx0ZXJcIiksXHJcbiAgICBldmVyeSAgID0gcmVxdWlyZShcIm1vdXQvYXJyYXkvZXZlcnlcIiksXHJcbiAgICBzb21lICAgID0gcmVxdWlyZShcIm1vdXQvYXJyYXkvc29tZVwiKVxyXG5cclxuLy8gdW5pcXVlSURcclxuXHJcbnZhciBpbmRleCA9IDAsXHJcbiAgICBfX2RjID0gZG9jdW1lbnQuX19jb3VudGVyLFxyXG4gICAgY291bnRlciA9IGRvY3VtZW50Ll9fY291bnRlciA9IChfX2RjID8gcGFyc2VJbnQoX19kYywgMzYpICsgMSA6IDApLnRvU3RyaW5nKDM2KSxcclxuICAgIGtleSA9IFwidWlkOlwiICsgY291bnRlclxyXG5cclxudmFyIHVuaXF1ZUlEID0gZnVuY3Rpb24obil7XHJcbiAgICBpZiAobiA9PT0gd2luZG93KSByZXR1cm4gXCJ3aW5kb3dcIlxyXG4gICAgaWYgKG4gPT09IGRvY3VtZW50KSByZXR1cm4gXCJkb2N1bWVudFwiXHJcbiAgICBpZiAobiA9PT0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KSByZXR1cm4gXCJodG1sXCJcclxuICAgIHJldHVybiBuW2tleV0gfHwgKG5ba2V5XSA9IChpbmRleCsrKS50b1N0cmluZygzNikpXHJcbn1cclxuXHJcbnZhciBpbnN0YW5jZXMgPSB7fVxyXG5cclxuLy8gZWxlbWVudHMgcHJpbWVcclxuXHJcbnZhciAkID0gcHJpbWUoe2NvbnN0cnVjdG9yOiBmdW5jdGlvbiAkKG4sIGNvbnRleHQpe1xyXG5cclxuICAgIGlmIChuID09IG51bGwpIHJldHVybiAodGhpcyAmJiB0aGlzLmNvbnN0cnVjdG9yID09PSAkKSA/IG5ldyBFbGVtZW50cyA6IG51bGxcclxuXHJcbiAgICB2YXIgc2VsZiwgdWlkXHJcblxyXG4gICAgaWYgKG4uY29uc3RydWN0b3IgIT09IEVsZW1lbnRzKXtcclxuXHJcbiAgICAgICAgc2VsZiA9IG5ldyBFbGVtZW50c1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIG4gPT09IFwic3RyaW5nXCIpe1xyXG4gICAgICAgICAgICBpZiAoIXNlbGYuc2VhcmNoKSByZXR1cm4gbnVsbFxyXG4gICAgICAgICAgICBzZWxmW3NlbGYubGVuZ3RoKytdID0gY29udGV4dCB8fCBkb2N1bWVudFxyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5zZWFyY2gobilcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChuLm5vZGVUeXBlIHx8IG4gPT09IHdpbmRvdyl7XHJcblxyXG4gICAgICAgICAgICBzZWxmW3NlbGYubGVuZ3RoKytdID0gblxyXG5cclxuICAgICAgICB9IGVsc2UgaWYgKG4ubGVuZ3RoKXtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMgY291bGQgYmUgYW4gYXJyYXksIG9yIGFueSBvYmplY3Qgd2l0aCBhIGxlbmd0aCBhdHRyaWJ1dGUsXHJcbiAgICAgICAgICAgIC8vIGluY2x1ZGluZyBhbm90aGVyIGluc3RhbmNlIG9mIGVsZW1lbnRzIGZyb20gYW5vdGhlciBpbnRlcmZhY2UuXHJcblxyXG4gICAgICAgICAgICB2YXIgdW5pcXVlcyA9IHt9XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG4ubGVuZ3RoOyBpIDwgbDsgaSsrKXsgLy8gcGVyZm9ybSBlbGVtZW50cyBmbGF0dGVuaW5nXHJcbiAgICAgICAgICAgICAgICB2YXIgbm9kZXMgPSAkKG5baV0sIGNvbnRleHQpXHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZXMgJiYgbm9kZXMubGVuZ3RoKSBmb3IgKHZhciBqID0gMCwgayA9IG5vZGVzLmxlbmd0aDsgaiA8IGs7IGorKyl7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tqXVxyXG4gICAgICAgICAgICAgICAgICAgIHVpZCA9IHVuaXF1ZUlEKG5vZGUpXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF1bmlxdWVzW3VpZF0pe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmW3NlbGYubGVuZ3RoKytdID0gbm9kZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1bmlxdWVzW3VpZF0gPSB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzZWxmID0gblxyXG4gICAgfVxyXG5cclxuICAgIGlmICghc2VsZi5sZW5ndGgpIHJldHVybiBudWxsXHJcblxyXG4gICAgLy8gd2hlbiBsZW5ndGggaXMgMSBhbHdheXMgdXNlIHRoZSBzYW1lIGVsZW1lbnRzIGluc3RhbmNlXHJcblxyXG4gICAgaWYgKHNlbGYubGVuZ3RoID09PSAxKXtcclxuICAgICAgICB1aWQgPSB1bmlxdWVJRChzZWxmWzBdKVxyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZXNbdWlkXSB8fCAoaW5zdGFuY2VzW3VpZF0gPSBzZWxmKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzZWxmXHJcblxyXG59fSlcclxuXHJcbnZhciBFbGVtZW50cyA9IHByaW1lKHtcclxuXHJcbiAgICBpbmhlcml0czogJCxcclxuXHJcbiAgICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gRWxlbWVudHMoKXtcclxuICAgICAgICB0aGlzLmxlbmd0aCA9IDBcclxuICAgIH0sXHJcblxyXG4gICAgdW5saW5rOiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbihub2RlKXtcclxuICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlc1t1bmlxdWVJRChub2RlKV1cclxuICAgICAgICAgICAgcmV0dXJuIG5vZGVcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBtZXRob2RzXHJcblxyXG4gICAgZm9yRWFjaDogZnVuY3Rpb24obWV0aG9kLCBjb250ZXh0KXtcclxuICAgICAgICBmb3JFYWNoKHRoaXMsIG1ldGhvZCwgY29udGV4dClcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfSxcclxuXHJcbiAgICBtYXA6IGZ1bmN0aW9uKG1ldGhvZCwgY29udGV4dCl7XHJcbiAgICAgICAgcmV0dXJuIG1hcCh0aGlzLCBtZXRob2QsIGNvbnRleHQpXHJcbiAgICB9LFxyXG5cclxuICAgIGZpbHRlcjogZnVuY3Rpb24obWV0aG9kLCBjb250ZXh0KXtcclxuICAgICAgICByZXR1cm4gZmlsdGVyKHRoaXMsIG1ldGhvZCwgY29udGV4dClcclxuICAgIH0sXHJcblxyXG4gICAgZXZlcnk6IGZ1bmN0aW9uKG1ldGhvZCwgY29udGV4dCl7XHJcbiAgICAgICAgcmV0dXJuIGV2ZXJ5KHRoaXMsIG1ldGhvZCwgY29udGV4dClcclxuICAgIH0sXHJcblxyXG4gICAgc29tZTogZnVuY3Rpb24obWV0aG9kLCBjb250ZXh0KXtcclxuICAgICAgICByZXR1cm4gc29tZSh0aGlzLCBtZXRob2QsIGNvbnRleHQpXHJcbiAgICB9XHJcblxyXG59KVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAkXHJcbiIsIi8qXHJcbmRlbGVnYXRpb25cclxuKi9cInVzZSBzdHJpY3RcIlxyXG5cclxudmFyIE1hcCA9IHJlcXVpcmUoXCJwcmltZS9tYXBcIilcclxuXHJcbnZhciAkID0gcmVxdWlyZShcIi4vZXZlbnRzXCIpXHJcbiAgICAgICAgcmVxdWlyZSgnLi90cmF2ZXJzYWwnKVxyXG5cclxuJC5pbXBsZW1lbnQoe1xyXG5cclxuICAgIGRlbGVnYXRlOiBmdW5jdGlvbihldmVudCwgc2VsZWN0b3IsIGhhbmRsZSl7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLmZvckVhY2goZnVuY3Rpb24obm9kZSl7XHJcblxyXG4gICAgICAgICAgICB2YXIgc2VsZiA9ICQobm9kZSlcclxuXHJcbiAgICAgICAgICAgIHZhciBkZWxlZ2F0aW9uID0gc2VsZi5fZGVsZWdhdGlvbiB8fCAoc2VsZi5fZGVsZWdhdGlvbiA9IHt9KSxcclxuICAgICAgICAgICAgICAgIGV2ZW50cyAgICAgPSBkZWxlZ2F0aW9uW2V2ZW50XSB8fCAoZGVsZWdhdGlvbltldmVudF0gPSB7fSksXHJcbiAgICAgICAgICAgICAgICBtYXAgICAgICAgID0gKGV2ZW50c1tzZWxlY3Rvcl0gfHwgKGV2ZW50c1tzZWxlY3Rvcl0gPSBuZXcgTWFwKSlcclxuXHJcbiAgICAgICAgICAgIGlmIChtYXAuZ2V0KGhhbmRsZSkpIHJldHVyblxyXG5cclxuICAgICAgICAgICAgdmFyIGFjdGlvbiA9IGZ1bmN0aW9uKGUpe1xyXG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9ICQoZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50KSxcclxuICAgICAgICAgICAgICAgICAgICBtYXRjaCAgPSB0YXJnZXQubWF0Y2hlcyhzZWxlY3RvcikgPyB0YXJnZXQgOiB0YXJnZXQucGFyZW50KHNlbGVjdG9yKVxyXG5cclxuICAgICAgICAgICAgICAgIHZhciByZXNcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2gpIHJlcyA9IGhhbmRsZS5jYWxsKHNlbGYsIGUsIG1hdGNoKVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiByZXNcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbWFwLnNldChoYW5kbGUsIGFjdGlvbilcclxuXHJcbiAgICAgICAgICAgIHNlbGYub24oZXZlbnQsIGFjdGlvbilcclxuXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIHVuZGVsZWdhdGU6IGZ1bmN0aW9uKGV2ZW50LCBzZWxlY3RvciwgaGFuZGxlKXtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcclxuXHJcbiAgICAgICAgICAgIHZhciBzZWxmID0gJChub2RlKSwgZGVsZWdhdGlvbiwgZXZlbnRzLCBtYXBcclxuXHJcbiAgICAgICAgICAgIGlmICghKGRlbGVnYXRpb24gPSBzZWxmLl9kZWxlZ2F0aW9uKSB8fCAhKGV2ZW50cyA9IGRlbGVnYXRpb25bZXZlbnRdKSB8fCAhKG1hcCA9IGV2ZW50c1tzZWxlY3Rvcl0pKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICB2YXIgYWN0aW9uID0gbWFwLmdldChoYW5kbGUpXHJcblxyXG4gICAgICAgICAgICBpZiAoYWN0aW9uKXtcclxuICAgICAgICAgICAgICAgIHNlbGYub2ZmKGV2ZW50LCBhY3Rpb24pXHJcbiAgICAgICAgICAgICAgICBtYXAucmVtb3ZlKGFjdGlvbilcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBpZiB0aGVyZSBhcmUgbm8gbW9yZSBoYW5kbGVzIGluIGEgZ2l2ZW4gc2VsZWN0b3IsIGRlbGV0ZSBpdFxyXG4gICAgICAgICAgICAgICAgaWYgKCFtYXAuY291bnQoKSkgZGVsZXRlIGV2ZW50c1tzZWxlY3Rvcl1cclxuICAgICAgICAgICAgICAgIC8vIHZhciBldmMgPSBldmQgPSAwLCB4XHJcbiAgICAgICAgICAgICAgICB2YXIgZTEgPSB0cnVlLCBlMiA9IHRydWUsIHhcclxuICAgICAgICAgICAgICAgIGZvciAoeCBpbiBldmVudHMpe1xyXG4gICAgICAgICAgICAgICAgICAgIGUxID0gZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gaWYgbm8gbW9yZSBzZWxlY3RvcnMgaW4gYSBnaXZlbiBldmVudCB0eXBlLCBkZWxldGUgaXRcclxuICAgICAgICAgICAgICAgIGlmIChlMSkgZGVsZXRlIGRlbGVnYXRpb25bZXZlbnRdXHJcbiAgICAgICAgICAgICAgICBmb3IgKHggaW4gZGVsZWdhdGlvbil7XHJcbiAgICAgICAgICAgICAgICAgICAgZTIgPSBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBpZiB0aGVyZSBhcmUgbm8gbW9yZSBkZWxlZ2F0aW9uIGV2ZW50cyBpbiB0aGUgZWxlbWVudCwgZGVsZXRlIHRoZSBfZGVsZWdhdGlvbiBvYmplY3RcclxuICAgICAgICAgICAgICAgIGlmIChlMikgZGVsZXRlIHNlbGYuX2RlbGVnYXRpb25cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KVxyXG5cclxuICAgIH1cclxuXHJcbn0pXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICRcclxuIiwiLypcclxuZG9tcmVhZHlcclxuKi9cInVzZSBzdHJpY3RcIlxyXG5cclxudmFyICQgPSByZXF1aXJlKFwiLi9ldmVudHNcIilcclxuXHJcbnZhciByZWFkeXN0YXRlY2hhbmdlID0gJ29ucmVhZHlzdGF0ZWNoYW5nZScgaW4gZG9jdW1lbnQsXHJcbiAgICBzaG91bGRQb2xsICAgICAgID0gZmFsc2UsXHJcbiAgICBsb2FkZWQgICAgICAgICAgID0gZmFsc2UsXHJcbiAgICByZWFkeXMgICAgICAgICAgID0gW10sXHJcbiAgICBjaGVja3MgICAgICAgICAgID0gW10sXHJcbiAgICByZWFkeSAgICAgICAgICAgID0gbnVsbCxcclxuICAgIHRpbWVyICAgICAgICAgICAgPSBudWxsLFxyXG4gICAgdGVzdCAgICAgICAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxyXG4gICAgZG9jICAgICAgICAgICAgICA9ICQoZG9jdW1lbnQpLFxyXG4gICAgd2luICAgICAgICAgICAgICA9ICQod2luZG93KVxyXG5cclxudmFyIGRvbXJlYWR5ID0gZnVuY3Rpb24oKXtcclxuXHJcbiAgICBpZiAodGltZXIpIHRpbWVyID0gY2xlYXJUaW1lb3V0KHRpbWVyKVxyXG5cclxuICAgIGlmICghbG9hZGVkKXtcclxuXHJcbiAgICAgICAgaWYgKHJlYWR5c3RhdGVjaGFuZ2UpIGRvYy5vZmYoJ3JlYWR5c3RhdGVjaGFuZ2UnLCBjaGVjaylcclxuICAgICAgICBkb2Mub2ZmKCdET01Db250ZW50TG9hZGVkJywgZG9tcmVhZHkpXHJcbiAgICAgICAgd2luLm9mZignbG9hZCcsIGRvbXJlYWR5KVxyXG5cclxuICAgICAgICBsb2FkZWQgPSB0cnVlXHJcblxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyByZWFkeSA9IHJlYWR5c1tpKytdOykgcmVhZHkoKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBsb2FkZWRcclxuXHJcbn1cclxuXHJcbnZhciBjaGVjayA9IGZ1bmN0aW9uKCl7XHJcbiAgICBmb3IgKHZhciBpID0gY2hlY2tzLmxlbmd0aDsgaS0tOykgaWYgKGNoZWNrc1tpXSgpKSByZXR1cm4gZG9tcmVhZHkoKVxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbn1cclxuXHJcbnZhciBwb2xsID0gZnVuY3Rpb24oKXtcclxuICAgIGNsZWFyVGltZW91dCh0aW1lcilcclxuICAgIGlmICghY2hlY2soKSkgdGltZXIgPSBzZXRUaW1lb3V0KHBvbGwsIDFlMyAvIDYwKVxyXG59XHJcblxyXG5pZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSl7IC8vIHVzZSByZWFkeVN0YXRlIGlmIGF2YWlsYWJsZVxyXG5cclxuICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuICEhKC9sb2FkZWR8Y29tcGxldGUvKS50ZXN0KGRvY3VtZW50LnJlYWR5U3RhdGUpXHJcbiAgICB9XHJcblxyXG4gICAgY2hlY2tzLnB1c2goY29tcGxldGUpXHJcblxyXG4gICAgaWYgKCFjb21wbGV0ZSgpKXsgLy8gdW5sZXNzIGRvbSBpcyBhbHJlYWR5IGxvYWRlZFxyXG4gICAgICAgIGlmIChyZWFkeXN0YXRlY2hhbmdlKSBkb2Mub24oJ3JlYWR5c3RhdGVjaGFuZ2UnLCBjaGVjaykgLy8gb25yZWFkeXN0YXRlY2hhbmdlIGV2ZW50XHJcbiAgICAgICAgZWxzZSBzaG91bGRQb2xsID0gdHJ1ZSAvL29yIHBvbGwgcmVhZHlTdGF0ZSBjaGVja1xyXG4gICAgfSBlbHNlIHsgLy8gZG9tIGlzIGFscmVhZHkgbG9hZGVkXHJcbiAgICAgICAgZG9tcmVhZHkoKVxyXG4gICAgfVxyXG5cclxufVxyXG5cclxuaWYgKHRlc3QuZG9TY3JvbGwpeyAvLyBhbHNvIHVzZSBkb1Njcm9sbCBpZiBhdmFpbGFibGUgKGRvc2Nyb2xsIGNvbWVzIGJlZm9yZSByZWFkeVN0YXRlIFwiY29tcGxldGVcIilcclxuXHJcbiAgICAvLyBMRUdBTCBERVBUOlxyXG4gICAgLy8gZG9TY3JvbGwgdGVjaG5pcXVlIGRpc2NvdmVyZWQgYnksIG93bmVkIGJ5LCBhbmQgY29weXJpZ2h0ZWQgdG8gRGllZ28gUGVyaW5pIGh0dHA6Ly9qYXZhc2NyaXB0Lm53Ym94LmNvbS9JRUNvbnRlbnRMb2FkZWQvXHJcblxyXG4gICAgLy8gdGVzdEVsZW1lbnQuZG9TY3JvbGwoKSB0aHJvd3Mgd2hlbiB0aGUgRE9NIGlzIG5vdCByZWFkeSwgb25seSBpbiB0aGUgdG9wIHdpbmRvd1xyXG5cclxuICAgIHZhciBzY3JvbGxzID0gZnVuY3Rpb24oKXtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB0ZXN0LmRvU2Nyb2xsKClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9IGNhdGNoIChlKXt9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgLy8gSWYgZG9TY3JvbGwgd29ya3MgYWxyZWFkeSwgaXQgY2FuJ3QgYmUgdXNlZCB0byBkZXRlcm1pbmUgZG9tcmVhZHlcclxuICAgIC8vIGUuZy4gaW4gYW4gaWZyYW1lXHJcblxyXG4gICAgaWYgKCFzY3JvbGxzKCkpe1xyXG4gICAgICAgIGNoZWNrcy5wdXNoKHNjcm9sbHMpXHJcbiAgICAgICAgc2hvdWxkUG9sbCA9IHRydWVcclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmlmIChzaG91bGRQb2xsKSBwb2xsKClcclxuXHJcbi8vIG1ha2Ugc3VyZSB0aGF0IGRvbXJlYWR5IGZpcmVzIGJlZm9yZSBsb2FkLCBhbHNvIGlmIG5vdCBvbnJlYWR5c3RhdGVjaGFuZ2UgYW5kIGRvU2Nyb2xsIGFuZCBET01Db250ZW50TG9hZGVkIGxvYWQgd2lsbCBmaXJlXHJcbmRvYy5vbignRE9NQ29udGVudExvYWRlZCcsIGRvbXJlYWR5KVxyXG53aW4ub24oJ2xvYWQnLCBkb21yZWFkeSlcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocmVhZHkpe1xyXG4gICAgKGxvYWRlZCkgPyByZWFkeSgpIDogcmVhZHlzLnB1c2gocmVhZHkpXHJcbiAgICByZXR1cm4gbnVsbFxyXG59XHJcbiIsIi8qXHJcbmV2ZW50c1xyXG4qL1widXNlIHN0cmljdFwiXHJcblxyXG52YXIgRW1pdHRlciA9IHJlcXVpcmUoXCJwcmltZS9lbWl0dGVyXCIpXHJcblxyXG52YXIgJCA9IHJlcXVpcmUoXCIuL2Jhc2VcIilcclxuXHJcbnZhciBodG1sID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XHJcblxyXG52YXIgYWRkRXZlbnRMaXN0ZW5lciA9IGh0bWwuYWRkRXZlbnRMaXN0ZW5lciA/IGZ1bmN0aW9uKG5vZGUsIGV2ZW50LCBoYW5kbGUsIHVzZUNhcHR1cmUpe1xyXG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGUsIHVzZUNhcHR1cmUgfHwgZmFsc2UpXHJcbiAgICByZXR1cm4gaGFuZGxlXHJcbn0gOiBmdW5jdGlvbihub2RlLCBldmVudCwgaGFuZGxlKXtcclxuICAgIG5vZGUuYXR0YWNoRXZlbnQoJ29uJyArIGV2ZW50LCBoYW5kbGUpXHJcbiAgICByZXR1cm4gaGFuZGxlXHJcbn1cclxuXHJcbnZhciByZW1vdmVFdmVudExpc3RlbmVyID0gaHRtbC5yZW1vdmVFdmVudExpc3RlbmVyID8gZnVuY3Rpb24obm9kZSwgZXZlbnQsIGhhbmRsZSwgdXNlQ2FwdHVyZSl7XHJcbiAgICBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIGhhbmRsZSwgdXNlQ2FwdHVyZSB8fCBmYWxzZSlcclxufSA6IGZ1bmN0aW9uKG5vZGUsIGV2ZW50LCBoYW5kbGUpe1xyXG4gICAgbm9kZS5kZXRhY2hFdmVudChcIm9uXCIgKyBldmVudCwgaGFuZGxlKVxyXG59XHJcblxyXG4kLmltcGxlbWVudCh7XHJcblxyXG4gICAgb246IGZ1bmN0aW9uKGV2ZW50LCBoYW5kbGUsIHVzZUNhcHR1cmUpe1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpe1xyXG4gICAgICAgICAgICB2YXIgc2VsZiA9ICQobm9kZSlcclxuXHJcbiAgICAgICAgICAgIHZhciBpbnRlcm5hbEV2ZW50ID0gZXZlbnQgKyAodXNlQ2FwdHVyZSA/IFwiOmNhcHR1cmVcIiA6IFwiXCIpXHJcblxyXG4gICAgICAgICAgICBFbWl0dGVyLnByb3RvdHlwZS5vbi5jYWxsKHNlbGYsIGludGVybmFsRXZlbnQsIGhhbmRsZSlcclxuXHJcbiAgICAgICAgICAgIHZhciBkb21MaXN0ZW5lcnMgPSBzZWxmLl9kb21MaXN0ZW5lcnMgfHwgKHNlbGYuX2RvbUxpc3RlbmVycyA9IHt9KVxyXG4gICAgICAgICAgICBpZiAoIWRvbUxpc3RlbmVyc1tpbnRlcm5hbEV2ZW50XSkgZG9tTGlzdGVuZXJzW2ludGVybmFsRXZlbnRdID0gYWRkRXZlbnRMaXN0ZW5lcihub2RlLCBldmVudCwgZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgICAgICAgICBFbWl0dGVyLnByb3RvdHlwZS5lbWl0LmNhbGwoc2VsZiwgaW50ZXJuYWxFdmVudCwgZSB8fCB3aW5kb3cuZXZlbnQsIEVtaXR0ZXIuRU1JVF9TWU5DKVxyXG4gICAgICAgICAgICB9LCB1c2VDYXB0dXJlKVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGhhbmRsZSwgdXNlQ2FwdHVyZSl7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLmZvckVhY2goZnVuY3Rpb24obm9kZSl7XHJcblxyXG4gICAgICAgICAgICB2YXIgc2VsZiA9ICQobm9kZSlcclxuXHJcbiAgICAgICAgICAgIHZhciBpbnRlcm5hbEV2ZW50ID0gZXZlbnQgKyAodXNlQ2FwdHVyZSA/IFwiOmNhcHR1cmVcIiA6IFwiXCIpXHJcblxyXG4gICAgICAgICAgICB2YXIgZG9tTGlzdGVuZXJzID0gc2VsZi5fZG9tTGlzdGVuZXJzLCBkb21FdmVudCwgbGlzdGVuZXJzID0gc2VsZi5fbGlzdGVuZXJzLCBldmVudHNcclxuXHJcbiAgICAgICAgICAgIGlmIChkb21MaXN0ZW5lcnMgJiYgKGRvbUV2ZW50ID0gZG9tTGlzdGVuZXJzW2ludGVybmFsRXZlbnRdKSAmJiBsaXN0ZW5lcnMgJiYgKGV2ZW50cyA9IGxpc3RlbmVyc1tpbnRlcm5hbEV2ZW50XSkpe1xyXG5cclxuICAgICAgICAgICAgICAgIEVtaXR0ZXIucHJvdG90eXBlLm9mZi5jYWxsKHNlbGYsIGludGVybmFsRXZlbnQsIGhhbmRsZSlcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXNlbGYuX2xpc3RlbmVycyB8fCAhc2VsZi5fbGlzdGVuZXJzW2V2ZW50XSl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcihub2RlLCBldmVudCwgZG9tRXZlbnQpXHJcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGRvbUxpc3RlbmVyc1tldmVudF1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgbCBpbiBkb21MaXN0ZW5lcnMpIHJldHVyblxyXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzZWxmLl9kb21MaXN0ZW5lcnNcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICBlbWl0OiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcclxuICAgICAgICAgICAgRW1pdHRlci5wcm90b3R5cGUuZW1pdC5hcHBseSgkKG5vZGUpLCBhcmdzKVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG59KVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAkXHJcbiIsIi8qXHJcbmVsZW1lbnRzXHJcbiovXCJ1c2Ugc3RyaWN0XCJcclxuXHJcbnZhciAkID0gcmVxdWlyZShcIi4vYmFzZVwiKVxyXG4gICAgICAgIHJlcXVpcmUoXCIuL2F0dHJpYnV0ZXNcIilcclxuICAgICAgICByZXF1aXJlKFwiLi9ldmVudHNcIilcclxuICAgICAgICByZXF1aXJlKFwiLi9pbnNlcnRpb25cIilcclxuICAgICAgICByZXF1aXJlKFwiLi90cmF2ZXJzYWxcIilcclxuICAgICAgICByZXF1aXJlKFwiLi9kZWxlZ2F0aW9uXCIpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICRcclxuIiwiLypcclxuaW5zZXJ0aW9uXHJcbiovXCJ1c2Ugc3RyaWN0XCJcclxuXHJcbnZhciAkID0gcmVxdWlyZShcIi4vYmFzZVwiKVxyXG5cclxuLy8gYmFzZSBpbnNlcnRpb25cclxuXHJcbiQuaW1wbGVtZW50KHtcclxuXHJcbiAgICBhcHBlbmRDaGlsZDogZnVuY3Rpb24oY2hpbGQpe1xyXG4gICAgICAgIHRoaXNbMF0uYXBwZW5kQ2hpbGQoJChjaGlsZClbMF0pXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH0sXHJcblxyXG4gICAgaW5zZXJ0QmVmb3JlOiBmdW5jdGlvbihjaGlsZCwgcmVmKXtcclxuICAgICAgICB0aGlzWzBdLmluc2VydEJlZm9yZSgkKGNoaWxkKVswXSwgJChyZWYpWzBdKVxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9LFxyXG5cclxuICAgIHJlbW92ZUNoaWxkOiBmdW5jdGlvbihjaGlsZCl7XHJcbiAgICAgICAgdGhpc1swXS5yZW1vdmVDaGlsZCgkKGNoaWxkKVswXSlcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfSxcclxuXHJcbiAgICByZXBsYWNlQ2hpbGQ6IGZ1bmN0aW9uKGNoaWxkLCByZWYpe1xyXG4gICAgICAgIHRoaXNbMF0ucmVwbGFjZUNoaWxkKCQoY2hpbGQpWzBdLCAkKHJlZilbMF0pXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbn0pXHJcblxyXG4vLyBiZWZvcmUsIGFmdGVyLCBib3R0b20sIHRvcFxyXG5cclxuJC5pbXBsZW1lbnQoe1xyXG5cclxuICAgIGJlZm9yZTogZnVuY3Rpb24oZWxlbWVudCl7XHJcbiAgICAgICAgZWxlbWVudCA9ICQoZWxlbWVudClbMF1cclxuICAgICAgICB2YXIgcGFyZW50ID0gZWxlbWVudC5wYXJlbnROb2RlXHJcbiAgICAgICAgaWYgKHBhcmVudCkgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpe1xyXG4gICAgICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKG5vZGUsIGVsZW1lbnQpXHJcbiAgICAgICAgfSlcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfSxcclxuXHJcbiAgICBhZnRlcjogZnVuY3Rpb24oZWxlbWVudCl7XHJcbiAgICAgICAgZWxlbWVudCA9ICQoZWxlbWVudClbMF1cclxuICAgICAgICB2YXIgcGFyZW50ID0gZWxlbWVudC5wYXJlbnROb2RlXHJcbiAgICAgICAgaWYgKHBhcmVudCkgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpe1xyXG4gICAgICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKG5vZGUsIGVsZW1lbnQubmV4dFNpYmxpbmcpXHJcbiAgICAgICAgfSlcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfSxcclxuXHJcbiAgICBib3R0b206IGZ1bmN0aW9uKGVsZW1lbnQpe1xyXG4gICAgICAgIGVsZW1lbnQgPSAkKGVsZW1lbnQpWzBdXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcclxuICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZChub2RlKVxyXG4gICAgICAgIH0pXHJcbiAgICB9LFxyXG5cclxuICAgIHRvcDogZnVuY3Rpb24oZWxlbWVudCl7XHJcbiAgICAgICAgZWxlbWVudCA9ICQoZWxlbWVudClbMF1cclxuICAgICAgICByZXR1cm4gdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpe1xyXG4gICAgICAgICAgICBlbGVtZW50Lmluc2VydEJlZm9yZShub2RlLCBlbGVtZW50LmZpcnN0Q2hpbGQpXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbn0pXHJcblxyXG4vLyBpbnNlcnQsIHJlcGxhY2VcclxuXHJcbiQuaW1wbGVtZW50KHtcclxuXHJcbiAgICBpbnNlcnQ6ICQucHJvdG90eXBlLmJvdHRvbSxcclxuXHJcbiAgICByZW1vdmU6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcclxuICAgICAgICAgICAgdmFyIHBhcmVudCA9IG5vZGUucGFyZW50Tm9kZVxyXG4gICAgICAgICAgICBpZiAocGFyZW50KSBwYXJlbnQucmVtb3ZlQ2hpbGQobm9kZSlcclxuICAgICAgICB9KVxyXG4gICAgfSxcclxuXHJcbiAgICByZXBsYWNlOiBmdW5jdGlvbihlbGVtZW50KXtcclxuICAgICAgICBlbGVtZW50ID0gJChlbGVtZW50KVswXVxyXG4gICAgICAgIGVsZW1lbnQucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQodGhpc1swXSwgZWxlbWVudClcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxufSlcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gJFxyXG4iLCJ2YXIgbWFrZUl0ZXJhdG9yID0gcmVxdWlyZSgnLi4vZnVuY3Rpb24vbWFrZUl0ZXJhdG9yXycpO1xuXG4gICAgLyoqXG4gICAgICogQXJyYXkgZXZlcnlcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBldmVyeShhcnIsIGNhbGxiYWNrLCB0aGlzT2JqKSB7XG4gICAgICAgIGNhbGxiYWNrID0gbWFrZUl0ZXJhdG9yKGNhbGxiYWNrLCB0aGlzT2JqKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHRydWU7XG4gICAgICAgIGlmIChhcnIgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpID0gLTEsIGxlbiA9IGFyci5sZW5ndGg7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIC8vIHdlIGl0ZXJhdGUgb3ZlciBzcGFyc2UgaXRlbXMgc2luY2UgdGhlcmUgaXMgbm8gd2F5IHRvIG1ha2UgaXRcbiAgICAgICAgICAgIC8vIHdvcmsgcHJvcGVybHkgb24gSUUgNy04LiBzZWUgIzY0XG4gICAgICAgICAgICBpZiAoIWNhbGxiYWNrKGFycltpXSwgaSwgYXJyKSApIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBldmVyeTtcblxuIiwidmFyIG1ha2VJdGVyYXRvciA9IHJlcXVpcmUoJy4uL2Z1bmN0aW9uL21ha2VJdGVyYXRvcl8nKTtcblxuICAgIC8qKlxuICAgICAqIEFycmF5IGZpbHRlclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbHRlcihhcnIsIGNhbGxiYWNrLCB0aGlzT2JqKSB7XG4gICAgICAgIGNhbGxiYWNrID0gbWFrZUl0ZXJhdG9yKGNhbGxiYWNrLCB0aGlzT2JqKTtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgaWYgKGFyciA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpID0gLTEsIGxlbiA9IGFyci5sZW5ndGgsIHZhbHVlO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGFycltpXTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayh2YWx1ZSwgaSwgYXJyKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZpbHRlcjtcblxuXG4iLCJcblxuICAgIC8qKlxuICAgICAqIEFycmF5IGZvckVhY2hcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmb3JFYWNoKGFyciwgY2FsbGJhY2ssIHRoaXNPYmopIHtcbiAgICAgICAgaWYgKGFyciA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGkgPSAtMSxcbiAgICAgICAgICAgIGxlbiA9IGFyci5sZW5ndGg7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIC8vIHdlIGl0ZXJhdGUgb3ZlciBzcGFyc2UgaXRlbXMgc2luY2UgdGhlcmUgaXMgbm8gd2F5IHRvIG1ha2UgaXRcbiAgICAgICAgICAgIC8vIHdvcmsgcHJvcGVybHkgb24gSUUgNy04LiBzZWUgIzY0XG4gICAgICAgICAgICBpZiAoIGNhbGxiYWNrLmNhbGwodGhpc09iaiwgYXJyW2ldLCBpLCBhcnIpID09PSBmYWxzZSApIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gZm9yRWFjaDtcblxuXG4iLCJcblxuICAgIC8qKlxuICAgICAqIEFycmF5LmluZGV4T2ZcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbmRleE9mKGFyciwgaXRlbSwgZnJvbUluZGV4KSB7XG4gICAgICAgIGZyb21JbmRleCA9IGZyb21JbmRleCB8fCAwO1xuICAgICAgICBpZiAoYXJyID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsZW4gPSBhcnIubGVuZ3RoLFxuICAgICAgICAgICAgaSA9IGZyb21JbmRleCA8IDAgPyBsZW4gKyBmcm9tSW5kZXggOiBmcm9tSW5kZXg7XG4gICAgICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICAgICAgICAvLyB3ZSBpdGVyYXRlIG92ZXIgc3BhcnNlIGl0ZW1zIHNpbmNlIHRoZXJlIGlzIG5vIHdheSB0byBtYWtlIGl0XG4gICAgICAgICAgICAvLyB3b3JrIHByb3Blcmx5IG9uIElFIDctOC4gc2VlICM2NFxuICAgICAgICAgICAgaWYgKGFycltpXSA9PT0gaXRlbSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBpbmRleE9mO1xuXG4iLCJ2YXIgbWFrZUl0ZXJhdG9yID0gcmVxdWlyZSgnLi4vZnVuY3Rpb24vbWFrZUl0ZXJhdG9yXycpO1xuXG4gICAgLyoqXG4gICAgICogQXJyYXkgbWFwXG4gICAgICovXG4gICAgZnVuY3Rpb24gbWFwKGFyciwgY2FsbGJhY2ssIHRoaXNPYmopIHtcbiAgICAgICAgY2FsbGJhY2sgPSBtYWtlSXRlcmF0b3IoY2FsbGJhY2ssIHRoaXNPYmopO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICBpZiAoYXJyID09IG51bGwpe1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaSA9IC0xLCBsZW4gPSBhcnIubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICByZXN1bHRzW2ldID0gY2FsbGJhY2soYXJyW2ldLCBpLCBhcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuXG4gICAgIG1vZHVsZS5leHBvcnRzID0gbWFwO1xuXG4iLCJ2YXIgbWFrZUl0ZXJhdG9yID0gcmVxdWlyZSgnLi4vZnVuY3Rpb24vbWFrZUl0ZXJhdG9yXycpO1xuXG4gICAgLyoqXG4gICAgICogQXJyYXkgc29tZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNvbWUoYXJyLCBjYWxsYmFjaywgdGhpc09iaikge1xuICAgICAgICBjYWxsYmFjayA9IG1ha2VJdGVyYXRvcihjYWxsYmFjaywgdGhpc09iaik7XG4gICAgICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgaWYgKGFyciA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGkgPSAtMSwgbGVuID0gYXJyLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgLy8gd2UgaXRlcmF0ZSBvdmVyIHNwYXJzZSBpdGVtcyBzaW5jZSB0aGVyZSBpcyBubyB3YXkgdG8gbWFrZSBpdFxuICAgICAgICAgICAgLy8gd29yayBwcm9wZXJseSBvbiBJRSA3LTguIHNlZSAjNjRcbiAgICAgICAgICAgIGlmICggY2FsbGJhY2soYXJyW2ldLCBpLCBhcnIpICkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gc29tZTtcblxuIiwiXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBmaXJzdCBhcmd1bWVudCBwcm92aWRlZCB0byBpdC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpZGVudGl0eSh2YWwpe1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gaWRlbnRpdHk7XG5cblxuIiwidmFyIGlkZW50aXR5ID0gcmVxdWlyZSgnLi9pZGVudGl0eScpO1xudmFyIHByb3AgPSByZXF1aXJlKCcuL3Byb3AnKTtcbnZhciBkZWVwTWF0Y2hlcyA9IHJlcXVpcmUoJy4uL29iamVjdC9kZWVwTWF0Y2hlcycpO1xuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgYXJndW1lbnQgaW50byBhIHZhbGlkIGl0ZXJhdG9yLlxuICAgICAqIFVzZWQgaW50ZXJuYWxseSBvbiBtb3N0IGFycmF5L29iamVjdC9jb2xsZWN0aW9uIG1ldGhvZHMgdGhhdCByZWNlaXZlcyBhXG4gICAgICogY2FsbGJhY2svaXRlcmF0b3IgcHJvdmlkaW5nIGEgc2hvcnRjdXQgc3ludGF4LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1ha2VJdGVyYXRvcihzcmMsIHRoaXNPYmope1xuICAgICAgICBpZiAoc3JjID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBpZGVudGl0eTtcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2godHlwZW9mIHNyYykge1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIC8vIGZ1bmN0aW9uIGlzIHRoZSBmaXJzdCB0byBpbXByb3ZlIHBlcmYgKG1vc3QgY29tbW9uIGNhc2UpXG4gICAgICAgICAgICAgICAgLy8gYWxzbyBhdm9pZCB1c2luZyBgRnVuY3Rpb24jY2FsbGAgaWYgbm90IG5lZWRlZCwgd2hpY2ggYm9vc3RzXG4gICAgICAgICAgICAgICAgLy8gcGVyZiBhIGxvdCBpbiBzb21lIGNhc2VzXG4gICAgICAgICAgICAgICAgcmV0dXJuICh0eXBlb2YgdGhpc09iaiAhPT0gJ3VuZGVmaW5lZCcpPyBmdW5jdGlvbih2YWwsIGksIGFycil7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzcmMuY2FsbCh0aGlzT2JqLCB2YWwsIGksIGFycik7XG4gICAgICAgICAgICAgICAgfSA6IHNyYztcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHZhbCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkZWVwTWF0Y2hlcyh2YWwsIHNyYyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wKHNyYyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IG1ha2VJdGVyYXRvcjtcblxuXG4iLCJcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGdldHMgYSBwcm9wZXJ0eSBvZiB0aGUgcGFzc2VkIG9iamVjdFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHByb3AobmFtZSl7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgcmV0dXJuIG9ialtuYW1lXTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHByb3A7XG5cblxuIiwidmFyIGlzS2luZCA9IHJlcXVpcmUoJy4vaXNLaW5kJyk7XG4gICAgLyoqXG4gICAgICovXG4gICAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuIGlzS2luZCh2YWwsICdBcnJheScpO1xuICAgIH07XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBpc0FycmF5O1xuXG4iLCJ2YXIga2luZE9mID0gcmVxdWlyZSgnLi9raW5kT2YnKTtcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB2YWx1ZSBpcyBmcm9tIGEgc3BlY2lmaWMgXCJraW5kXCIuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNLaW5kKHZhbCwga2luZCl7XG4gICAgICAgIHJldHVybiBraW5kT2YodmFsKSA9PT0ga2luZDtcbiAgICB9XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBpc0tpbmQ7XG5cbiIsIlxuXG4gICAgdmFyIF9yS2luZCA9IC9eXFxbb2JqZWN0ICguKilcXF0kLyxcbiAgICAgICAgX3RvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcbiAgICAgICAgVU5ERUY7XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBcImtpbmRcIiBvZiB2YWx1ZS4gKGUuZy4gXCJTdHJpbmdcIiwgXCJOdW1iZXJcIiwgZXRjKVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGtpbmRPZih2YWwpIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuICdOdWxsJztcbiAgICAgICAgfSBlbHNlIGlmICh2YWwgPT09IFVOREVGKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1VuZGVmaW5lZCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gX3JLaW5kLmV4ZWMoIF90b1N0cmluZy5jYWxsKHZhbCkgKVsxXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGtpbmRPZjtcblxuIiwiXG5cbiAgICAvKipcbiAgICAgKiBUeXBlY2FzdCBhIHZhbHVlIHRvIGEgU3RyaW5nLCB1c2luZyBhbiBlbXB0eSBzdHJpbmcgdmFsdWUgZm9yIG51bGwgb3JcbiAgICAgKiB1bmRlZmluZWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gdG9TdHJpbmcodmFsKXtcbiAgICAgICAgcmV0dXJuIHZhbCA9PSBudWxsID8gJycgOiB2YWwudG9TdHJpbmcoKTtcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHRvU3RyaW5nO1xuXG5cbiIsInZhciBmb3JPd24gPSByZXF1aXJlKCcuL2Zvck93bicpO1xudmFyIGlzQXJyYXkgPSByZXF1aXJlKCcuLi9sYW5nL2lzQXJyYXknKTtcblxuICAgIGZ1bmN0aW9uIGNvbnRhaW5zTWF0Y2goYXJyYXksIHBhdHRlcm4pIHtcbiAgICAgICAgdmFyIGkgPSAtMSwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoZGVlcE1hdGNoZXMoYXJyYXlbaV0sIHBhdHRlcm4pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWF0Y2hBcnJheSh0YXJnZXQsIHBhdHRlcm4pIHtcbiAgICAgICAgdmFyIGkgPSAtMSwgcGF0dGVybkxlbmd0aCA9IHBhdHRlcm4ubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoKytpIDwgcGF0dGVybkxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKCFjb250YWluc01hdGNoKHRhcmdldCwgcGF0dGVybltpXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXRjaE9iamVjdCh0YXJnZXQsIHBhdHRlcm4pIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHRydWU7XG4gICAgICAgIGZvck93bihwYXR0ZXJuLCBmdW5jdGlvbih2YWwsIGtleSkge1xuICAgICAgICAgICAgaWYgKCFkZWVwTWF0Y2hlcyh0YXJnZXRba2V5XSwgdmFsKSkge1xuICAgICAgICAgICAgICAgIC8vIFJldHVybiBmYWxzZSB0byBicmVhayBvdXQgb2YgZm9yT3duIGVhcmx5XG4gICAgICAgICAgICAgICAgcmV0dXJuIChyZXN1bHQgPSBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVjdXJzaXZlbHkgY2hlY2sgaWYgdGhlIG9iamVjdHMgbWF0Y2guXG4gICAgICovXG4gICAgZnVuY3Rpb24gZGVlcE1hdGNoZXModGFyZ2V0LCBwYXR0ZXJuKXtcbiAgICAgICAgaWYgKHRhcmdldCAmJiB0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgaWYgKGlzQXJyYXkodGFyZ2V0KSAmJiBpc0FycmF5KHBhdHRlcm4pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoQXJyYXkodGFyZ2V0LCBwYXR0ZXJuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoT2JqZWN0KHRhcmdldCwgcGF0dGVybik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0ID09PSBwYXR0ZXJuO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkZWVwTWF0Y2hlcztcblxuXG4iLCJ2YXIgaGFzT3duID0gcmVxdWlyZSgnLi9oYXNPd24nKTtcblxuICAgIHZhciBfaGFzRG9udEVudW1CdWcsXG4gICAgICAgIF9kb250RW51bXM7XG5cbiAgICBmdW5jdGlvbiBjaGVja0RvbnRFbnVtKCl7XG4gICAgICAgIF9kb250RW51bXMgPSBbXG4gICAgICAgICAgICAgICAgJ3RvU3RyaW5nJyxcbiAgICAgICAgICAgICAgICAndG9Mb2NhbGVTdHJpbmcnLFxuICAgICAgICAgICAgICAgICd2YWx1ZU9mJyxcbiAgICAgICAgICAgICAgICAnaGFzT3duUHJvcGVydHknLFxuICAgICAgICAgICAgICAgICdpc1Byb3RvdHlwZU9mJyxcbiAgICAgICAgICAgICAgICAncHJvcGVydHlJc0VudW1lcmFibGUnLFxuICAgICAgICAgICAgICAgICdjb25zdHJ1Y3RvcidcbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgX2hhc0RvbnRFbnVtQnVnID0gdHJ1ZTtcblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4geyd0b1N0cmluZyc6IG51bGx9KSB7XG4gICAgICAgICAgICBfaGFzRG9udEVudW1CdWcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNpbWlsYXIgdG8gQXJyYXkvZm9yRWFjaCBidXQgd29ya3Mgb3ZlciBvYmplY3QgcHJvcGVydGllcyBhbmQgZml4ZXMgRG9uJ3RcbiAgICAgKiBFbnVtIGJ1ZyBvbiBJRS5cbiAgICAgKiBiYXNlZCBvbjogaHR0cDovL3doYXR0aGVoZWFkc2FpZC5jb20vMjAxMC8xMC9hLXNhZmVyLW9iamVjdC1rZXlzLWNvbXBhdGliaWxpdHktaW1wbGVtZW50YXRpb25cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmb3JJbihvYmosIGZuLCB0aGlzT2JqKXtcbiAgICAgICAgdmFyIGtleSwgaSA9IDA7XG4gICAgICAgIC8vIG5vIG5lZWQgdG8gY2hlY2sgaWYgYXJndW1lbnQgaXMgYSByZWFsIG9iamVjdCB0aGF0IHdheSB3ZSBjYW4gdXNlXG4gICAgICAgIC8vIGl0IGZvciBhcnJheXMsIGZ1bmN0aW9ucywgZGF0ZSwgZXRjLlxuXG4gICAgICAgIC8vcG9zdC1wb25lIGNoZWNrIHRpbGwgbmVlZGVkXG4gICAgICAgIGlmIChfaGFzRG9udEVudW1CdWcgPT0gbnVsbCkgY2hlY2tEb250RW51bSgpO1xuXG4gICAgICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgICAgICAgaWYgKGV4ZWMoZm4sIG9iaiwga2V5LCB0aGlzT2JqKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKF9oYXNEb250RW51bUJ1Zykge1xuICAgICAgICAgICAgdmFyIGN0b3IgPSBvYmouY29uc3RydWN0b3IsXG4gICAgICAgICAgICAgICAgaXNQcm90byA9ICEhY3RvciAmJiBvYmogPT09IGN0b3IucHJvdG90eXBlO1xuXG4gICAgICAgICAgICB3aGlsZSAoa2V5ID0gX2RvbnRFbnVtc1tpKytdKSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIGNvbnN0cnVjdG9yLCBpZiBpdCBpcyBhIHByb3RvdHlwZSBvYmplY3QgdGhlIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgLy8gaXMgYWx3YXlzIG5vbi1lbnVtZXJhYmxlIHVubGVzcyBkZWZpbmVkIG90aGVyd2lzZSAoYW5kXG4gICAgICAgICAgICAgICAgLy8gZW51bWVyYXRlZCBhYm92ZSkuICBGb3Igbm9uLXByb3RvdHlwZSBvYmplY3RzLCBpdCB3aWxsIGhhdmVcbiAgICAgICAgICAgICAgICAvLyB0byBiZSBkZWZpbmVkIG9uIHRoaXMgb2JqZWN0LCBzaW5jZSBpdCBjYW5ub3QgYmUgZGVmaW5lZCBvblxuICAgICAgICAgICAgICAgIC8vIGFueSBwcm90b3R5cGUgb2JqZWN0cy5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vIEZvciBvdGhlciBbW0RvbnRFbnVtXV0gcHJvcGVydGllcywgY2hlY2sgaWYgdGhlIHZhbHVlIGlzXG4gICAgICAgICAgICAgICAgLy8gZGlmZmVyZW50IHRoYW4gT2JqZWN0IHByb3RvdHlwZSB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgIChrZXkgIT09ICdjb25zdHJ1Y3RvcicgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICghaXNQcm90byAmJiBoYXNPd24ob2JqLCBrZXkpKSkgJiZcbiAgICAgICAgICAgICAgICAgICAgb2JqW2tleV0gIT09IE9iamVjdC5wcm90b3R5cGVba2V5XVxuICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXhlYyhmbiwgb2JqLCBrZXksIHRoaXNPYmopID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleGVjKGZuLCBvYmosIGtleSwgdGhpc09iail7XG4gICAgICAgIHJldHVybiBmbi5jYWxsKHRoaXNPYmosIG9ialtrZXldLCBrZXksIG9iaik7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmb3JJbjtcblxuXG4iLCJ2YXIgaGFzT3duID0gcmVxdWlyZSgnLi9oYXNPd24nKTtcbnZhciBmb3JJbiA9IHJlcXVpcmUoJy4vZm9ySW4nKTtcblxuICAgIC8qKlxuICAgICAqIFNpbWlsYXIgdG8gQXJyYXkvZm9yRWFjaCBidXQgd29ya3Mgb3ZlciBvYmplY3QgcHJvcGVydGllcyBhbmQgZml4ZXMgRG9uJ3RcbiAgICAgKiBFbnVtIGJ1ZyBvbiBJRS5cbiAgICAgKiBiYXNlZCBvbjogaHR0cDovL3doYXR0aGVoZWFkc2FpZC5jb20vMjAxMC8xMC9hLXNhZmVyLW9iamVjdC1rZXlzLWNvbXBhdGliaWxpdHktaW1wbGVtZW50YXRpb25cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmb3JPd24ob2JqLCBmbiwgdGhpc09iail7XG4gICAgICAgIGZvckluKG9iaiwgZnVuY3Rpb24odmFsLCBrZXkpe1xuICAgICAgICAgICAgaWYgKGhhc093bihvYmosIGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uY2FsbCh0aGlzT2JqLCBvYmpba2V5XSwga2V5LCBvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZvck93bjtcblxuXG4iLCJcblxuICAgIC8qKlxuICAgICAqIFNhZmVyIE9iamVjdC5oYXNPd25Qcm9wZXJ0eVxuICAgICAqL1xuICAgICBmdW5jdGlvbiBoYXNPd24ob2JqLCBwcm9wKXtcbiAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbiAgICAgfVxuXG4gICAgIG1vZHVsZS5leHBvcnRzID0gaGFzT3duO1xuXG5cbiIsIlxuICAgIC8qKlxuICAgICAqIENvbnRhaW5zIGFsbCBVbmljb2RlIHdoaXRlLXNwYWNlcy4gVGFrZW4gZnJvbVxuICAgICAqIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2hpdGVzcGFjZV9jaGFyYWN0ZXIuXG4gICAgICovXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBbXG4gICAgICAgICcgJywgJ1xcbicsICdcXHInLCAnXFx0JywgJ1xcZicsICdcXHYnLCAnXFx1MDBBMCcsICdcXHUxNjgwJywgJ1xcdTE4MEUnLFxuICAgICAgICAnXFx1MjAwMCcsICdcXHUyMDAxJywgJ1xcdTIwMDInLCAnXFx1MjAwMycsICdcXHUyMDA0JywgJ1xcdTIwMDUnLCAnXFx1MjAwNicsXG4gICAgICAgICdcXHUyMDA3JywgJ1xcdTIwMDgnLCAnXFx1MjAwOScsICdcXHUyMDBBJywgJ1xcdTIwMjgnLCAnXFx1MjAyOScsICdcXHUyMDJGJyxcbiAgICAgICAgJ1xcdTIwNUYnLCAnXFx1MzAwMCdcbiAgICBdO1xuXG4iLCJ2YXIgdG9TdHJpbmcgPSByZXF1aXJlKCcuLi9sYW5nL3RvU3RyaW5nJyk7XG52YXIgV0hJVEVfU1BBQ0VTID0gcmVxdWlyZSgnLi9XSElURV9TUEFDRVMnKTtcbiAgICAvKipcbiAgICAgKiBSZW1vdmUgY2hhcnMgZnJvbSBiZWdpbm5pbmcgb2Ygc3RyaW5nLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGx0cmltKHN0ciwgY2hhcnMpIHtcbiAgICAgICAgc3RyID0gdG9TdHJpbmcoc3RyKTtcbiAgICAgICAgY2hhcnMgPSBjaGFycyB8fCBXSElURV9TUEFDRVM7XG5cbiAgICAgICAgdmFyIHN0YXJ0ID0gMCxcbiAgICAgICAgICAgIGxlbiA9IHN0ci5sZW5ndGgsXG4gICAgICAgICAgICBjaGFyTGVuID0gY2hhcnMubGVuZ3RoLFxuICAgICAgICAgICAgZm91bmQgPSB0cnVlLFxuICAgICAgICAgICAgaSwgYztcblxuICAgICAgICB3aGlsZSAoZm91bmQgJiYgc3RhcnQgPCBsZW4pIHtcbiAgICAgICAgICAgIGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICBpID0gLTE7XG4gICAgICAgICAgICBjID0gc3RyLmNoYXJBdChzdGFydCk7XG5cbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBjaGFyTGVuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGMgPT09IGNoYXJzW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQrKztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIChzdGFydCA+PSBsZW4pID8gJycgOiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pO1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gbHRyaW07XG5cbiIsInZhciB0b1N0cmluZyA9IHJlcXVpcmUoJy4uL2xhbmcvdG9TdHJpbmcnKTtcbnZhciBXSElURV9TUEFDRVMgPSByZXF1aXJlKCcuL1dISVRFX1NQQUNFUycpO1xuICAgIC8qKlxuICAgICAqIFJlbW92ZSBjaGFycyBmcm9tIGVuZCBvZiBzdHJpbmcuXG4gICAgICovXG4gICAgZnVuY3Rpb24gcnRyaW0oc3RyLCBjaGFycykge1xuICAgICAgICBzdHIgPSB0b1N0cmluZyhzdHIpO1xuICAgICAgICBjaGFycyA9IGNoYXJzIHx8IFdISVRFX1NQQUNFUztcblxuICAgICAgICB2YXIgZW5kID0gc3RyLmxlbmd0aCAtIDEsXG4gICAgICAgICAgICBjaGFyTGVuID0gY2hhcnMubGVuZ3RoLFxuICAgICAgICAgICAgZm91bmQgPSB0cnVlLFxuICAgICAgICAgICAgaSwgYztcblxuICAgICAgICB3aGlsZSAoZm91bmQgJiYgZW5kID49IDApIHtcbiAgICAgICAgICAgIGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICBpID0gLTE7XG4gICAgICAgICAgICBjID0gc3RyLmNoYXJBdChlbmQpO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytpIDwgY2hhckxlbikge1xuICAgICAgICAgICAgICAgIGlmIChjID09PSBjaGFyc1tpXSkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGVuZC0tO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gKGVuZCA+PSAwKSA/IHN0ci5zdWJzdHJpbmcoMCwgZW5kICsgMSkgOiAnJztcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJ0cmltO1xuXG4iLCJ2YXIgdG9TdHJpbmcgPSByZXF1aXJlKCcuLi9sYW5nL3RvU3RyaW5nJyk7XG52YXIgV0hJVEVfU1BBQ0VTID0gcmVxdWlyZSgnLi9XSElURV9TUEFDRVMnKTtcbnZhciBsdHJpbSA9IHJlcXVpcmUoJy4vbHRyaW0nKTtcbnZhciBydHJpbSA9IHJlcXVpcmUoJy4vcnRyaW0nKTtcbiAgICAvKipcbiAgICAgKiBSZW1vdmUgd2hpdGUtc3BhY2VzIGZyb20gYmVnaW5uaW5nIGFuZCBlbmQgb2Ygc3RyaW5nLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRyaW0oc3RyLCBjaGFycykge1xuICAgICAgICBzdHIgPSB0b1N0cmluZyhzdHIpO1xuICAgICAgICBjaGFycyA9IGNoYXJzIHx8IFdISVRFX1NQQUNFUztcbiAgICAgICAgcmV0dXJuIGx0cmltKHJ0cmltKHN0ciwgY2hhcnMpLCBjaGFycyk7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB0cmltO1xuXG4iLCIvKlxyXG5TbGljayBGaW5kZXJcclxuKi9cInVzZSBzdHJpY3RcIlxyXG5cclxuLy8gTm90YWJsZSBjaGFuZ2VzIGZyb20gU2xpY2suRmluZGVyIDEuMC54XHJcblxyXG4vLyBmYXN0ZXIgYm90dG9tIC0+IHVwIGV4cHJlc3Npb24gbWF0Y2hpbmdcclxuLy8gcHJlZmVycyBtZW50YWwgc2FuaXR5IG92ZXIgKm9ic2Vzc2l2ZSBjb21wdWxzaXZlKiBtaWxsaXNlY29uZHMgc2F2aW5nc1xyXG4vLyB1c2VzIHByb3RvdHlwZXMgaW5zdGVhZCBvZiBvYmplY3RzXHJcbi8vIHRyaWVzIHRvIHVzZSBtYXRjaGVzU2VsZWN0b3Igc21hcnRseSwgd2hlbmV2ZXIgYXZhaWxhYmxlXHJcbi8vIGNhbiBwb3B1bGF0ZSBvYmplY3RzIGFzIHdlbGwgYXMgYXJyYXlzXHJcbi8vIGxvdHMgb2Ygc3R1ZmYgaXMgYnJva2VuIG9yIG5vdCBpbXBsZW1lbnRlZFxyXG5cclxudmFyIHBhcnNlID0gcmVxdWlyZShcIi4vcGFyc2VyXCIpXHJcblxyXG4vLyB1dGlsaXRpZXNcclxuXHJcbnZhciBpbmRleCA9IDAsXHJcbiAgICBjb3VudGVyID0gZG9jdW1lbnQuX19jb3VudGVyID0gKHBhcnNlSW50KGRvY3VtZW50Ll9fY291bnRlciB8fCAtMSwgMzYpICsgMSkudG9TdHJpbmcoMzYpLFxyXG4gICAga2V5ID0gXCJ1aWQ6XCIgKyBjb3VudGVyXHJcblxyXG52YXIgdW5pcXVlSUQgPSBmdW5jdGlvbihuLCB4bWwpe1xyXG4gICAgaWYgKG4gPT09IHdpbmRvdykgcmV0dXJuIFwid2luZG93XCJcclxuICAgIGlmIChuID09PSBkb2N1bWVudCkgcmV0dXJuIFwiZG9jdW1lbnRcIlxyXG4gICAgaWYgKG4gPT09IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkgcmV0dXJuIFwiaHRtbFwiXHJcblxyXG4gICAgaWYgKHhtbCkge1xyXG4gICAgICAgIHZhciB1aWQgPSBuLmdldEF0dHJpYnV0ZShrZXkpXHJcbiAgICAgICAgaWYgKCF1aWQpIHtcclxuICAgICAgICAgICAgdWlkID0gKGluZGV4KyspLnRvU3RyaW5nKDM2KVxyXG4gICAgICAgICAgICBuLnNldEF0dHJpYnV0ZShrZXksIHVpZClcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHVpZFxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gbltrZXldIHx8IChuW2tleV0gPSAoaW5kZXgrKykudG9TdHJpbmcoMzYpKVxyXG4gICAgfVxyXG59XHJcblxyXG52YXIgdW5pcXVlSURYTUwgPSBmdW5jdGlvbihuKSB7XHJcbiAgICByZXR1cm4gdW5pcXVlSUQobiwgdHJ1ZSlcclxufVxyXG5cclxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKG9iamVjdCl7XHJcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT09IFwiW29iamVjdCBBcnJheV1cIlxyXG59XHJcblxyXG4vLyB0ZXN0c1xyXG5cclxudmFyIHVuaXF1ZUluZGV4ID0gMDtcclxuXHJcbnZhciBIQVMgPSB7XHJcblxyXG4gICAgR0VUX0VMRU1FTlRfQllfSUQ6IGZ1bmN0aW9uKHRlc3QsIGlkKXtcclxuICAgICAgICBpZCA9IFwic2xpY2tfXCIgKyAodW5pcXVlSW5kZXgrKyk7XHJcbiAgICAgICAgLy8gY2hlY2tzIGlmIHRoZSBkb2N1bWVudCBoYXMgZ2V0RWxlbWVudEJ5SWQsIGFuZCBpdCB3b3Jrc1xyXG4gICAgICAgIHRlc3QuaW5uZXJIVE1MID0gJzxhIGlkPVwiJyArIGlkICsgJ1wiPjwvYT4nXHJcbiAgICAgICAgcmV0dXJuICEhdGhpcy5nZXRFbGVtZW50QnlJZChpZClcclxuICAgIH0sXHJcblxyXG4gICAgUVVFUllfU0VMRUNUT1I6IGZ1bmN0aW9uKHRlc3Qpe1xyXG4gICAgICAgIC8vIHRoaXMgc3VwcG9zZWRseSBmaXhlcyBhIHdlYmtpdCBidWcgd2l0aCBtYXRjaGVzU2VsZWN0b3IgLyBxdWVyeVNlbGVjdG9yICYgbnRoLWNoaWxkXHJcbiAgICAgICAgdGVzdC5pbm5lckhUTUwgPSAnXzxzdHlsZT46bnRoLWNoaWxkKDIpe308L3N0eWxlPidcclxuXHJcbiAgICAgICAgLy8gY2hlY2tzIGlmIHRoZSBkb2N1bWVudCBoYXMgcXVlcnlTZWxlY3RvckFsbCwgYW5kIGl0IHdvcmtzXHJcbiAgICAgICAgdGVzdC5pbm5lckhUTUwgPSAnPGEgY2xhc3M9XCJNaVhcIj48L2E+J1xyXG5cclxuICAgICAgICByZXR1cm4gdGVzdC5xdWVyeVNlbGVjdG9yQWxsKCcuTWlYJykubGVuZ3RoID09PSAxXHJcbiAgICB9LFxyXG5cclxuICAgIEVYUEFORE9TOiBmdW5jdGlvbih0ZXN0LCBpZCl7XHJcbiAgICAgICAgaWQgPSBcInNsaWNrX1wiICsgKHVuaXF1ZUluZGV4KyspO1xyXG4gICAgICAgIC8vIGNoZWNrcyBpZiB0aGUgZG9jdW1lbnQgaGFzIGVsZW1lbnRzIHRoYXQgc3VwcG9ydCBleHBhbmRvc1xyXG4gICAgICAgIHRlc3QuX2N1c3RvbV9wcm9wZXJ0eV8gPSBpZFxyXG4gICAgICAgIHJldHVybiB0ZXN0Ll9jdXN0b21fcHJvcGVydHlfID09PSBpZFxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBUT0RPOiB1c2UgdGhpcyA/XHJcblxyXG4gICAgLy8gQ0hFQ0tFRF9RVUVSWV9TRUxFQ1RPUjogZnVuY3Rpb24odGVzdCl7XHJcbiAgICAvL1xyXG4gICAgLy8gICAgIC8vIGNoZWNrcyBpZiB0aGUgZG9jdW1lbnQgc3VwcG9ydHMgdGhlIGNoZWNrZWQgcXVlcnkgc2VsZWN0b3JcclxuICAgIC8vICAgICB0ZXN0LmlubmVySFRNTCA9ICc8c2VsZWN0PjxvcHRpb24gc2VsZWN0ZWQ9XCJzZWxlY3RlZFwiPmE8L29wdGlvbj48L3NlbGVjdD4nXHJcbiAgICAvLyAgICAgcmV0dXJuIHRlc3QucXVlcnlTZWxlY3RvckFsbCgnOmNoZWNrZWQnKS5sZW5ndGggPT09IDFcclxuICAgIC8vIH0sXHJcblxyXG4gICAgLy8gVE9ETzogdXNlIHRoaXMgP1xyXG5cclxuICAgIC8vIEVNUFRZX0FUVFJJQlVURV9RVUVSWV9TRUxFQ1RPUjogZnVuY3Rpb24odGVzdCl7XHJcbiAgICAvL1xyXG4gICAgLy8gICAgIC8vIGNoZWNrcyBpZiB0aGUgZG9jdW1lbnQgc3VwcG9ydHMgdGhlIGVtcHR5IGF0dHJpYnV0ZSBxdWVyeSBzZWxlY3RvclxyXG4gICAgLy8gICAgIHRlc3QuaW5uZXJIVE1MID0gJzxhIGNsYXNzPVwiXCI+PC9hPidcclxuICAgIC8vICAgICByZXR1cm4gdGVzdC5xdWVyeVNlbGVjdG9yQWxsKCdbY2xhc3MqPVwiXCJdJykubGVuZ3RoID09PSAxXHJcbiAgICAvLyB9LFxyXG5cclxuICAgIE1BVENIRVNfU0VMRUNUT1I6IGZ1bmN0aW9uKHRlc3Qpe1xyXG5cclxuICAgICAgICB0ZXN0LmNsYXNzTmFtZSA9IFwiTWlYXCJcclxuXHJcbiAgICAgICAgLy8gY2hlY2tzIGlmIHRoZSBkb2N1bWVudCBoYXMgbWF0Y2hlc1NlbGVjdG9yLCBhbmQgd2UgY2FuIHVzZSBpdC5cclxuXHJcbiAgICAgICAgdmFyIG1hdGNoZXMgPSB0ZXN0Lm1hdGNoZXNTZWxlY3RvciB8fCB0ZXN0Lm1vek1hdGNoZXNTZWxlY3RvciB8fCB0ZXN0LndlYmtpdE1hdGNoZXNTZWxlY3RvclxyXG5cclxuICAgICAgICAvLyBpZiBtYXRjaGVzU2VsZWN0b3IgdHJvd3MgZXJyb3JzIG9uIGluY29ycmVjdCBzeW50YXggd2UgY2FuIHVzZSBpdFxyXG4gICAgICAgIGlmIChtYXRjaGVzKSB0cnkge1xyXG4gICAgICAgICAgICBtYXRjaGVzLmNhbGwodGVzdCwgJzpzbGljaycpXHJcbiAgICAgICAgfSBjYXRjaChlKXtcclxuICAgICAgICAgICAgLy8ganVzdCBhcyBhIHNhZmV0eSBwcmVjYXV0aW9uLCBhbHNvIHRlc3QgaWYgaXQgd29ya3Mgb24gbWl4ZWRjYXNlIChsaWtlIHF1ZXJ5U2VsZWN0b3JBbGwpXHJcbiAgICAgICAgICAgIHJldHVybiBtYXRjaGVzLmNhbGwodGVzdCwgXCIuTWlYXCIpID8gbWF0Y2hlcyA6IGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH0sXHJcblxyXG4gICAgR0VUX0VMRU1FTlRTX0JZX0NMQVNTX05BTUU6IGZ1bmN0aW9uKHRlc3Qpe1xyXG4gICAgICAgIHRlc3QuaW5uZXJIVE1MID0gJzxhIGNsYXNzPVwiZlwiPjwvYT48YSBjbGFzcz1cImJcIj48L2E+J1xyXG4gICAgICAgIGlmICh0ZXN0LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2InKS5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZVxyXG5cclxuICAgICAgICB0ZXN0LmZpcnN0Q2hpbGQuY2xhc3NOYW1lID0gJ2InXHJcbiAgICAgICAgaWYgKHRlc3QuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnYicpLmxlbmd0aCAhPT0gMikgcmV0dXJuIGZhbHNlXHJcblxyXG4gICAgICAgIC8vIE9wZXJhIDkuNiBnZXRFbGVtZW50c0J5Q2xhc3NOYW1lIGRvZXNudCBkZXRlY3RzIHRoZSBjbGFzcyBpZiBpdHMgbm90IHRoZSBmaXJzdCBvbmVcclxuICAgICAgICB0ZXN0LmlubmVySFRNTCA9ICc8YSBjbGFzcz1cImFcIj48L2E+PGEgY2xhc3M9XCJmIGIgYVwiPjwvYT4nXHJcbiAgICAgICAgaWYgKHRlc3QuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnYScpLmxlbmd0aCAhPT0gMikgcmV0dXJuIGZhbHNlXHJcblxyXG4gICAgICAgIC8vIHRlc3RzIHBhc3NlZFxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9LFxyXG5cclxuICAgIC8vIG5vIG5lZWQgdG8ga25vd1xyXG5cclxuICAgIC8vIEdFVF9FTEVNRU5UX0JZX0lEX05PVF9OQU1FOiBmdW5jdGlvbih0ZXN0LCBpZCl7XHJcbiAgICAvLyAgICAgdGVzdC5pbm5lckhUTUwgPSAnPGEgbmFtZT1cIicrIGlkICsnXCI+PC9hPjxiIGlkPVwiJysgaWQgKydcIj48L2I+J1xyXG4gICAgLy8gICAgIHJldHVybiB0aGlzLmdldEVsZW1lbnRCeUlkKGlkKSAhPT0gdGVzdC5maXJzdENoaWxkXHJcbiAgICAvLyB9LFxyXG5cclxuICAgIC8vIHRoaXMgaXMgYWx3YXlzIGNoZWNrZWQgZm9yIGFuZCBmaXhlZFxyXG5cclxuICAgIC8vIFNUQVJfR0VUX0VMRU1FTlRTX0JZX1RBR19OQU1FOiBmdW5jdGlvbih0ZXN0KXtcclxuICAgIC8vXHJcbiAgICAvLyAgICAgLy8gSUUgcmV0dXJucyBjb21tZW50IG5vZGVzIGZvciBnZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpIGZvciBzb21lIGRvY3VtZW50c1xyXG4gICAgLy8gICAgIHRlc3QuYXBwZW5kQ2hpbGQodGhpcy5jcmVhdGVDb21tZW50KCcnKSlcclxuICAgIC8vICAgICBpZiAodGVzdC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpLmxlbmd0aCA+IDApIHJldHVybiBmYWxzZVxyXG4gICAgLy9cclxuICAgIC8vICAgICAvLyBJRSByZXR1cm5zIGNsb3NlZCBub2RlcyAoRUc6XCI8L2Zvbz5cIikgZm9yIGdldEVsZW1lbnRzQnlUYWdOYW1lKCcqJykgZm9yIHNvbWUgZG9jdW1lbnRzXHJcbiAgICAvLyAgICAgdGVzdC5pbm5lckhUTUwgPSAnZm9vPC9mb28+J1xyXG4gICAgLy8gICAgIGlmICh0ZXN0LmdldEVsZW1lbnRzQnlUYWdOYW1lKCcqJykubGVuZ3RoKSByZXR1cm4gZmFsc2VcclxuICAgIC8vXHJcbiAgICAvLyAgICAgLy8gdGVzdHMgcGFzc2VkXHJcbiAgICAvLyAgICAgcmV0dXJuIHRydWVcclxuICAgIC8vIH0sXHJcblxyXG4gICAgLy8gdGhpcyBpcyBhbHdheXMgY2hlY2tlZCBmb3IgYW5kIGZpeGVkXHJcblxyXG4gICAgLy8gU1RBUl9RVUVSWV9TRUxFQ1RPUjogZnVuY3Rpb24odGVzdCl7XHJcbiAgICAvL1xyXG4gICAgLy8gICAgIC8vIHJldHVybnMgY2xvc2VkIG5vZGVzIChFRzpcIjwvZm9vPlwiKSBmb3IgcXVlcnlTZWxlY3RvcignKicpIGZvciBzb21lIGRvY3VtZW50c1xyXG4gICAgLy8gICAgIHRlc3QuaW5uZXJIVE1MID0gJ2ZvbzwvZm9vPidcclxuICAgIC8vICAgICByZXR1cm4gISEodGVzdC5xdWVyeVNlbGVjdG9yQWxsKCcqJykubGVuZ3RoKVxyXG4gICAgLy8gfSxcclxuXHJcbiAgICBHRVRfQVRUUklCVVRFOiBmdW5jdGlvbih0ZXN0KXtcclxuICAgICAgICAvLyB0ZXN0cyBmb3Igd29ya2luZyBnZXRBdHRyaWJ1dGUgaW1wbGVtZW50YXRpb25cclxuICAgICAgICB2YXIgc2hvdXQgPSBcImZ1cyBybyBkYWhcIlxyXG4gICAgICAgIHRlc3QuaW5uZXJIVE1MID0gJzxhIGNsYXNzPVwiJyArIHNob3V0ICsgJ1wiPjwvYT4nXHJcbiAgICAgICAgcmV0dXJuIHRlc3QuZmlyc3RDaGlsZC5nZXRBdHRyaWJ1dGUoJ2NsYXNzJykgPT09IHNob3V0XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG4vLyBGaW5kZXJcclxuXHJcbnZhciBGaW5kZXIgPSBmdW5jdGlvbiBGaW5kZXIoZG9jdW1lbnQpe1xyXG5cclxuICAgIHRoaXMuZG9jdW1lbnQgICAgICAgID0gZG9jdW1lbnRcclxuICAgIHZhciByb290ID0gdGhpcy5yb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XHJcbiAgICB0aGlzLnRlc3RlZCAgICAgICAgICA9IHt9XHJcblxyXG4gICAgLy8gdW5pcXVlSURcclxuXHJcbiAgICB0aGlzLnVuaXF1ZUlEID0gdGhpcy5oYXMoXCJFWFBBTkRPU1wiKSA/IHVuaXF1ZUlEIDogdW5pcXVlSURYTUxcclxuXHJcbiAgICAvLyBnZXRBdHRyaWJ1dGVcclxuXHJcbiAgICB0aGlzLmdldEF0dHJpYnV0ZSA9ICh0aGlzLmhhcyhcIkdFVF9BVFRSSUJVVEVcIikpID8gZnVuY3Rpb24obm9kZSwgbmFtZSl7XHJcblxyXG4gICAgICAgIHJldHVybiBub2RlLmdldEF0dHJpYnV0ZShuYW1lKVxyXG5cclxuICAgIH0gOiBmdW5jdGlvbihub2RlLCBuYW1lKXtcclxuXHJcbiAgICAgICAgbm9kZSA9IG5vZGUuZ2V0QXR0cmlidXRlTm9kZShuYW1lKVxyXG4gICAgICAgIHJldHVybiAobm9kZSAmJiBub2RlLnNwZWNpZmllZCkgPyBub2RlLnZhbHVlIDogbnVsbFxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyBoYXNBdHRyaWJ1dGVcclxuXHJcbiAgICB0aGlzLmhhc0F0dHJpYnV0ZSA9IChyb290Lmhhc0F0dHJpYnV0ZSkgPyBmdW5jdGlvbihub2RlLCBhdHRyaWJ1dGUpe1xyXG5cclxuICAgICAgICByZXR1cm4gbm9kZS5oYXNBdHRyaWJ1dGUoYXR0cmlidXRlKVxyXG5cclxuICAgIH0gOiBmdW5jdGlvbihub2RlLCBhdHRyaWJ1dGUpIHtcclxuXHJcbiAgICAgICAgbm9kZSA9IG5vZGUuZ2V0QXR0cmlidXRlTm9kZShhdHRyaWJ1dGUpXHJcbiAgICAgICAgcmV0dXJuICEhKG5vZGUgJiYgbm9kZS5zcGVjaWZpZWQpXHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNvbnRhaW5zXHJcblxyXG4gICAgdGhpcy5jb250YWlucyA9IChkb2N1bWVudC5jb250YWlucyAmJiByb290LmNvbnRhaW5zKSA/IGZ1bmN0aW9uKGNvbnRleHQsIG5vZGUpe1xyXG5cclxuICAgICAgICByZXR1cm4gY29udGV4dC5jb250YWlucyhub2RlKVxyXG5cclxuICAgIH0gOiAocm9vdC5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbikgPyBmdW5jdGlvbihjb250ZXh0LCBub2RlKXtcclxuXHJcbiAgICAgICAgcmV0dXJuIGNvbnRleHQgPT09IG5vZGUgfHwgISEoY29udGV4dC5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbihub2RlKSAmIDE2KVxyXG5cclxuICAgIH0gOiBmdW5jdGlvbihjb250ZXh0LCBub2RlKXtcclxuXHJcbiAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICBpZiAobm9kZSA9PT0gY29udGV4dCkgcmV0dXJuIHRydWVcclxuICAgICAgICB9IHdoaWxlICgobm9kZSA9IG5vZGUucGFyZW50Tm9kZSkpXHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHNvcnRcclxuICAgIC8vIGNyZWRpdHMgdG8gU2l6emxlIChodHRwOi8vc2l6emxlanMuY29tLylcclxuXHJcbiAgICB0aGlzLnNvcnRlciA9IChyb290LmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uKSA/IGZ1bmN0aW9uKGEsIGIpe1xyXG5cclxuICAgICAgICBpZiAoIWEuY29tcGFyZURvY3VtZW50UG9zaXRpb24gfHwgIWIuY29tcGFyZURvY3VtZW50UG9zaXRpb24pIHJldHVybiAwXHJcbiAgICAgICAgcmV0dXJuIGEuY29tcGFyZURvY3VtZW50UG9zaXRpb24oYikgJiA0ID8gLTEgOiBhID09PSBiID8gMCA6IDFcclxuXHJcbiAgICB9IDogKCdzb3VyY2VJbmRleCcgaW4gcm9vdCkgPyBmdW5jdGlvbihhLCBiKXtcclxuXHJcbiAgICAgICAgaWYgKCFhLnNvdXJjZUluZGV4IHx8ICFiLnNvdXJjZUluZGV4KSByZXR1cm4gMFxyXG4gICAgICAgIHJldHVybiBhLnNvdXJjZUluZGV4IC0gYi5zb3VyY2VJbmRleFxyXG5cclxuICAgIH0gOiAoZG9jdW1lbnQuY3JlYXRlUmFuZ2UpID8gZnVuY3Rpb24oYSwgYil7XHJcblxyXG4gICAgICAgIGlmICghYS5vd25lckRvY3VtZW50IHx8ICFiLm93bmVyRG9jdW1lbnQpIHJldHVybiAwXHJcbiAgICAgICAgdmFyIGFSYW5nZSA9IGEub3duZXJEb2N1bWVudC5jcmVhdGVSYW5nZSgpLFxyXG4gICAgICAgICAgICBiUmFuZ2UgPSBiLm93bmVyRG9jdW1lbnQuY3JlYXRlUmFuZ2UoKVxyXG5cclxuICAgICAgICBhUmFuZ2Uuc2V0U3RhcnQoYSwgMClcclxuICAgICAgICBhUmFuZ2Uuc2V0RW5kKGEsIDApXHJcbiAgICAgICAgYlJhbmdlLnNldFN0YXJ0KGIsIDApXHJcbiAgICAgICAgYlJhbmdlLnNldEVuZChiLCAwKVxyXG4gICAgICAgIHJldHVybiBhUmFuZ2UuY29tcGFyZUJvdW5kYXJ5UG9pbnRzKFJhbmdlLlNUQVJUX1RPX0VORCwgYlJhbmdlKVxyXG5cclxuICAgIH0gOiBudWxsXHJcblxyXG4gICAgdGhpcy5mYWlsZWQgPSB7fVxyXG5cclxuICAgIHZhciBuYXRpdmVNYXRjaGVzID0gdGhpcy5oYXMoXCJNQVRDSEVTX1NFTEVDVE9SXCIpXHJcblxyXG4gICAgaWYgKG5hdGl2ZU1hdGNoZXMpIHRoaXMubWF0Y2hlc1NlbGVjdG9yID0gZnVuY3Rpb24obm9kZSwgZXhwcmVzc2lvbil7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmZhaWxlZFtleHByZXNzaW9uXSkgcmV0dXJuIG51bGxcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcmV0dXJuIG5hdGl2ZU1hdGNoZXMuY2FsbChub2RlLCBleHByZXNzaW9uKVxyXG4gICAgICAgIH0gY2F0Y2goZSl7XHJcbiAgICAgICAgICAgIGlmIChzbGljay5kZWJ1ZykgY29uc29sZS53YXJuKFwibWF0Y2hlc1NlbGVjdG9yIGZhaWxlZCBvbiBcIiArIGV4cHJlc3Npb24pXHJcbiAgICAgICAgICAgIHRoaXMuZmFpbGVkW2V4cHJlc3Npb25dID0gdHJ1ZVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuaGFzKFwiUVVFUllfU0VMRUNUT1JcIikpe1xyXG5cclxuICAgICAgICB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwgPSBmdW5jdGlvbihub2RlLCBleHByZXNzaW9uKXtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmZhaWxlZFtleHByZXNzaW9uXSkgcmV0dXJuIHRydWVcclxuXHJcbiAgICAgICAgICAgIHZhciByZXN1bHQsIF9pZCwgX2V4cHJlc3Npb24sIF9jb21iaW5hdG9yLCBfbm9kZVxyXG5cclxuXHJcbiAgICAgICAgICAgIC8vIG5vbi1kb2N1bWVudCByb290ZWQgUVNBXHJcbiAgICAgICAgICAgIC8vIGNyZWRpdHMgdG8gQW5kcmV3IER1cG9udFxyXG5cclxuICAgICAgICAgICAgaWYgKG5vZGUgIT09IHRoaXMuZG9jdW1lbnQpe1xyXG5cclxuICAgICAgICAgICAgICAgIF9jb21iaW5hdG9yID0gZXhwcmVzc2lvblswXS5jb21iaW5hdG9yXHJcblxyXG4gICAgICAgICAgICAgICAgX2lkICAgICAgICAgPSBub2RlLmdldEF0dHJpYnV0ZShcImlkXCIpXHJcbiAgICAgICAgICAgICAgICBfZXhwcmVzc2lvbiA9IGV4cHJlc3Npb25cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIV9pZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgX25vZGUgPSBub2RlXHJcbiAgICAgICAgICAgICAgICAgICAgX2lkID0gXCJfX3NsaWNrX19cIlxyXG4gICAgICAgICAgICAgICAgICAgIF9ub2RlLnNldEF0dHJpYnV0ZShcImlkXCIsIF9pZClcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gXCIjXCIgKyBfaWQgKyBcIiBcIiArIF9leHByZXNzaW9uXHJcblxyXG5cclxuICAgICAgICAgICAgICAgIC8vIHRoZXNlIGNvbWJpbmF0b3JzIG5lZWQgYSBwYXJlbnROb2RlIGR1ZSB0byBob3cgcXVlcnlTZWxlY3RvckFsbCB3b3Jrcywgd2hpY2ggaXM6XHJcbiAgICAgICAgICAgICAgICAvLyBmaW5kaW5nIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBtYXRjaCB0aGUgZ2l2ZW4gc2VsZWN0b3JcclxuICAgICAgICAgICAgICAgIC8vIHRoZW4gZmlsdGVyaW5nIGJ5IHRoZSBvbmVzIHRoYXQgaGF2ZSB0aGUgc3BlY2lmaWVkIGVsZW1lbnQgYXMgYW4gYW5jZXN0b3JcclxuICAgICAgICAgICAgICAgIGlmIChfY29tYmluYXRvci5pbmRleE9mKFwiflwiKSA+IC0xIHx8IF9jb21iaW5hdG9yLmluZGV4T2YoXCIrXCIpID4gLTEpe1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFub2RlKSByZXN1bHQgPSB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgbm9kZSBoYXMgbm8gcGFyZW50Tm9kZSwgd2UgcmV0dXJuIFwidHJ1ZVwiIGFzIGlmIGl0IGZhaWxlZCwgd2l0aG91dCBwb2xsdXRpbmcgdGhlIGZhaWxlZCBjYWNoZVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghcmVzdWx0KSB0cnkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbm9kZS5xdWVyeVNlbGVjdG9yQWxsKGV4cHJlc3Npb24udG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgfSBjYXRjaChlKXtcclxuICAgICAgICAgICAgICAgIGlmIChzbGljay5kZWJ1ZykgY29uc29sZS53YXJuKFwicXVlcnlTZWxlY3RvckFsbCBmYWlsZWQgb24gXCIgKyAoX2V4cHJlc3Npb24gfHwgZXhwcmVzc2lvbikpXHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLmZhaWxlZFtfZXhwcmVzc2lvbiB8fCBleHByZXNzaW9uXSA9IHRydWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKF9ub2RlKSBfbm9kZS5yZW1vdmVBdHRyaWJ1dGUoXCJpZFwiKVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdFxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxufVxyXG5cclxuRmluZGVyLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihGRUFUVVJFKXtcclxuXHJcbiAgICB2YXIgdGVzdGVkICAgICAgICA9IHRoaXMudGVzdGVkLFxyXG4gICAgICAgIHRlc3RlZEZFQVRVUkUgPSB0ZXN0ZWRbRkVBVFVSRV1cclxuXHJcbiAgICBpZiAodGVzdGVkRkVBVFVSRSAhPSBudWxsKSByZXR1cm4gdGVzdGVkRkVBVFVSRVxyXG5cclxuICAgIHZhciByb290ICAgICA9IHRoaXMucm9vdCxcclxuICAgICAgICBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnQsXHJcbiAgICAgICAgdGVzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXHJcblxyXG4gICAgdGVzdE5vZGUuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OiBub25lO1wiKVxyXG5cclxuICAgIHJvb3QuYXBwZW5kQ2hpbGQodGVzdE5vZGUpXHJcblxyXG4gICAgdmFyIFRFU1QgPSBIQVNbRkVBVFVSRV0sIHJlc3VsdCA9IGZhbHNlXHJcblxyXG4gICAgaWYgKFRFU1QpIHRyeSB7XHJcbiAgICAgICAgcmVzdWx0ID0gVEVTVC5jYWxsKGRvY3VtZW50LCB0ZXN0Tm9kZSlcclxuICAgIH0gY2F0Y2goZSl7fVxyXG5cclxuICAgIGlmIChzbGljay5kZWJ1ZyAmJiAhcmVzdWx0KSBjb25zb2xlLndhcm4oXCJkb2N1bWVudCBoYXMgbm8gXCIgKyBGRUFUVVJFKVxyXG5cclxuICAgIHJvb3QucmVtb3ZlQ2hpbGQodGVzdE5vZGUpXHJcblxyXG4gICAgcmV0dXJuIHRlc3RlZFtGRUFUVVJFXSA9IHJlc3VsdFxyXG5cclxufVxyXG5cclxudmFyIGNvbWJpbmF0b3JzID0ge1xyXG5cclxuICAgIFwiIFwiOiBmdW5jdGlvbihub2RlLCBwYXJ0LCBwdXNoKXtcclxuXHJcbiAgICAgICAgdmFyIGl0ZW0sIGl0ZW1zXHJcblxyXG4gICAgICAgIHZhciBub0lkID0gIXBhcnQuaWQsIG5vVGFnID0gIXBhcnQudGFnLCBub0NsYXNzID0gIXBhcnQuY2xhc3Nlc1xyXG5cclxuICAgICAgICBpZiAocGFydC5pZCAmJiBub2RlLmdldEVsZW1lbnRCeUlkICYmIHRoaXMuaGFzKFwiR0VUX0VMRU1FTlRfQllfSURcIikpe1xyXG4gICAgICAgICAgICBpdGVtID0gbm9kZS5nZXRFbGVtZW50QnlJZChwYXJ0LmlkKVxyXG5cclxuICAgICAgICAgICAgLy8gcmV0dXJuIG9ubHkgaWYgaWQgaXMgZm91bmQsIGVsc2Uga2VlcCBjaGVja2luZ1xyXG4gICAgICAgICAgICAvLyBtaWdodCBiZSBhIHRhZCBzbG93ZXIgb24gbm9uLWV4aXN0aW5nIGlkcywgYnV0IGxlc3MgaW5zYW5lXHJcblxyXG4gICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLmdldEF0dHJpYnV0ZSgnaWQnKSA9PT0gcGFydC5pZCl7XHJcbiAgICAgICAgICAgICAgICBpdGVtcyA9IFtpdGVtXVxyXG4gICAgICAgICAgICAgICAgbm9JZCA9IHRydWVcclxuICAgICAgICAgICAgICAgIC8vIGlmIHRhZyBpcyBzdGFyLCBubyBuZWVkIHRvIGNoZWNrIGl0IGluIG1hdGNoKClcclxuICAgICAgICAgICAgICAgIGlmIChwYXJ0LnRhZyA9PT0gXCIqXCIpIG5vVGFnID0gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWl0ZW1zKXtcclxuXHJcbiAgICAgICAgICAgIGlmIChwYXJ0LmNsYXNzZXMgJiYgbm9kZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lICYmIHRoaXMuaGFzKFwiR0VUX0VMRU1FTlRTX0JZX0NMQVNTX05BTUVcIikpe1xyXG4gICAgICAgICAgICAgICAgaXRlbXMgPSBub2RlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUocGFydC5jbGFzc0xpc3QpXHJcbiAgICAgICAgICAgICAgICBub0NsYXNzID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgLy8gaWYgdGFnIGlzIHN0YXIsIG5vIG5lZWQgdG8gY2hlY2sgaXQgaW4gbWF0Y2goKVxyXG4gICAgICAgICAgICAgICAgaWYgKHBhcnQudGFnID09PSBcIipcIikgbm9UYWcgPSB0cnVlXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtcyA9IG5vZGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUocGFydC50YWcpXHJcbiAgICAgICAgICAgICAgICAvLyBpZiB0YWcgaXMgc3RhciwgbmVlZCB0byBjaGVjayBpdCBpbiBtYXRjaCBiZWNhdXNlIGl0IGNvdWxkIHNlbGVjdCBqdW5rLCBib2hvXHJcbiAgICAgICAgICAgICAgICBpZiAocGFydC50YWcgIT09IFwiKlwiKSBub1RhZyA9IHRydWVcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFpdGVtcyB8fCAhaXRlbXMubGVuZ3RoKSByZXR1cm4gZmFsc2VcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaXRlbSA9IGl0ZW1zW2krK107KVxyXG4gICAgICAgICAgICBpZiAoKG5vVGFnICYmIG5vSWQgJiYgbm9DbGFzcyAmJiAhcGFydC5hdHRyaWJ1dGVzICYmICFwYXJ0LnBzZXVkb3MpIHx8IHRoaXMubWF0Y2goaXRlbSwgcGFydCwgbm9UYWcsIG5vSWQsIG5vQ2xhc3MpKVxyXG4gICAgICAgICAgICAgICAgcHVzaChpdGVtKVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG5cclxuICAgIH0sXHJcblxyXG4gICAgXCI+XCI6IGZ1bmN0aW9uKG5vZGUsIHBhcnQsIHB1c2gpeyAvLyBkaXJlY3QgY2hpbGRyZW5cclxuICAgICAgICBpZiAoKG5vZGUgPSBub2RlLmZpcnN0Q2hpbGQpKSBkbyB7XHJcbiAgICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09IDEgJiYgdGhpcy5tYXRjaChub2RlLCBwYXJ0KSkgcHVzaChub2RlKVxyXG4gICAgICAgIH0gd2hpbGUgKChub2RlID0gbm9kZS5uZXh0U2libGluZykpXHJcbiAgICB9LFxyXG5cclxuICAgIFwiK1wiOiBmdW5jdGlvbihub2RlLCBwYXJ0LCBwdXNoKXsgLy8gbmV4dCBzaWJsaW5nXHJcbiAgICAgICAgd2hpbGUgKChub2RlID0gbm9kZS5uZXh0U2libGluZykpIGlmIChub2RlLm5vZGVUeXBlID09IDEpe1xyXG4gICAgICAgICAgICBpZiAodGhpcy5tYXRjaChub2RlLCBwYXJ0KSkgcHVzaChub2RlKVxyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgXCJeXCI6IGZ1bmN0aW9uKG5vZGUsIHBhcnQsIHB1c2gpeyAvLyBmaXJzdCBjaGlsZFxyXG4gICAgICAgIG5vZGUgPSBub2RlLmZpcnN0Q2hpbGRcclxuICAgICAgICBpZiAobm9kZSl7XHJcbiAgICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKXtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1hdGNoKG5vZGUsIHBhcnQpKSBwdXNoKG5vZGUpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb21iaW5hdG9yc1snKyddLmNhbGwodGhpcywgbm9kZSwgcGFydCwgcHVzaClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgXCJ+XCI6IGZ1bmN0aW9uKG5vZGUsIHBhcnQsIHB1c2gpeyAvLyBuZXh0IHNpYmxpbmdzXHJcbiAgICAgICAgd2hpbGUgKChub2RlID0gbm9kZS5uZXh0U2libGluZykpe1xyXG4gICAgICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSAmJiB0aGlzLm1hdGNoKG5vZGUsIHBhcnQpKSBwdXNoKG5vZGUpXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBcIisrXCI6IGZ1bmN0aW9uKG5vZGUsIHBhcnQsIHB1c2gpeyAvLyBuZXh0IHNpYmxpbmcgYW5kIHByZXZpb3VzIHNpYmxpbmdcclxuICAgICAgICBjb21iaW5hdG9yc1snKyddLmNhbGwodGhpcywgbm9kZSwgcGFydCwgcHVzaClcclxuICAgICAgICBjb21iaW5hdG9yc1snISsnXS5jYWxsKHRoaXMsIG5vZGUsIHBhcnQsIHB1c2gpXHJcbiAgICB9LFxyXG5cclxuICAgIFwifn5cIjogZnVuY3Rpb24obm9kZSwgcGFydCwgcHVzaCl7IC8vIG5leHQgc2libGluZ3MgYW5kIHByZXZpb3VzIHNpYmxpbmdzXHJcbiAgICAgICAgY29tYmluYXRvcnNbJ34nXS5jYWxsKHRoaXMsIG5vZGUsIHBhcnQsIHB1c2gpXHJcbiAgICAgICAgY29tYmluYXRvcnNbJyF+J10uY2FsbCh0aGlzLCBub2RlLCBwYXJ0LCBwdXNoKVxyXG4gICAgfSxcclxuXHJcbiAgICBcIiFcIjogZnVuY3Rpb24obm9kZSwgcGFydCwgcHVzaCl7IC8vIGFsbCBwYXJlbnQgbm9kZXMgdXAgdG8gZG9jdW1lbnRcclxuICAgICAgICB3aGlsZSAoKG5vZGUgPSBub2RlLnBhcmVudE5vZGUpKSBpZiAobm9kZSAhPT0gdGhpcy5kb2N1bWVudCAmJiB0aGlzLm1hdGNoKG5vZGUsIHBhcnQpKSBwdXNoKG5vZGUpXHJcbiAgICB9LFxyXG5cclxuICAgIFwiIT5cIjogZnVuY3Rpb24obm9kZSwgcGFydCwgcHVzaCl7IC8vIGRpcmVjdCBwYXJlbnQgKG9uZSBsZXZlbClcclxuICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlXHJcbiAgICAgICAgaWYgKG5vZGUgIT09IHRoaXMuZG9jdW1lbnQgJiYgdGhpcy5tYXRjaChub2RlLCBwYXJ0KSkgcHVzaChub2RlKVxyXG4gICAgfSxcclxuXHJcbiAgICBcIiErXCI6IGZ1bmN0aW9uKG5vZGUsIHBhcnQsIHB1c2gpeyAvLyBwcmV2aW91cyBzaWJsaW5nXHJcbiAgICAgICAgd2hpbGUgKChub2RlID0gbm9kZS5wcmV2aW91c1NpYmxpbmcpKSBpZiAobm9kZS5ub2RlVHlwZSA9PSAxKXtcclxuICAgICAgICAgICAgaWYgKHRoaXMubWF0Y2gobm9kZSwgcGFydCkpIHB1c2gobm9kZSlcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIFwiIV5cIjogZnVuY3Rpb24obm9kZSwgcGFydCwgcHVzaCl7IC8vIGxhc3QgY2hpbGRcclxuICAgICAgICBub2RlID0gbm9kZS5sYXN0Q2hpbGRcclxuICAgICAgICBpZiAobm9kZSl7XHJcbiAgICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09IDEpe1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubWF0Y2gobm9kZSwgcGFydCkpIHB1c2gobm9kZSlcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbWJpbmF0b3JzWychKyddLmNhbGwodGhpcywgbm9kZSwgcGFydCwgcHVzaClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgXCIhflwiOiBmdW5jdGlvbihub2RlLCBwYXJ0LCBwdXNoKXsgLy8gcHJldmlvdXMgc2libGluZ3NcclxuICAgICAgICB3aGlsZSAoKG5vZGUgPSBub2RlLnByZXZpb3VzU2libGluZykpe1xyXG4gICAgICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSAmJiB0aGlzLm1hdGNoKG5vZGUsIHBhcnQpKSBwdXNoKG5vZGUpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufVxyXG5cclxuRmluZGVyLnByb3RvdHlwZS5zZWFyY2ggPSBmdW5jdGlvbihjb250ZXh0LCBleHByZXNzaW9uLCBmb3VuZCl7XHJcblxyXG4gICAgaWYgKCFjb250ZXh0KSBjb250ZXh0ID0gdGhpcy5kb2N1bWVudFxyXG4gICAgZWxzZSBpZiAoIWNvbnRleHQubm9kZVR5cGUgJiYgY29udGV4dC5kb2N1bWVudCkgY29udGV4dCA9IGNvbnRleHQuZG9jdW1lbnRcclxuXHJcbiAgICB2YXIgZXhwcmVzc2lvbnMgPSBwYXJzZShleHByZXNzaW9uKVxyXG5cclxuICAgIC8vIG5vIGV4cHJlc3Npb25zIHdlcmUgcGFyc2VkLiB0b2RvOiBpcyB0aGlzIHJlYWxseSBuZWNlc3Nhcnk/XHJcbiAgICBpZiAoIWV4cHJlc3Npb25zIHx8ICFleHByZXNzaW9ucy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgZXhwcmVzc2lvblwiKVxyXG5cclxuICAgIGlmICghZm91bmQpIGZvdW5kID0gW11cclxuXHJcbiAgICB2YXIgdW5pcXVlcywgcHVzaCA9IGlzQXJyYXkoZm91bmQpID8gZnVuY3Rpb24obm9kZSl7XHJcbiAgICAgICAgZm91bmRbZm91bmQubGVuZ3RoXSA9IG5vZGVcclxuICAgIH0gOiBmdW5jdGlvbihub2RlKXtcclxuICAgICAgICBmb3VuZFtmb3VuZC5sZW5ndGgrK10gPSBub2RlXHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgdGhlcmUgaXMgbW9yZSB0aGFuIG9uZSBleHByZXNzaW9uIHdlIG5lZWQgdG8gY2hlY2sgZm9yIGR1cGxpY2F0ZXMgd2hlbiB3ZSBwdXNoIHRvIGZvdW5kXHJcbiAgICAvLyB0aGlzIHNpbXBseSBzYXZlcyB0aGUgb2xkIHB1c2ggYW5kIHdyYXBzIGl0IGFyb3VuZCBhbiB1aWQgZHVwZSBjaGVjay5cclxuICAgIGlmIChleHByZXNzaW9ucy5sZW5ndGggPiAxKXtcclxuICAgICAgICB1bmlxdWVzID0ge31cclxuICAgICAgICB2YXIgcGx1c2ggPSBwdXNoXHJcbiAgICAgICAgcHVzaCA9IGZ1bmN0aW9uKG5vZGUpe1xyXG4gICAgICAgICAgICB2YXIgdWlkID0gdW5pcXVlSUQobm9kZSlcclxuICAgICAgICAgICAgaWYgKCF1bmlxdWVzW3VpZF0pe1xyXG4gICAgICAgICAgICAgICAgdW5pcXVlc1t1aWRdID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgcGx1c2gobm9kZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyB3YWxrZXJcclxuXHJcbiAgICB2YXIgbm9kZSwgbm9kZXMsIHBhcnRcclxuXHJcbiAgICBtYWluOiBmb3IgKHZhciBpID0gMDsgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb25zW2krK107KXtcclxuXHJcbiAgICAgICAgLy8gcXVlcnlTZWxlY3RvclxyXG5cclxuICAgICAgICAvLyBUT0RPOiBtb3JlIGZ1bmN0aW9uYWwgdGVzdHNcclxuXHJcbiAgICAgICAgLy8gaWYgdGhlcmUgaXMgcXVlcnlTZWxlY3RvckFsbCAoYW5kIHRoZSBleHByZXNzaW9uIGRvZXMgbm90IGZhaWwpIHVzZSBpdC5cclxuICAgICAgICBpZiAoIXNsaWNrLm5vUVNBICYmIHRoaXMucXVlcnlTZWxlY3RvckFsbCl7XHJcblxyXG4gICAgICAgICAgICBub2RlcyA9IHRoaXMucXVlcnlTZWxlY3RvckFsbChjb250ZXh0LCBleHByZXNzaW9uKVxyXG4gICAgICAgICAgICBpZiAobm9kZXMgIT09IHRydWUpe1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGVzICYmIG5vZGVzLmxlbmd0aCkgZm9yICh2YXIgaiA9IDA7IG5vZGUgPSBub2Rlc1tqKytdOykgaWYgKG5vZGUubm9kZU5hbWUgPiAnQCcpe1xyXG4gICAgICAgICAgICAgICAgICAgIHB1c2gobm9kZSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlIG1haW5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaWYgdGhlcmUgaXMgb25seSBvbmUgcGFydCBpbiB0aGUgZXhwcmVzc2lvbiB3ZSBkb24ndCBuZWVkIHRvIGNoZWNrIGVhY2ggcGFydCBmb3IgZHVwbGljYXRlcy5cclxuICAgICAgICAvLyB0b2RvOiB0aGlzIG1pZ2h0IGJlIHRvbyBuYWl2ZS4gd2hpbGUgc29saWQsIHRoZXJlIGNhbiBiZSBleHByZXNzaW9uIHNlcXVlbmNlcyB0aGF0IGRvIG5vdFxyXG4gICAgICAgIC8vIHByb2R1Y2UgZHVwbGljYXRlcy4gXCJib2R5IGRpdlwiIGZvciBpbnN0YW5jZSwgY2FuIG5ldmVyIGdpdmUgeW91IGVhY2ggZGl2IG1vcmUgdGhhbiBvbmNlLlxyXG4gICAgICAgIC8vIFwiYm9keSBkaXYgYVwiIG9uIHRoZSBvdGhlciBoYW5kIG1pZ2h0LlxyXG4gICAgICAgIGlmIChleHByZXNzaW9uLmxlbmd0aCA9PT0gMSl7XHJcblxyXG4gICAgICAgICAgICBwYXJ0ID0gZXhwcmVzc2lvblswXVxyXG4gICAgICAgICAgICBjb21iaW5hdG9yc1twYXJ0LmNvbWJpbmF0b3JdLmNhbGwodGhpcywgY29udGV4dCwgcGFydCwgcHVzaClcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBjcyA9IFtjb250ZXh0XSwgYywgZiwgdSwgcCA9IGZ1bmN0aW9uKG5vZGUpe1xyXG4gICAgICAgICAgICAgICAgdmFyIHVpZCA9IHVuaXF1ZUlEKG5vZGUpXHJcbiAgICAgICAgICAgICAgICBpZiAoIXVbdWlkXSl7XHJcbiAgICAgICAgICAgICAgICAgICAgdVt1aWRdID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIGZbZi5sZW5ndGhdID0gbm9kZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBsb29wIHRoZSBleHByZXNzaW9uIHBhcnRzXHJcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBwYXJ0ID0gZXhwcmVzc2lvbltqKytdOyl7XHJcbiAgICAgICAgICAgICAgICBmID0gW107IHUgPSB7fVxyXG4gICAgICAgICAgICAgICAgLy8gbG9vcCB0aGUgY29udGV4dHNcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBjID0gY3NbaysrXTspIGNvbWJpbmF0b3JzW3BhcnQuY29tYmluYXRvcl0uY2FsbCh0aGlzLCBjLCBwYXJ0LCBwKVxyXG4gICAgICAgICAgICAgICAgLy8gbm90aGluZyB3YXMgZm91bmQsIHRoZSBleHByZXNzaW9uIGZhaWxlZCwgY29udGludWUgdG8gdGhlIG5leHQgZXhwcmVzc2lvbi5cclxuICAgICAgICAgICAgICAgIGlmICghZi5sZW5ndGgpIGNvbnRpbnVlIG1haW5cclxuICAgICAgICAgICAgICAgIGNzID0gZiAvLyBzZXQgdGhlIGNvbnRleHRzIGZvciBmdXR1cmUgcGFydHMgKGlmIGFueSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGkgPT09IDApIGZvdW5kID0gZiAvLyBmaXJzdCBleHByZXNzaW9uLiBkaXJlY3RseSBzZXQgZm91bmQuXHJcbiAgICAgICAgICAgIGVsc2UgZm9yICh2YXIgbCA9IDA7IGwgPCBmLmxlbmd0aDsgbCsrKSBwdXNoKGZbbF0pIC8vIGFueSBvdGhlciBleHByZXNzaW9uIG5lZWRzIHRvIHB1c2ggdG8gZm91bmQuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBpZiAodW5pcXVlcyAmJiBmb3VuZCAmJiBmb3VuZC5sZW5ndGggPiAxKSB0aGlzLnNvcnQoZm91bmQpXHJcblxyXG4gICAgcmV0dXJuIGZvdW5kXHJcblxyXG59XHJcblxyXG5GaW5kZXIucHJvdG90eXBlLnNvcnQgPSBmdW5jdGlvbihub2Rlcyl7XHJcbiAgICByZXR1cm4gdGhpcy5zb3J0ZXIgPyBBcnJheS5wcm90b3R5cGUuc29ydC5jYWxsKG5vZGVzLCB0aGlzLnNvcnRlcikgOiBub2Rlc1xyXG59XHJcblxyXG4vLyBUT0RPOiBtb3N0IG9mIHRoZXNlIHBzZXVkbyBzZWxlY3RvcnMgaW5jbHVkZSA8aHRtbD4gYW5kIHFzYSBkb2VzbnQuIGZpeG1lLlxyXG5cclxudmFyIHBzZXVkb3MgPSB7XHJcblxyXG5cclxuICAgIC8vIFRPRE86IHJldHVybnMgZGlmZmVyZW50IHJlc3VsdHMgdGhhbiBxc2EgZW1wdHkuXHJcblxyXG4gICAgJ2VtcHR5JzogZnVuY3Rpb24oKXtcclxuICAgICAgICByZXR1cm4gISh0aGlzICYmIHRoaXMubm9kZVR5cGUgPT09IDEpICYmICEodGhpcy5pbm5lclRleHQgfHwgdGhpcy50ZXh0Q29udGVudCB8fCAnJykubGVuZ3RoXHJcbiAgICB9LFxyXG5cclxuICAgICdub3QnOiBmdW5jdGlvbihleHByZXNzaW9uKXtcclxuICAgICAgICByZXR1cm4gIXNsaWNrLm1hdGNoZXModGhpcywgZXhwcmVzc2lvbilcclxuICAgIH0sXHJcblxyXG4gICAgJ2NvbnRhaW5zJzogZnVuY3Rpb24odGV4dCl7XHJcbiAgICAgICAgcmV0dXJuICh0aGlzLmlubmVyVGV4dCB8fCB0aGlzLnRleHRDb250ZW50IHx8ICcnKS5pbmRleE9mKHRleHQpID4gLTFcclxuICAgIH0sXHJcblxyXG4gICAgJ2ZpcnN0LWNoaWxkJzogZnVuY3Rpb24oKXtcclxuICAgICAgICB2YXIgbm9kZSA9IHRoaXNcclxuICAgICAgICB3aGlsZSAoKG5vZGUgPSBub2RlLnByZXZpb3VzU2libGluZykpIGlmIChub2RlLm5vZGVUeXBlID09IDEpIHJldHVybiBmYWxzZVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9LFxyXG5cclxuICAgICdsYXN0LWNoaWxkJzogZnVuY3Rpb24oKXtcclxuICAgICAgICB2YXIgbm9kZSA9IHRoaXNcclxuICAgICAgICB3aGlsZSAoKG5vZGUgPSBub2RlLm5leHRTaWJsaW5nKSkgaWYgKG5vZGUubm9kZVR5cGUgPT0gMSkgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgIH0sXHJcblxyXG4gICAgJ29ubHktY2hpbGQnOiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHZhciBwcmV2ID0gdGhpc1xyXG4gICAgICAgIHdoaWxlICgocHJldiA9IHByZXYucHJldmlvdXNTaWJsaW5nKSkgaWYgKHByZXYubm9kZVR5cGUgPT0gMSkgcmV0dXJuIGZhbHNlXHJcblxyXG4gICAgICAgIHZhciBuZXh0ID0gdGhpc1xyXG4gICAgICAgIHdoaWxlICgobmV4dCA9IG5leHQubmV4dFNpYmxpbmcpKSBpZiAobmV4dC5ub2RlVHlwZSA9PSAxKSByZXR1cm4gZmFsc2VcclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgIH0sXHJcblxyXG4gICAgJ2ZpcnN0LW9mLXR5cGUnOiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHZhciBub2RlID0gdGhpcywgbm9kZU5hbWUgPSBub2RlLm5vZGVOYW1lXHJcbiAgICAgICAgd2hpbGUgKChub2RlID0gbm9kZS5wcmV2aW91c1NpYmxpbmcpKSBpZiAobm9kZS5ub2RlTmFtZSA9PSBub2RlTmFtZSkgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgIH0sXHJcblxyXG4gICAgJ2xhc3Qtb2YtdHlwZSc6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLCBub2RlTmFtZSA9IG5vZGUubm9kZU5hbWVcclxuICAgICAgICB3aGlsZSAoKG5vZGUgPSBub2RlLm5leHRTaWJsaW5nKSkgaWYgKG5vZGUubm9kZU5hbWUgPT0gbm9kZU5hbWUpIHJldHVybiBmYWxzZVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9LFxyXG5cclxuICAgICdvbmx5LW9mLXR5cGUnOiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHZhciBwcmV2ID0gdGhpcywgbm9kZU5hbWUgPSB0aGlzLm5vZGVOYW1lXHJcbiAgICAgICAgd2hpbGUgKChwcmV2ID0gcHJldi5wcmV2aW91c1NpYmxpbmcpKSBpZiAocHJldi5ub2RlTmFtZSA9PSBub2RlTmFtZSkgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgdmFyIG5leHQgPSB0aGlzXHJcbiAgICAgICAgd2hpbGUgKChuZXh0ID0gbmV4dC5uZXh0U2libGluZykpIGlmIChuZXh0Lm5vZGVOYW1lID09IG5vZGVOYW1lKSByZXR1cm4gZmFsc2VcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfSxcclxuXHJcbiAgICAnZW5hYmxlZCc6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuICF0aGlzLmRpc2FibGVkXHJcbiAgICB9LFxyXG5cclxuICAgICdkaXNhYmxlZCc6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGlzYWJsZWRcclxuICAgIH0sXHJcblxyXG4gICAgJ2NoZWNrZWQnOiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNoZWNrZWQgfHwgdGhpcy5zZWxlY3RlZFxyXG4gICAgfSxcclxuXHJcbiAgICAnc2VsZWN0ZWQnOiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdGVkXHJcbiAgICB9LFxyXG5cclxuICAgICdmb2N1cyc6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgdmFyIGRvYyA9IHRoaXMub3duZXJEb2N1bWVudFxyXG4gICAgICAgIHJldHVybiBkb2MuYWN0aXZlRWxlbWVudCA9PT0gdGhpcyAmJiAodGhpcy5ocmVmIHx8IHRoaXMudHlwZSB8fCBzbGljay5oYXNBdHRyaWJ1dGUodGhpcywgJ3RhYmluZGV4JykpXHJcbiAgICB9LFxyXG5cclxuICAgICdyb290JzogZnVuY3Rpb24oKXtcclxuICAgICAgICByZXR1cm4gKHRoaXMgPT09IHRoaXMub3duZXJEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpXHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5GaW5kZXIucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24obm9kZSwgYml0LCBub1RhZywgbm9JZCwgbm9DbGFzcyl7XHJcblxyXG4gICAgLy8gVE9ETzogbW9yZSBmdW5jdGlvbmFsIHRlc3RzID9cclxuXHJcbiAgICBpZiAoIXNsaWNrLm5vUVNBICYmIHRoaXMubWF0Y2hlc1NlbGVjdG9yKXtcclxuICAgICAgICB2YXIgbWF0Y2hlcyA9IHRoaXMubWF0Y2hlc1NlbGVjdG9yKG5vZGUsIGJpdClcclxuICAgICAgICBpZiAobWF0Y2hlcyAhPT0gbnVsbCkgcmV0dXJuIG1hdGNoZXNcclxuICAgIH1cclxuXHJcbiAgICAvLyBub3JtYWwgbWF0Y2hpbmdcclxuXHJcbiAgICBpZiAoIW5vVGFnICYmIGJpdC50YWcpe1xyXG5cclxuICAgICAgICB2YXIgbm9kZU5hbWUgPSBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKClcclxuICAgICAgICBpZiAoYml0LnRhZyA9PT0gXCIqXCIpe1xyXG4gICAgICAgICAgICBpZiAobm9kZU5hbWUgPCBcIkBcIikgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfSBlbHNlIGlmIChub2RlTmFtZSAhPSBiaXQudGFnKXtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBpZiAoIW5vSWQgJiYgYml0LmlkICYmIG5vZGUuZ2V0QXR0cmlidXRlKCdpZCcpICE9PSBiaXQuaWQpIHJldHVybiBmYWxzZVxyXG5cclxuICAgIHZhciBpLCBwYXJ0XHJcblxyXG4gICAgaWYgKCFub0NsYXNzICYmIGJpdC5jbGFzc2VzKXtcclxuXHJcbiAgICAgICAgdmFyIGNsYXNzTmFtZSA9IHRoaXMuZ2V0QXR0cmlidXRlKG5vZGUsIFwiY2xhc3NcIilcclxuICAgICAgICBpZiAoIWNsYXNzTmFtZSkgcmV0dXJuIGZhbHNlXHJcblxyXG4gICAgICAgIGZvciAocGFydCBpbiBiaXQuY2xhc3NlcykgaWYgKCFSZWdFeHAoJyhefFxcXFxzKScgKyBiaXQuY2xhc3Nlc1twYXJ0XSArICcoXFxcXHN8JCknKS50ZXN0KGNsYXNzTmFtZSkpIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHZhciBuYW1lLCB2YWx1ZVxyXG5cclxuICAgIGlmIChiaXQuYXR0cmlidXRlcykgZm9yIChpID0gMDsgcGFydCA9IGJpdC5hdHRyaWJ1dGVzW2krK107KXtcclxuXHJcbiAgICAgICAgdmFyIG9wZXJhdG9yICA9IHBhcnQub3BlcmF0b3IsXHJcbiAgICAgICAgICAgIGVzY2FwZWQgICA9IHBhcnQuZXNjYXBlZFZhbHVlXHJcblxyXG4gICAgICAgIG5hbWUgID0gcGFydC5uYW1lXHJcbiAgICAgICAgdmFsdWUgPSBwYXJ0LnZhbHVlXHJcblxyXG4gICAgICAgIGlmICghb3BlcmF0b3Ipe1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLmhhc0F0dHJpYnV0ZShub2RlLCBuYW1lKSkgcmV0dXJuIGZhbHNlXHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgYWN0dWFsID0gdGhpcy5nZXRBdHRyaWJ1dGUobm9kZSwgbmFtZSlcclxuICAgICAgICAgICAgaWYgKGFjdHVhbCA9PSBudWxsKSByZXR1cm4gZmFsc2VcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3Ipe1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnXj0nIDogaWYgKCFSZWdFeHAoICAgICAgJ14nICsgZXNjYXBlZCAgICAgICAgICAgICkudGVzdChhY3R1YWwpKSByZXR1cm4gZmFsc2U7IGJyZWFrXHJcbiAgICAgICAgICAgICAgICBjYXNlICckPScgOiBpZiAoIVJlZ0V4cCggICAgICAgICAgICBlc2NhcGVkICsgJyQnICAgICAgKS50ZXN0KGFjdHVhbCkpIHJldHVybiBmYWxzZTsgYnJlYWtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ349JyA6IGlmICghUmVnRXhwKCcoXnxcXFxccyknICsgZXNjYXBlZCArICcoXFxcXHN8JCknKS50ZXN0KGFjdHVhbCkpIHJldHVybiBmYWxzZTsgYnJlYWtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3w9JyA6IGlmICghUmVnRXhwKCAgICAgICdeJyArIGVzY2FwZWQgKyAnKC18JCknICApLnRlc3QoYWN0dWFsKSkgcmV0dXJuIGZhbHNlOyBicmVha1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgJz0nICA6IGlmIChhY3R1YWwgIT09IHZhbHVlKSByZXR1cm4gZmFsc2U7IGJyZWFrXHJcbiAgICAgICAgICAgICAgICBjYXNlICcqPScgOiBpZiAoYWN0dWFsLmluZGV4T2YodmFsdWUpID09PSAtMSkgcmV0dXJuIGZhbHNlOyBicmVha1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdCAgIDogcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChiaXQucHNldWRvcykgZm9yIChpID0gMDsgcGFydCA9IGJpdC5wc2V1ZG9zW2krK107KXtcclxuXHJcbiAgICAgICAgbmFtZSAgPSBwYXJ0Lm5hbWVcclxuICAgICAgICB2YWx1ZSA9IHBhcnQudmFsdWVcclxuXHJcbiAgICAgICAgaWYgKHBzZXVkb3NbbmFtZV0pIHJldHVybiBwc2V1ZG9zW25hbWVdLmNhbGwobm9kZSwgdmFsdWUpXHJcblxyXG4gICAgICAgIGlmICh2YWx1ZSAhPSBudWxsKXtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKG5vZGUsIG5hbWUpICE9PSB2YWx1ZSkgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmhhc0F0dHJpYnV0ZShub2RlLCBuYW1lKSkgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZVxyXG5cclxufVxyXG5cclxuRmluZGVyLnByb3RvdHlwZS5tYXRjaGVzID0gZnVuY3Rpb24obm9kZSwgZXhwcmVzc2lvbil7XHJcblxyXG4gICAgdmFyIGV4cHJlc3Npb25zID0gcGFyc2UoZXhwcmVzc2lvbilcclxuXHJcbiAgICBpZiAoZXhwcmVzc2lvbnMubGVuZ3RoID09PSAxICYmIGV4cHJlc3Npb25zWzBdLmxlbmd0aCA9PT0gMSl7IC8vIHNpbXBsZXN0IG1hdGNoXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWF0Y2gobm9kZSwgZXhwcmVzc2lvbnNbMF1bMF0pXHJcbiAgICB9XHJcblxyXG4gICAgLy8gVE9ETzogbW9yZSBmdW5jdGlvbmFsIHRlc3RzID9cclxuXHJcbiAgICBpZiAoIXNsaWNrLm5vUVNBICYmIHRoaXMubWF0Y2hlc1NlbGVjdG9yKXtcclxuICAgICAgICB2YXIgbWF0Y2hlcyA9IHRoaXMubWF0Y2hlc1NlbGVjdG9yKG5vZGUsIGV4cHJlc3Npb25zKVxyXG4gICAgICAgIGlmIChtYXRjaGVzICE9PSBudWxsKSByZXR1cm4gbWF0Y2hlc1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBub2RlcyA9IHRoaXMuc2VhcmNoKHRoaXMuZG9jdW1lbnQsIGV4cHJlc3Npb24sIHtsZW5ndGg6IDB9KVxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwLCByZXM7IHJlcyA9IG5vZGVzW2krK107KSBpZiAobm9kZSA9PT0gcmVzKSByZXR1cm4gdHJ1ZVxyXG4gICAgcmV0dXJuIGZhbHNlXHJcblxyXG59XHJcblxyXG52YXIgZmluZGVycyA9IHt9XHJcblxyXG52YXIgZmluZGVyID0gZnVuY3Rpb24oY29udGV4dCl7XHJcbiAgICB2YXIgZG9jID0gY29udGV4dCB8fCBkb2N1bWVudFxyXG4gICAgaWYgKGRvYy5vd25lckRvY3VtZW50KSBkb2MgPSBkb2Mub3duZXJEb2N1bWVudFxyXG4gICAgZWxzZSBpZiAoZG9jLmRvY3VtZW50KSBkb2MgPSBkb2MuZG9jdW1lbnRcclxuXHJcbiAgICBpZiAoZG9jLm5vZGVUeXBlICE9PSA5KSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiaW52YWxpZCBkb2N1bWVudFwiKVxyXG5cclxuICAgIHZhciB1aWQgPSB1bmlxdWVJRChkb2MpXHJcbiAgICByZXR1cm4gZmluZGVyc1t1aWRdIHx8IChmaW5kZXJzW3VpZF0gPSBuZXcgRmluZGVyKGRvYykpXHJcbn1cclxuXHJcbi8vIC4uLiBBUEkgLi4uXHJcblxyXG52YXIgc2xpY2sgPSBmdW5jdGlvbihleHByZXNzaW9uLCBjb250ZXh0KXtcclxuICAgIHJldHVybiBzbGljay5zZWFyY2goZXhwcmVzc2lvbiwgY29udGV4dClcclxufVxyXG5cclxuc2xpY2suc2VhcmNoID0gZnVuY3Rpb24oZXhwcmVzc2lvbiwgY29udGV4dCwgZm91bmQpe1xyXG4gICAgcmV0dXJuIGZpbmRlcihjb250ZXh0KS5zZWFyY2goY29udGV4dCwgZXhwcmVzc2lvbiwgZm91bmQpXHJcbn1cclxuXHJcbnNsaWNrLmZpbmQgPSBmdW5jdGlvbihleHByZXNzaW9uLCBjb250ZXh0KXtcclxuICAgIHJldHVybiBmaW5kZXIoY29udGV4dCkuc2VhcmNoKGNvbnRleHQsIGV4cHJlc3Npb24pWzBdIHx8IG51bGxcclxufVxyXG5cclxuc2xpY2suZ2V0QXR0cmlidXRlID0gZnVuY3Rpb24obm9kZSwgbmFtZSl7XHJcbiAgICByZXR1cm4gZmluZGVyKG5vZGUpLmdldEF0dHJpYnV0ZShub2RlLCBuYW1lKVxyXG59XHJcblxyXG5zbGljay5oYXNBdHRyaWJ1dGUgPSBmdW5jdGlvbihub2RlLCBuYW1lKXtcclxuICAgIHJldHVybiBmaW5kZXIobm9kZSkuaGFzQXR0cmlidXRlKG5vZGUsIG5hbWUpXHJcbn1cclxuXHJcbnNsaWNrLmNvbnRhaW5zID0gZnVuY3Rpb24oY29udGV4dCwgbm9kZSl7XHJcbiAgICByZXR1cm4gZmluZGVyKGNvbnRleHQpLmNvbnRhaW5zKGNvbnRleHQsIG5vZGUpXHJcbn1cclxuXHJcbnNsaWNrLm1hdGNoZXMgPSBmdW5jdGlvbihub2RlLCBleHByZXNzaW9uKXtcclxuICAgIHJldHVybiBmaW5kZXIobm9kZSkubWF0Y2hlcyhub2RlLCBleHByZXNzaW9uKVxyXG59XHJcblxyXG5zbGljay5zb3J0ID0gZnVuY3Rpb24obm9kZXMpe1xyXG4gICAgaWYgKG5vZGVzICYmIG5vZGVzLmxlbmd0aCA+IDEpIGZpbmRlcihub2Rlc1swXSkuc29ydChub2RlcylcclxuICAgIHJldHVybiBub2Rlc1xyXG59XHJcblxyXG5zbGljay5wYXJzZSA9IHBhcnNlO1xyXG5cclxuLy8gc2xpY2suZGVidWcgPSB0cnVlXHJcbi8vIHNsaWNrLm5vUVNBICA9IHRydWVcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gc2xpY2tcclxuIiwiLypcclxuc2xpY2tcclxuKi9cInVzZSBzdHJpY3RcIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBcImRvY3VtZW50XCIgaW4gZ2xvYmFsID8gcmVxdWlyZShcIi4vZmluZGVyXCIpIDogeyBwYXJzZTogcmVxdWlyZShcIi4vcGFyc2VyXCIpIH1cclxuIiwiLypcclxuU2xpY2sgUGFyc2VyXHJcbiAtIG9yaWdpbmFsbHkgY3JlYXRlZCBieSB0aGUgYWxtaWdodHkgVGhvbWFzIEF5bG90dCA8QHN1YnRsZWdyYWRpZW50PiAoaHR0cDovL3N1YnRsZWdyYWRpZW50LmNvbSlcclxuKi9cInVzZSBzdHJpY3RcIlxyXG5cclxuLy8gTm90YWJsZSBjaGFuZ2VzIGZyb20gU2xpY2suUGFyc2VyIDEuMC54XHJcblxyXG4vLyBUaGUgcGFyc2VyIG5vdyB1c2VzIDIgY2xhc3NlczogRXhwcmVzc2lvbnMgYW5kIEV4cHJlc3Npb25cclxuLy8gYG5ldyBFeHByZXNzaW9uc2AgcHJvZHVjZXMgYW4gYXJyYXktbGlrZSBvYmplY3QgY29udGFpbmluZyBhIGxpc3Qgb2YgRXhwcmVzc2lvbiBvYmplY3RzXHJcbi8vIC0gRXhwcmVzc2lvbnM6OnRvU3RyaW5nKCkgcHJvZHVjZXMgYSBjbGVhbmVkIHVwIGV4cHJlc3Npb25zIHN0cmluZ1xyXG4vLyBgbmV3IEV4cHJlc3Npb25gIHByb2R1Y2VzIGFuIGFycmF5LWxpa2Ugb2JqZWN0XHJcbi8vIC0gRXhwcmVzc2lvbjo6dG9TdHJpbmcoKSBwcm9kdWNlcyBhIGNsZWFuZWQgdXAgZXhwcmVzc2lvbiBzdHJpbmdcclxuLy8gVGhlIG9ubHkgZXhwb3NlZCBtZXRob2QgaXMgcGFyc2UsIHdoaWNoIHByb2R1Y2VzIGEgKGNhY2hlZCkgYG5ldyBFeHByZXNzaW9uc2AgaW5zdGFuY2VcclxuLy8gcGFyc2VkLnJhdyBpcyBubyBsb25nZXIgcHJlc2VudCwgdXNlIC50b1N0cmluZygpXHJcbi8vIHBhcnNlZC5leHByZXNzaW9uIGlzIG5vdyB1c2VsZXNzLCBqdXN0IHVzZSB0aGUgaW5kaWNlc1xyXG4vLyBwYXJzZWQucmV2ZXJzZSgpIGhhcyBiZWVuIHJlbW92ZWQgZm9yIG5vdywgZHVlIHRvIGl0cyBhcHBhcmVudCB1c2VsZXNzbmVzc1xyXG4vLyBPdGhlciBjaGFuZ2VzIGluIHRoZSBFeHByZXNzaW9ucyBvYmplY3Q6XHJcbi8vIC0gY2xhc3NOYW1lcyBhcmUgbm93IHVuaXF1ZSwgYW5kIHNhdmUgYm90aCBlc2NhcGVkIGFuZCB1bmVzY2FwZWQgdmFsdWVzXHJcbi8vIC0gYXR0cmlidXRlcyBub3cgc2F2ZSBib3RoIGVzY2FwZWQgYW5kIHVuZXNjYXBlZCB2YWx1ZXNcclxuLy8gLSBwc2V1ZG9zIG5vdyBzYXZlIGJvdGggZXNjYXBlZCBhbmQgdW5lc2NhcGVkIHZhbHVlc1xyXG5cclxudmFyIGVzY2FwZVJlICAgPSAvKFstLiorP14ke30oKXxbXFxdXFwvXFxcXF0pL2csXHJcbiAgICB1bmVzY2FwZVJlID0gL1xcXFwvZ1xyXG5cclxudmFyIGVzY2FwZSA9IGZ1bmN0aW9uKHN0cmluZyl7XHJcbiAgICAvLyBYUmVnRXhwIHYyLjAuMC1iZXRhLTNcclxuICAgIC8vIMKrIGh0dHBzOi8vZ2l0aHViLmNvbS9zbGV2aXRoYW4vWFJlZ0V4cC9ibG9iL21hc3Rlci9zcmMveHJlZ2V4cC5qc1xyXG4gICAgcmV0dXJuIChzdHJpbmcgKyBcIlwiKS5yZXBsYWNlKGVzY2FwZVJlLCAnXFxcXCQxJylcclxufVxyXG5cclxudmFyIHVuZXNjYXBlID0gZnVuY3Rpb24oc3RyaW5nKXtcclxuICAgIHJldHVybiAoc3RyaW5nICsgXCJcIikucmVwbGFjZSh1bmVzY2FwZVJlLCAnJylcclxufVxyXG5cclxudmFyIHNsaWNrUmUgPSBSZWdFeHAoXHJcbi8qXHJcbiMhL3Vzci9iaW4vZW52IHJ1YnlcclxucHV0cyBcIlxcdFxcdFwiICsgREFUQS5yZWFkLmdzdWIoL1xcKFxcP3hcXCl8XFxzKyMuKiR8XFxzK3xcXFxcJHxcXFxcbi8sJycpXHJcbl9fRU5EX19cclxuICAgIFwiKD94KV4oPzpcXFxyXG4gICAgICBcXFxccyogKCAsICkgXFxcXHMqICAgICAgICAgICAgICAgIyBTZXBhcmF0b3IgICAgICAgICAgXFxuXFxcclxuICAgIHwgXFxcXHMqICggPGNvbWJpbmF0b3I+KyApIFxcXFxzKiAgICMgQ29tYmluYXRvciAgICAgICAgIFxcblxcXHJcbiAgICB8ICAgICAgKCBcXFxccysgKSAgICAgICAgICAgICAgICAgIyBDb21iaW5hdG9yQ2hpbGRyZW4gXFxuXFxcclxuICAgIHwgICAgICAoIDx1bmljb2RlPisgfCBcXFxcKiApICAgICAjIFRhZyAgICAgICAgICAgICAgICBcXG5cXFxyXG4gICAgfCBcXFxcIyAgKCA8dW5pY29kZT4rICAgICAgICkgICAgICMgSUQgICAgICAgICAgICAgICAgIFxcblxcXHJcbiAgICB8IFxcXFwuICAoIDx1bmljb2RlPisgICAgICAgKSAgICAgIyBDbGFzc05hbWUgICAgICAgICAgXFxuXFxcclxuICAgIHwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIyBBdHRyaWJ1dGUgICAgICAgICAgXFxuXFxcclxuICAgIFxcXFxbICBcXFxyXG4gICAgICAgIFxcXFxzKiAoPHVuaWNvZGUxPispICAoPzogIFxcXHJcbiAgICAgICAgICAgIFxcXFxzKiAoWypeJCF+fF0/PSkgICg/OiAgXFxcclxuICAgICAgICAgICAgICAgIFxcXFxzKiAoPzpcXFxyXG4gICAgICAgICAgICAgICAgICAgIChbXFxcIiddPykoLio/KVxcXFw5IFxcXHJcbiAgICAgICAgICAgICAgICApXFxcclxuICAgICAgICAgICAgKSAgXFxcclxuICAgICAgICApPyAgXFxcXHMqICBcXFxyXG4gICAgXFxcXF0oPyFcXFxcXSkgXFxuXFxcclxuICAgIHwgICA6KyAoIDx1bmljb2RlPisgKSg/OlxcXHJcbiAgICBcXFxcKCAoPzpcXFxyXG4gICAgICAgICg/OihbXFxcIiddKShbXlxcXFwxMl0qKVxcXFwxMil8KCg/OlxcXFwoW14pXStcXFxcKXxbXigpXSopKylcXFxyXG4gICAgKSBcXFxcKVxcXHJcbiAgICApP1xcXHJcbiAgICApXCJcclxuKi9cclxuXCJeKD86XFxcXHMqKCwpXFxcXHMqfFxcXFxzKig8Y29tYmluYXRvcj4rKVxcXFxzKnwoXFxcXHMrKXwoPHVuaWNvZGU+K3xcXFxcKil8XFxcXCMoPHVuaWNvZGU+Kyl8XFxcXC4oPHVuaWNvZGU+Kyl8XFxcXFtcXFxccyooPHVuaWNvZGUxPispKD86XFxcXHMqKFsqXiQhfnxdPz0pKD86XFxcXHMqKD86KFtcXFwiJ10/KSguKj8pXFxcXDkpKSk/XFxcXHMqXFxcXF0oPyFcXFxcXSl8KDorKSg8dW5pY29kZT4rKSg/OlxcXFwoKD86KD86KFtcXFwiJ10pKFteXFxcXDEzXSopXFxcXDEzKXwoKD86XFxcXChbXildK1xcXFwpfFteKCldKikrKSlcXFxcKSk/KVwiXHJcbiAgICAucmVwbGFjZSgvPGNvbWJpbmF0b3I+LywgJ1snICsgZXNjYXBlKFwiPit+YCFAJCVeJj17fVxcXFw7PC9cIikgKyAnXScpXHJcbiAgICAucmVwbGFjZSgvPHVuaWNvZGU+L2csICcoPzpbXFxcXHdcXFxcdTAwYTEtXFxcXHVGRkZGLV18XFxcXFxcXFxbXlxcXFxzMC05YS1mXSknKVxyXG4gICAgLnJlcGxhY2UoLzx1bmljb2RlMT4vZywgJyg/Ols6XFxcXHdcXFxcdTAwYTEtXFxcXHVGRkZGLV18XFxcXFxcXFxbXlxcXFxzMC05YS1mXSknKVxyXG4pXHJcblxyXG4vLyBQYXJ0XHJcblxyXG52YXIgUGFydCA9IGZ1bmN0aW9uIFBhcnQoY29tYmluYXRvcil7XHJcbiAgICB0aGlzLmNvbWJpbmF0b3IgPSBjb21iaW5hdG9yIHx8IFwiIFwiXHJcbiAgICB0aGlzLnRhZyA9IFwiKlwiXHJcbn1cclxuXHJcblBhcnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKXtcclxuXHJcbiAgICBpZiAoIXRoaXMucmF3KXtcclxuXHJcbiAgICAgICAgdmFyIHhwciA9IFwiXCIsIGssIHBhcnRcclxuXHJcbiAgICAgICAgeHByICs9IHRoaXMudGFnIHx8IFwiKlwiXHJcbiAgICAgICAgaWYgKHRoaXMuaWQpIHhwciArPSBcIiNcIiArIHRoaXMuaWRcclxuICAgICAgICBpZiAodGhpcy5jbGFzc2VzKSB4cHIgKz0gXCIuXCIgKyB0aGlzLmNsYXNzTGlzdC5qb2luKFwiLlwiKVxyXG4gICAgICAgIGlmICh0aGlzLmF0dHJpYnV0ZXMpIGZvciAoayA9IDA7IHBhcnQgPSB0aGlzLmF0dHJpYnV0ZXNbaysrXTspe1xyXG4gICAgICAgICAgICB4cHIgKz0gXCJbXCIgKyBwYXJ0Lm5hbWUgKyAocGFydC5vcGVyYXRvciA/IHBhcnQub3BlcmF0b3IgKyAnXCInICsgcGFydC52YWx1ZSArICdcIicgOiAnJykgKyBcIl1cIlxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5wc2V1ZG9zKSBmb3IgKGsgPSAwOyBwYXJ0ID0gdGhpcy5wc2V1ZG9zW2srK107KXtcclxuICAgICAgICAgICAgeHByICs9IFwiOlwiICsgcGFydC5uYW1lXHJcbiAgICAgICAgICAgIGlmIChwYXJ0LnZhbHVlKSB4cHIgKz0gXCIoXCIgKyBwYXJ0LnZhbHVlICsgXCIpXCJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmF3ID0geHByXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLnJhd1xyXG59XHJcblxyXG4vLyBFeHByZXNzaW9uXHJcblxyXG52YXIgRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIEV4cHJlc3Npb24oKXtcclxuICAgIHRoaXMubGVuZ3RoID0gMFxyXG59XHJcblxyXG5FeHByZXNzaW9uLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgaWYgKCF0aGlzLnJhdyl7XHJcblxyXG4gICAgICAgIHZhciB4cHIgPSBcIlwiXHJcblxyXG4gICAgICAgIGZvciAodmFyIGogPSAwLCBiaXQ7IGJpdCA9IHRoaXNbaisrXTspe1xyXG4gICAgICAgICAgICBpZiAoaiAhPT0gMSkgeHByICs9IFwiIFwiXHJcbiAgICAgICAgICAgIGlmIChiaXQuY29tYmluYXRvciAhPT0gXCIgXCIpIHhwciArPSBiaXQuY29tYmluYXRvciArIFwiIFwiXHJcbiAgICAgICAgICAgIHhwciArPSBiaXRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucmF3ID0geHByXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLnJhd1xyXG59XHJcblxyXG52YXIgcmVwbGFjZXIgPSBmdW5jdGlvbihcclxuICAgIHJhd01hdGNoLFxyXG5cclxuICAgIHNlcGFyYXRvcixcclxuICAgIGNvbWJpbmF0b3IsXHJcbiAgICBjb21iaW5hdG9yQ2hpbGRyZW4sXHJcblxyXG4gICAgdGFnTmFtZSxcclxuICAgIGlkLFxyXG4gICAgY2xhc3NOYW1lLFxyXG5cclxuICAgIGF0dHJpYnV0ZUtleSxcclxuICAgIGF0dHJpYnV0ZU9wZXJhdG9yLFxyXG4gICAgYXR0cmlidXRlUXVvdGUsXHJcbiAgICBhdHRyaWJ1dGVWYWx1ZSxcclxuXHJcbiAgICBwc2V1ZG9NYXJrZXIsXHJcbiAgICBwc2V1ZG9DbGFzcyxcclxuICAgIHBzZXVkb1F1b3RlLFxyXG4gICAgcHNldWRvQ2xhc3NRdW90ZWRWYWx1ZSxcclxuICAgIHBzZXVkb0NsYXNzVmFsdWVcclxuKXtcclxuXHJcbiAgICB2YXIgZXhwcmVzc2lvbiwgY3VycmVudFxyXG5cclxuICAgIGlmIChzZXBhcmF0b3IgfHwgIXRoaXMubGVuZ3RoKXtcclxuICAgICAgICBleHByZXNzaW9uID0gdGhpc1t0aGlzLmxlbmd0aCsrXSA9IG5ldyBFeHByZXNzaW9uXHJcbiAgICAgICAgaWYgKHNlcGFyYXRvcikgcmV0dXJuICcnXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFleHByZXNzaW9uKSBleHByZXNzaW9uID0gdGhpc1t0aGlzLmxlbmd0aCAtIDFdXHJcblxyXG4gICAgaWYgKGNvbWJpbmF0b3IgfHwgY29tYmluYXRvckNoaWxkcmVuIHx8ICFleHByZXNzaW9uLmxlbmd0aCl7XHJcbiAgICAgICAgY3VycmVudCA9IGV4cHJlc3Npb25bZXhwcmVzc2lvbi5sZW5ndGgrK10gPSBuZXcgUGFydChjb21iaW5hdG9yKVxyXG4gICAgfVxyXG5cclxuICAgIGlmICghY3VycmVudCkgY3VycmVudCA9IGV4cHJlc3Npb25bZXhwcmVzc2lvbi5sZW5ndGggLSAxXVxyXG5cclxuICAgIGlmICh0YWdOYW1lKXtcclxuXHJcbiAgICAgICAgY3VycmVudC50YWcgPSB1bmVzY2FwZSh0YWdOYW1lKVxyXG5cclxuICAgIH0gZWxzZSBpZiAoaWQpe1xyXG5cclxuICAgICAgICBjdXJyZW50LmlkID0gdW5lc2NhcGUoaWQpXHJcblxyXG4gICAgfSBlbHNlIGlmIChjbGFzc05hbWUpe1xyXG5cclxuICAgICAgICB2YXIgdW5lc2NhcGVkID0gdW5lc2NhcGUoY2xhc3NOYW1lKVxyXG5cclxuICAgICAgICB2YXIgY2xhc3NlcyA9IGN1cnJlbnQuY2xhc3NlcyB8fCAoY3VycmVudC5jbGFzc2VzID0ge30pXHJcbiAgICAgICAgaWYgKCFjbGFzc2VzW3VuZXNjYXBlZF0pe1xyXG4gICAgICAgICAgICBjbGFzc2VzW3VuZXNjYXBlZF0gPSBlc2NhcGUoY2xhc3NOYW1lKVxyXG4gICAgICAgICAgICB2YXIgY2xhc3NMaXN0ID0gY3VycmVudC5jbGFzc0xpc3QgfHwgKGN1cnJlbnQuY2xhc3NMaXN0ID0gW10pXHJcbiAgICAgICAgICAgIGNsYXNzTGlzdC5wdXNoKHVuZXNjYXBlZClcclxuICAgICAgICAgICAgY2xhc3NMaXN0LnNvcnQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9IGVsc2UgaWYgKHBzZXVkb0NsYXNzKXtcclxuXHJcbiAgICAgICAgcHNldWRvQ2xhc3NWYWx1ZSA9IHBzZXVkb0NsYXNzVmFsdWUgfHwgcHNldWRvQ2xhc3NRdW90ZWRWYWx1ZVxyXG5cclxuICAgICAgICA7KGN1cnJlbnQucHNldWRvcyB8fCAoY3VycmVudC5wc2V1ZG9zID0gW10pKS5wdXNoKHtcclxuICAgICAgICAgICAgdHlwZSAgICAgICAgIDogcHNldWRvTWFya2VyLmxlbmd0aCA9PSAxID8gJ2NsYXNzJyA6ICdlbGVtZW50JyxcclxuICAgICAgICAgICAgbmFtZSAgICAgICAgIDogdW5lc2NhcGUocHNldWRvQ2xhc3MpLFxyXG4gICAgICAgICAgICBlc2NhcGVkTmFtZSAgOiBlc2NhcGUocHNldWRvQ2xhc3MpLFxyXG4gICAgICAgICAgICB2YWx1ZSAgICAgICAgOiBwc2V1ZG9DbGFzc1ZhbHVlID8gdW5lc2NhcGUocHNldWRvQ2xhc3NWYWx1ZSkgOiBudWxsLFxyXG4gICAgICAgICAgICBlc2NhcGVkVmFsdWUgOiBwc2V1ZG9DbGFzc1ZhbHVlID8gZXNjYXBlKHBzZXVkb0NsYXNzVmFsdWUpIDogbnVsbFxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgfSBlbHNlIGlmIChhdHRyaWJ1dGVLZXkpe1xyXG5cclxuICAgICAgICBhdHRyaWJ1dGVWYWx1ZSA9IGF0dHJpYnV0ZVZhbHVlID8gZXNjYXBlKGF0dHJpYnV0ZVZhbHVlKSA6IG51bGxcclxuXHJcbiAgICAgICAgOyhjdXJyZW50LmF0dHJpYnV0ZXMgfHwgKGN1cnJlbnQuYXR0cmlidXRlcyA9IFtdKSkucHVzaCh7XHJcbiAgICAgICAgICAgIG9wZXJhdG9yICAgICA6IGF0dHJpYnV0ZU9wZXJhdG9yLFxyXG4gICAgICAgICAgICBuYW1lICAgICAgICAgOiB1bmVzY2FwZShhdHRyaWJ1dGVLZXkpLFxyXG4gICAgICAgICAgICBlc2NhcGVkTmFtZSAgOiBlc2NhcGUoYXR0cmlidXRlS2V5KSxcclxuICAgICAgICAgICAgdmFsdWUgICAgICAgIDogYXR0cmlidXRlVmFsdWUgPyB1bmVzY2FwZShhdHRyaWJ1dGVWYWx1ZSkgOiBudWxsLFxyXG4gICAgICAgICAgICBlc2NhcGVkVmFsdWUgOiBhdHRyaWJ1dGVWYWx1ZSA/IGVzY2FwZShhdHRyaWJ1dGVWYWx1ZSkgOiBudWxsXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuICcnXHJcblxyXG59XHJcblxyXG4vLyBFeHByZXNzaW9uc1xyXG5cclxudmFyIEV4cHJlc3Npb25zID0gZnVuY3Rpb24gRXhwcmVzc2lvbnMoZXhwcmVzc2lvbil7XHJcbiAgICB0aGlzLmxlbmd0aCA9IDBcclxuXHJcbiAgICB2YXIgc2VsZiA9IHRoaXNcclxuXHJcbiAgICB2YXIgb3JpZ2luYWwgPSBleHByZXNzaW9uLCByZXBsYWNlZFxyXG5cclxuICAgIHdoaWxlIChleHByZXNzaW9uKXtcclxuICAgICAgICByZXBsYWNlZCA9IGV4cHJlc3Npb24ucmVwbGFjZShzbGlja1JlLCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZXIuYXBwbHkoc2VsZiwgYXJndW1lbnRzKVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgaWYgKHJlcGxhY2VkID09PSBleHByZXNzaW9uKSB0aHJvdyBuZXcgRXJyb3Iob3JpZ2luYWwgKyAnIGlzIGFuIGludmFsaWQgZXhwcmVzc2lvbicpXHJcbiAgICAgICAgZXhwcmVzc2lvbiA9IHJlcGxhY2VkXHJcbiAgICB9XHJcbn1cclxuXHJcbkV4cHJlc3Npb25zLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCl7XHJcbiAgICBpZiAoIXRoaXMucmF3KXtcclxuICAgICAgICB2YXIgZXhwcmVzc2lvbnMgPSBbXVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBleHByZXNzaW9uOyBleHByZXNzaW9uID0gdGhpc1tpKytdOykgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uKVxyXG4gICAgICAgIHRoaXMucmF3ID0gZXhwcmVzc2lvbnMuam9pbihcIiwgXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMucmF3XHJcbn1cclxuXHJcbnZhciBjYWNoZSA9IHt9XHJcblxyXG52YXIgcGFyc2UgPSBmdW5jdGlvbihleHByZXNzaW9uKXtcclxuICAgIGlmIChleHByZXNzaW9uID09IG51bGwpIHJldHVybiBudWxsXHJcbiAgICBleHByZXNzaW9uID0gKCcnICsgZXhwcmVzc2lvbikucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXHJcbiAgICByZXR1cm4gY2FjaGVbZXhwcmVzc2lvbl0gfHwgKGNhY2hlW2V4cHJlc3Npb25dID0gbmV3IEV4cHJlc3Npb25zKGV4cHJlc3Npb24pKVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlXHJcbiIsIi8qXHJcbnRyYXZlcnNhbFxyXG4qL1widXNlIHN0cmljdFwiXHJcblxyXG52YXIgbWFwID0gcmVxdWlyZShcIm1vdXQvYXJyYXkvbWFwXCIpXHJcblxyXG52YXIgc2xpY2sgPSByZXF1aXJlKFwic2xpY2tcIilcclxuXHJcbnZhciAkID0gcmVxdWlyZShcIi4vYmFzZVwiKVxyXG5cclxudmFyIGdlbiA9IGZ1bmN0aW9uKGNvbWJpbmF0b3IsIGV4cHJlc3Npb24pe1xyXG4gICAgcmV0dXJuIG1hcChzbGljay5wYXJzZShleHByZXNzaW9uIHx8IFwiKlwiKSwgZnVuY3Rpb24ocGFydCl7XHJcbiAgICAgICAgcmV0dXJuIGNvbWJpbmF0b3IgKyBcIiBcIiArIHBhcnRcclxuICAgIH0pLmpvaW4oXCIsIFwiKVxyXG59XHJcblxyXG52YXIgcHVzaF8gPSBBcnJheS5wcm90b3R5cGUucHVzaFxyXG5cclxuJC5pbXBsZW1lbnQoe1xyXG5cclxuICAgIHNlYXJjaDogZnVuY3Rpb24oZXhwcmVzc2lvbil7XHJcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAxKSByZXR1cm4gJChzbGljay5zZWFyY2goZXhwcmVzc2lvbiwgdGhpc1swXSwgbmV3ICQpKVxyXG5cclxuICAgICAgICB2YXIgYnVmZmVyID0gW11cclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbm9kZTsgbm9kZSA9IHRoaXNbaV07IGkrKykgcHVzaF8uYXBwbHkoYnVmZmVyLCBzbGljay5zZWFyY2goZXhwcmVzc2lvbiwgbm9kZSkpXHJcbiAgICAgICAgYnVmZmVyID0gJChidWZmZXIpXHJcbiAgICAgICAgcmV0dXJuIGJ1ZmZlciAmJiBidWZmZXIuc29ydCgpXHJcbiAgICB9LFxyXG5cclxuICAgIGZpbmQ6IGZ1bmN0aW9uKGV4cHJlc3Npb24pe1xyXG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMSkgcmV0dXJuICQoc2xpY2suZmluZChleHByZXNzaW9uLCB0aGlzWzBdKSlcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG5vZGU7IG5vZGUgPSB0aGlzW2ldOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIGZvdW5kID0gc2xpY2suZmluZChleHByZXNzaW9uLCBub2RlKVxyXG4gICAgICAgICAgICBpZiAoZm91bmQpIHJldHVybiAkKGZvdW5kKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGxcclxuICAgIH0sXHJcblxyXG4gICAgc29ydDogZnVuY3Rpb24oKXtcclxuICAgICAgICByZXR1cm4gc2xpY2suc29ydCh0aGlzKVxyXG4gICAgfSxcclxuXHJcbiAgICBtYXRjaGVzOiBmdW5jdGlvbihleHByZXNzaW9uKXtcclxuICAgICAgICByZXR1cm4gc2xpY2subWF0Y2hlcyh0aGlzWzBdLCBleHByZXNzaW9uKVxyXG4gICAgfSxcclxuXHJcbiAgICBjb250YWluczogZnVuY3Rpb24obm9kZSl7XHJcbiAgICAgICAgcmV0dXJuIHNsaWNrLmNvbnRhaW5zKHRoaXNbMF0sIG5vZGUpXHJcbiAgICB9LFxyXG5cclxuICAgIG5leHRTaWJsaW5nczogZnVuY3Rpb24oZXhwcmVzc2lvbil7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VhcmNoKGdlbignficsIGV4cHJlc3Npb24pKVxyXG4gICAgfSxcclxuXHJcbiAgICBuZXh0U2libGluZzogZnVuY3Rpb24oZXhwcmVzc2lvbil7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmluZChnZW4oJysnLCBleHByZXNzaW9uKSlcclxuICAgIH0sXHJcblxyXG4gICAgcHJldmlvdXNTaWJsaW5nczogZnVuY3Rpb24oZXhwcmVzc2lvbil7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VhcmNoKGdlbignIX4nLCBleHByZXNzaW9uKSlcclxuICAgIH0sXHJcblxyXG4gICAgcHJldmlvdXNTaWJsaW5nOiBmdW5jdGlvbihleHByZXNzaW9uKXtcclxuICAgICAgICByZXR1cm4gdGhpcy5maW5kKGdlbignISsnLCBleHByZXNzaW9uKSlcclxuICAgIH0sXHJcblxyXG4gICAgY2hpbGRyZW46IGZ1bmN0aW9uKGV4cHJlc3Npb24pe1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNlYXJjaChnZW4oJz4nLCBleHByZXNzaW9uKSlcclxuICAgIH0sXHJcblxyXG4gICAgZmlyc3RDaGlsZDogZnVuY3Rpb24oZXhwcmVzc2lvbil7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmluZChnZW4oJ14nLCBleHByZXNzaW9uKSlcclxuICAgIH0sXHJcblxyXG4gICAgbGFzdENoaWxkOiBmdW5jdGlvbihleHByZXNzaW9uKXtcclxuICAgICAgICByZXR1cm4gdGhpcy5maW5kKGdlbignIV4nLCBleHByZXNzaW9uKSlcclxuICAgIH0sXHJcblxyXG4gICAgcGFyZW50OiBmdW5jdGlvbihleHByZXNzaW9uKXtcclxuICAgICAgICB2YXIgYnVmZmVyID0gW11cclxuICAgICAgICBsb29wOiBmb3IgKHZhciBpID0gMCwgbm9kZTsgbm9kZSA9IHRoaXNbaV07IGkrKykgd2hpbGUgKChub2RlID0gbm9kZS5wYXJlbnROb2RlKSAmJiAobm9kZSAhPT0gZG9jdW1lbnQpKXtcclxuICAgICAgICAgICAgaWYgKCFleHByZXNzaW9uIHx8IHNsaWNrLm1hdGNoZXMobm9kZSwgZXhwcmVzc2lvbikpe1xyXG4gICAgICAgICAgICAgICAgYnVmZmVyLnB1c2gobm9kZSlcclxuICAgICAgICAgICAgICAgIGJyZWFrIGxvb3BcclxuICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuICQoYnVmZmVyKVxyXG4gICAgfSxcclxuXHJcbiAgICBwYXJlbnRzOiBmdW5jdGlvbihleHByZXNzaW9uKXtcclxuICAgICAgICB2YXIgYnVmZmVyID0gW11cclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbm9kZTsgbm9kZSA9IHRoaXNbaV07IGkrKykgd2hpbGUgKChub2RlID0gbm9kZS5wYXJlbnROb2RlKSAmJiAobm9kZSAhPT0gZG9jdW1lbnQpKXtcclxuICAgICAgICAgICAgaWYgKCFleHByZXNzaW9uIHx8IHNsaWNrLm1hdGNoZXMobm9kZSwgZXhwcmVzc2lvbikpIGJ1ZmZlci5wdXNoKG5vZGUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiAkKGJ1ZmZlcilcclxuICAgIH1cclxuXHJcbn0pXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICRcclxuIiwiLypcclxuemVuXHJcbiovXCJ1c2Ugc3RyaWN0XCJcclxuXHJcbnZhciBmb3JFYWNoID0gcmVxdWlyZShcIm1vdXQvYXJyYXkvZm9yRWFjaFwiKSxcclxuICAgIG1hcCAgICAgPSByZXF1aXJlKFwibW91dC9hcnJheS9tYXBcIilcclxuXHJcbnZhciBwYXJzZSA9IHJlcXVpcmUoXCJzbGljay9wYXJzZXJcIilcclxuXHJcbnZhciAkID0gcmVxdWlyZShcIi4vYmFzZVwiKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihleHByZXNzaW9uLCBkb2Mpe1xyXG5cclxuICAgIHJldHVybiAkKG1hcChwYXJzZShleHByZXNzaW9uKSwgZnVuY3Rpb24oZXhwcmVzc2lvbil7XHJcblxyXG4gICAgICAgIHZhciBwcmV2aW91cywgcmVzdWx0XHJcblxyXG4gICAgICAgIGZvckVhY2goZXhwcmVzc2lvbiwgZnVuY3Rpb24ocGFydCwgaSl7XHJcblxyXG4gICAgICAgICAgICB2YXIgbm9kZSA9IChkb2MgfHwgZG9jdW1lbnQpLmNyZWF0ZUVsZW1lbnQocGFydC50YWcpXHJcblxyXG4gICAgICAgICAgICBpZiAocGFydC5pZCkgbm9kZS5pZCA9IHBhcnQuaWRcclxuXHJcbiAgICAgICAgICAgIGlmIChwYXJ0LmNsYXNzTGlzdCkgbm9kZS5jbGFzc05hbWUgPSBwYXJ0LmNsYXNzTGlzdC5qb2luKFwiIFwiKVxyXG5cclxuICAgICAgICAgICAgaWYgKHBhcnQuYXR0cmlidXRlcykgZm9yRWFjaChwYXJ0LmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKGF0dHJpYnV0ZSl7XHJcbiAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUubmFtZSwgYXR0cmlidXRlLnZhbHVlIHx8IFwiXCIpXHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICBpZiAocGFydC5wc2V1ZG9zKSBmb3JFYWNoKHBhcnQucHNldWRvcywgZnVuY3Rpb24ocHNldWRvKXtcclxuICAgICAgICAgICAgICAgIHZhciBuID0gJChub2RlKSwgbWV0aG9kID0gbltwc2V1ZG8ubmFtZV1cclxuICAgICAgICAgICAgICAgIGlmIChtZXRob2QpIG1ldGhvZC5jYWxsKG4sIHBzZXVkby52YWx1ZSlcclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIGlmIChpID09PSAwKXtcclxuXHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBub2RlXHJcblxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhcnQuY29tYmluYXRvciA9PT0gXCIgXCIpe1xyXG5cclxuICAgICAgICAgICAgICAgIHByZXZpb3VzLmFwcGVuZENoaWxkKG5vZGUpXHJcblxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhcnQuY29tYmluYXRvciA9PT0gXCIrXCIpe1xyXG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudE5vZGUgPSBwcmV2aW91cy5wYXJlbnROb2RlXHJcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50Tm9kZSkgcGFyZW50Tm9kZS5hcHBlbmRDaGlsZChub2RlKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBwcmV2aW91cyA9IG5vZGVcclxuXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdFxyXG5cclxuICAgIH0pKVxyXG5cclxufVxyXG4iLCJ2YXIga2luZE9mID0gcmVxdWlyZSgnLi9raW5kT2YnKTtcbnZhciBpc1BsYWluT2JqZWN0ID0gcmVxdWlyZSgnLi9pc1BsYWluT2JqZWN0Jyk7XG52YXIgbWl4SW4gPSByZXF1aXJlKCcuLi9vYmplY3QvbWl4SW4nKTtcblxuICAgIC8qKlxuICAgICAqIENsb25lIG5hdGl2ZSB0eXBlcy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjbG9uZSh2YWwpe1xuICAgICAgICBzd2l0Y2ggKGtpbmRPZih2YWwpKSB7XG4gICAgICAgICAgICBjYXNlICdPYmplY3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBjbG9uZU9iamVjdCh2YWwpO1xuICAgICAgICAgICAgY2FzZSAnQXJyYXknOlxuICAgICAgICAgICAgICAgIHJldHVybiBjbG9uZUFycmF5KHZhbCk7XG4gICAgICAgICAgICBjYXNlICdSZWdFeHAnOlxuICAgICAgICAgICAgICAgIHJldHVybiBjbG9uZVJlZ0V4cCh2YWwpO1xuICAgICAgICAgICAgY2FzZSAnRGF0ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNsb25lRGF0ZSh2YWwpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xvbmVPYmplY3Qoc291cmNlKSB7XG4gICAgICAgIGlmIChpc1BsYWluT2JqZWN0KHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBtaXhJbih7fSwgc291cmNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbG9uZVJlZ0V4cChyKSB7XG4gICAgICAgIHZhciBmbGFncyA9ICcnO1xuICAgICAgICBmbGFncyArPSByLm11bHRpbGluZSA/ICdtJyA6ICcnO1xuICAgICAgICBmbGFncyArPSByLmdsb2JhbCA/ICdnJyA6ICcnO1xuICAgICAgICBmbGFncyArPSByLmlnbm9yZUNhc2UgPyAnaScgOiAnJztcbiAgICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoci5zb3VyY2UsIGZsYWdzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbG9uZURhdGUoZGF0ZSkge1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoK2RhdGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsb25lQXJyYXkoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnIuc2xpY2UoKTtcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xuXG5cbiIsInZhciBjbG9uZSA9IHJlcXVpcmUoJy4vY2xvbmUnKTtcbnZhciBmb3JPd24gPSByZXF1aXJlKCcuLi9vYmplY3QvZm9yT3duJyk7XG52YXIga2luZE9mID0gcmVxdWlyZSgnLi9raW5kT2YnKTtcbnZhciBpc1BsYWluT2JqZWN0ID0gcmVxdWlyZSgnLi9pc1BsYWluT2JqZWN0Jyk7XG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmVseSBjbG9uZSBuYXRpdmUgdHlwZXMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZGVlcENsb25lKHZhbCwgaW5zdGFuY2VDbG9uZSkge1xuICAgICAgICBzd2l0Y2ggKCBraW5kT2YodmFsKSApIHtcbiAgICAgICAgICAgIGNhc2UgJ09iamVjdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNsb25lT2JqZWN0KHZhbCwgaW5zdGFuY2VDbG9uZSk7XG4gICAgICAgICAgICBjYXNlICdBcnJheSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNsb25lQXJyYXkodmFsLCBpbnN0YW5jZUNsb25lKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNsb25lKHZhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbG9uZU9iamVjdChzb3VyY2UsIGluc3RhbmNlQ2xvbmUpIHtcbiAgICAgICAgaWYgKGlzUGxhaW5PYmplY3Qoc291cmNlKSkge1xuICAgICAgICAgICAgdmFyIG91dCA9IHt9O1xuICAgICAgICAgICAgZm9yT3duKHNvdXJjZSwgZnVuY3Rpb24odmFsLCBrZXkpIHtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBkZWVwQ2xvbmUodmFsLCBpbnN0YW5jZUNsb25lKTtcbiAgICAgICAgICAgIH0sIG91dCk7XG4gICAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICB9IGVsc2UgaWYgKGluc3RhbmNlQ2xvbmUpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZUNsb25lKHNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xvbmVBcnJheShhcnIsIGluc3RhbmNlQ2xvbmUpIHtcbiAgICAgICAgdmFyIG91dCA9IFtdLFxuICAgICAgICAgICAgaSA9IC0xLFxuICAgICAgICAgICAgbiA9IGFyci5sZW5ndGgsXG4gICAgICAgICAgICB2YWw7XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgICAgICBvdXRbaV0gPSBkZWVwQ2xvbmUoYXJyW2ldLCBpbnN0YW5jZUNsb25lKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gZGVlcENsb25lO1xuXG5cblxuIiwidmFyIGlzS2luZCA9IHJlcXVpcmUoJy4vaXNLaW5kJyk7XG4gICAgLyoqXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNPYmplY3QodmFsKSB7XG4gICAgICAgIHJldHVybiBpc0tpbmQodmFsLCAnT2JqZWN0Jyk7XG4gICAgfVxuICAgIG1vZHVsZS5leHBvcnRzID0gaXNPYmplY3Q7XG5cbiIsIlxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB2YWx1ZSBpcyBjcmVhdGVkIGJ5IHRoZSBgT2JqZWN0YCBjb25zdHJ1Y3Rvci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KHZhbHVlKSB7XG4gICAgICAgIHJldHVybiAoISF2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmXG4gICAgICAgICAgICB2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KTtcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGlzUGxhaW5PYmplY3Q7XG5cblxuIiwidmFyIGhhc093biA9IHJlcXVpcmUoJy4vaGFzT3duJyk7XG52YXIgZGVlcENsb25lID0gcmVxdWlyZSgnLi4vbGFuZy9kZWVwQ2xvbmUnKTtcbnZhciBpc09iamVjdCA9IHJlcXVpcmUoJy4uL2xhbmcvaXNPYmplY3QnKTtcblxuICAgIC8qKlxuICAgICAqIERlZXAgbWVyZ2Ugb2JqZWN0cy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtZXJnZSgpIHtcbiAgICAgICAgdmFyIGkgPSAxLFxuICAgICAgICAgICAga2V5LCB2YWwsIG9iaiwgdGFyZ2V0O1xuXG4gICAgICAgIC8vIG1ha2Ugc3VyZSB3ZSBkb24ndCBtb2RpZnkgc291cmNlIGVsZW1lbnQgYW5kIGl0J3MgcHJvcGVydGllc1xuICAgICAgICAvLyBvYmplY3RzIGFyZSBwYXNzZWQgYnkgcmVmZXJlbmNlXG4gICAgICAgIHRhcmdldCA9IGRlZXBDbG9uZSggYXJndW1lbnRzWzBdICk7XG5cbiAgICAgICAgd2hpbGUgKG9iaiA9IGFyZ3VtZW50c1tpKytdKSB7XG4gICAgICAgICAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZiAoICEgaGFzT3duKG9iaiwga2V5KSApIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFsID0gb2JqW2tleV07XG5cbiAgICAgICAgICAgICAgICBpZiAoIGlzT2JqZWN0KHZhbCkgJiYgaXNPYmplY3QodGFyZ2V0W2tleV0pICl7XG4gICAgICAgICAgICAgICAgICAgIC8vIGluY2VwdGlvbiwgZGVlcCBtZXJnZSBvYmplY3RzXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gbWVyZ2UodGFyZ2V0W2tleV0sIHZhbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIGFycmF5cywgcmVnZXhwLCBkYXRlLCBvYmplY3RzIGFyZSBjbG9uZWRcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBkZWVwQ2xvbmUodmFsKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBtZXJnZTtcblxuXG4iLCJ2YXIgZm9yT3duID0gcmVxdWlyZSgnLi9mb3JPd24nKTtcblxuICAgIC8qKlxuICAgICogQ29tYmluZSBwcm9wZXJ0aWVzIGZyb20gYWxsIHRoZSBvYmplY3RzIGludG8gZmlyc3Qgb25lLlxuICAgICogLSBUaGlzIG1ldGhvZCBhZmZlY3RzIHRhcmdldCBvYmplY3QgaW4gcGxhY2UsIGlmIHlvdSB3YW50IHRvIGNyZWF0ZSBhIG5ldyBPYmplY3QgcGFzcyBhbiBlbXB0eSBvYmplY3QgYXMgZmlyc3QgcGFyYW0uXG4gICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0ICAgIFRhcmdldCBPYmplY3RcbiAgICAqIEBwYXJhbSB7Li4ub2JqZWN0fSBvYmplY3RzICAgIE9iamVjdHMgdG8gYmUgY29tYmluZWQgKDAuLi5uIG9iamVjdHMpLlxuICAgICogQHJldHVybiB7b2JqZWN0fSBUYXJnZXQgT2JqZWN0LlxuICAgICovXG4gICAgZnVuY3Rpb24gbWl4SW4odGFyZ2V0LCBvYmplY3RzKXtcbiAgICAgICAgdmFyIGkgPSAwLFxuICAgICAgICAgICAgbiA9IGFyZ3VtZW50cy5sZW5ndGgsXG4gICAgICAgICAgICBvYmo7XG4gICAgICAgIHdoaWxlKCsraSA8IG4pe1xuICAgICAgICAgICAgb2JqID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgaWYgKG9iaiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZm9yT3duKG9iaiwgY29weVByb3AsIHRhcmdldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb3B5UHJvcCh2YWwsIGtleSl7XG4gICAgICAgIHRoaXNba2V5XSA9IHZhbDtcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IG1peEluO1xuXG4iLCJ2YXIga2luZE9mID0gcmVxdWlyZSgnLi9raW5kT2YnKTtcbnZhciBpc1BsYWluT2JqZWN0ID0gcmVxdWlyZSgnLi9pc1BsYWluT2JqZWN0Jyk7XG52YXIgbWl4SW4gPSByZXF1aXJlKCcuLi9vYmplY3QvbWl4SW4nKTtcblxuICAgIC8qKlxuICAgICAqIENsb25lIG5hdGl2ZSB0eXBlcy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjbG9uZSh2YWwpe1xuICAgICAgICBzd2l0Y2ggKGtpbmRPZih2YWwpKSB7XG4gICAgICAgICAgICBjYXNlICdPYmplY3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBjbG9uZU9iamVjdCh2YWwpO1xuICAgICAgICAgICAgY2FzZSAnQXJyYXknOlxuICAgICAgICAgICAgICAgIHJldHVybiBjbG9uZUFycmF5KHZhbCk7XG4gICAgICAgICAgICBjYXNlICdSZWdFeHAnOlxuICAgICAgICAgICAgICAgIHJldHVybiBjbG9uZVJlZ0V4cCh2YWwpO1xuICAgICAgICAgICAgY2FzZSAnRGF0ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNsb25lRGF0ZSh2YWwpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xvbmVPYmplY3Qoc291cmNlKSB7XG4gICAgICAgIGlmIChpc1BsYWluT2JqZWN0KHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBtaXhJbih7fSwgc291cmNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbG9uZVJlZ0V4cChyKSB7XG4gICAgICAgIHZhciBmbGFncyA9ICcnO1xuICAgICAgICBmbGFncyArPSByLm11bHRpbGluZSA/ICdtJyA6ICcnO1xuICAgICAgICBmbGFncyArPSByLmdsb2JhbCA/ICdnJyA6ICcnO1xuICAgICAgICBmbGFncyArPSByLmlnbm9yZWNhc2UgPyAnaScgOiAnJztcbiAgICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoci5zb3VyY2UsIGZsYWdzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbG9uZURhdGUoZGF0ZSkge1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoK2RhdGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsb25lQXJyYXkoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnIuc2xpY2UoKTtcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xuXG5cbiIsIi8qXG5wcmltZVxuIC0gcHJvdG90eXBhbCBpbmhlcml0YW5jZVxuKi9cInVzZSBzdHJpY3RcIlxuXG52YXIgaGFzT3duID0gcmVxdWlyZShcIm1vdXQvb2JqZWN0L2hhc093blwiKSxcbiAgICBtaXhJbiAgPSByZXF1aXJlKFwibW91dC9vYmplY3QvbWl4SW5cIiksXG4gICAgY3JlYXRlID0gcmVxdWlyZShcIm1vdXQvbGFuZy9jcmVhdGVPYmplY3RcIiksXG4gICAga2luZE9mID0gcmVxdWlyZShcIm1vdXQvbGFuZy9raW5kT2ZcIilcblxudmFyIGhhc0Rlc2NyaXB0b3JzID0gdHJ1ZVxuXG50cnkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSwgXCJ+XCIsIHt9KVxuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioe30sIFwiflwiKVxufSBjYXRjaCAoZSl7XG4gICAgaGFzRGVzY3JpcHRvcnMgPSBmYWxzZVxufVxuXG4vLyB3ZSBvbmx5IG5lZWQgdG8gYmUgYWJsZSB0byBpbXBsZW1lbnQgXCJ0b1N0cmluZ1wiIGFuZCBcInZhbHVlT2ZcIiBpbiBJRSA8IDlcbnZhciBoYXNFbnVtQnVnID0gISh7dmFsdWVPZjogMH0pLnByb3BlcnR5SXNFbnVtZXJhYmxlKFwidmFsdWVPZlwiKSxcbiAgICBidWdneSAgICAgID0gW1widG9TdHJpbmdcIiwgXCJ2YWx1ZU9mXCJdXG5cbnZhciB2ZXJicyA9IC9eY29uc3RydWN0b3J8aW5oZXJpdHN8bWl4aW4kL1xuXG52YXIgaW1wbGVtZW50ID0gZnVuY3Rpb24ocHJvdG8pe1xuICAgIHZhciBwcm90b3R5cGUgPSB0aGlzLnByb3RvdHlwZVxuXG4gICAgZm9yICh2YXIga2V5IGluIHByb3RvKXtcbiAgICAgICAgaWYgKGtleS5tYXRjaCh2ZXJicykpIGNvbnRpbnVlXG4gICAgICAgIGlmIChoYXNEZXNjcmlwdG9ycyl7XG4gICAgICAgICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocHJvdG8sIGtleSlcbiAgICAgICAgICAgIGlmIChkZXNjcmlwdG9yKXtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG90eXBlLCBrZXksIGRlc2NyaXB0b3IpXG4gICAgICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwcm90b3R5cGVba2V5XSA9IHByb3RvW2tleV1cbiAgICB9XG5cbiAgICBpZiAoaGFzRW51bUJ1ZykgZm9yICh2YXIgaSA9IDA7IChrZXkgPSBidWdneVtpXSk7IGkrKyl7XG4gICAgICAgIHZhciB2YWx1ZSA9IHByb3RvW2tleV1cbiAgICAgICAgaWYgKHZhbHVlICE9PSBPYmplY3QucHJvdG90eXBlW2tleV0pIHByb3RvdHlwZVtrZXldID0gdmFsdWVcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xufVxuXG52YXIgcHJpbWUgPSBmdW5jdGlvbihwcm90byl7XG5cbiAgICBpZiAoa2luZE9mKHByb3RvKSA9PT0gXCJGdW5jdGlvblwiKSBwcm90byA9IHtjb25zdHJ1Y3RvcjogcHJvdG99XG5cbiAgICB2YXIgc3VwZXJwcmltZSA9IHByb3RvLmluaGVyaXRzXG5cbiAgICAvLyBpZiBvdXIgbmljZSBwcm90byBvYmplY3QgaGFzIG5vIG93biBjb25zdHJ1Y3RvciBwcm9wZXJ0eVxuICAgIC8vIHRoZW4gd2UgcHJvY2VlZCB1c2luZyBhIGdob3N0aW5nIGNvbnN0cnVjdG9yIHRoYXQgYWxsIGl0IGRvZXMgaXNcbiAgICAvLyBjYWxsIHRoZSBwYXJlbnQncyBjb25zdHJ1Y3RvciBpZiBpdCBoYXMgYSBzdXBlcnByaW1lLCBlbHNlIGFuIGVtcHR5IGNvbnN0cnVjdG9yXG4gICAgLy8gcHJvdG8uY29uc3RydWN0b3IgYmVjb21lcyB0aGUgZWZmZWN0aXZlIGNvbnN0cnVjdG9yXG4gICAgdmFyIGNvbnN0cnVjdG9yID0gKGhhc093bihwcm90bywgXCJjb25zdHJ1Y3RvclwiKSkgPyBwcm90by5jb25zdHJ1Y3RvciA6IChzdXBlcnByaW1lKSA/IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBzdXBlcnByaW1lLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICB9IDogZnVuY3Rpb24oKXt9XG5cbiAgICBpZiAoc3VwZXJwcmltZSl7XG5cbiAgICAgICAgbWl4SW4oY29uc3RydWN0b3IsIHN1cGVycHJpbWUpXG5cbiAgICAgICAgdmFyIHN1cGVycHJvdG8gPSBzdXBlcnByaW1lLnByb3RvdHlwZVxuICAgICAgICAvLyBpbmhlcml0IGZyb20gc3VwZXJwcmltZVxuICAgICAgICB2YXIgY3Byb3RvID0gY29uc3RydWN0b3IucHJvdG90eXBlID0gY3JlYXRlKHN1cGVycHJvdG8pXG5cbiAgICAgICAgLy8gc2V0dGluZyBjb25zdHJ1Y3Rvci5wYXJlbnQgdG8gc3VwZXJwcmltZS5wcm90b3R5cGVcbiAgICAgICAgLy8gYmVjYXVzZSBpdCdzIHRoZSBzaG9ydGVzdCBwb3NzaWJsZSBhYnNvbHV0ZSByZWZlcmVuY2VcbiAgICAgICAgY29uc3RydWN0b3IucGFyZW50ID0gc3VwZXJwcm90b1xuICAgICAgICBjcHJvdG8uY29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvclxuICAgIH1cblxuICAgIGlmICghY29uc3RydWN0b3IuaW1wbGVtZW50KSBjb25zdHJ1Y3Rvci5pbXBsZW1lbnQgPSBpbXBsZW1lbnRcblxuICAgIHZhciBtaXhpbnMgPSBwcm90by5taXhpblxuICAgIGlmIChtaXhpbnMpe1xuICAgICAgICBpZiAoa2luZE9mKG1peGlucykgIT09IFwiQXJyYXlcIikgbWl4aW5zID0gW21peGluc11cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtaXhpbnMubGVuZ3RoOyBpKyspIGNvbnN0cnVjdG9yLmltcGxlbWVudChjcmVhdGUobWl4aW5zW2ldLnByb3RvdHlwZSkpXG4gICAgfVxuXG4gICAgLy8gaW1wbGVtZW50IHByb3RvIGFuZCByZXR1cm4gY29uc3RydWN0b3JcbiAgICByZXR1cm4gY29uc3RydWN0b3IuaW1wbGVtZW50KHByb3RvKVxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gcHJpbWVcbiIsInZhciBtaXhJbiA9IHJlcXVpcmUoJy4uL29iamVjdC9taXhJbicpO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIE9iamVjdCB1c2luZyBwcm90b3R5cGFsIGluaGVyaXRhbmNlIGFuZCBzZXR0aW5nIGN1c3RvbSBwcm9wZXJ0aWVzLlxuICAgICAqIC0gTWl4IGJldHdlZW4gRG91Z2xhcyBDcm9ja2ZvcmQgUHJvdG90eXBhbCBJbmhlcml0YW5jZSA8aHR0cDovL2phdmFzY3JpcHQuY3JvY2tmb3JkLmNvbS9wcm90b3R5cGFsLmh0bWw+IGFuZCB0aGUgRWNtYVNjcmlwdCA1IGBPYmplY3QuY3JlYXRlKClgIG1ldGhvZC5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyZW50ICAgIFBhcmVudCBPYmplY3QuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtwcm9wc10gT2JqZWN0IHByb3BlcnRpZXMuXG4gICAgICogQHJldHVybiB7b2JqZWN0fSBDcmVhdGVkIG9iamVjdC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVPYmplY3QocGFyZW50LCBwcm9wcyl7XG4gICAgICAgIGZ1bmN0aW9uIEYoKXt9XG4gICAgICAgIEYucHJvdG90eXBlID0gcGFyZW50O1xuICAgICAgICByZXR1cm4gbWl4SW4obmV3IEYoKSwgcHJvcHMpO1xuXG4gICAgfVxuICAgIG1vZHVsZS5leHBvcnRzID0gY3JlYXRlT2JqZWN0O1xuXG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgcHJpbWUgPSByZXF1aXJlKFwicHJpbWVcIilcbnZhciBtZXJnZSA9IHJlcXVpcmUoXCJtb3V0L29iamVjdC9tZXJnZVwiKVxuXG52YXIgT3B0aW9ucyA9IHByaW1lKHtcblxuICAgIHNldE9wdGlvbnM6IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgICAgICB2YXIgYXJncyA9IFt7fSwgdGhpcy5vcHRpb25zXVxuICAgICAgICBhcmdzLnB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSBtZXJnZS5hcHBseShudWxsLCBhcmdzKVxuICAgICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBPcHRpb25zXG4iLCIvKlxyXG5kZWZlclxyXG4qL1widXNlIHN0cmljdFwiXHJcblxyXG52YXIga2luZE9mICA9IHJlcXVpcmUoXCJtb3V0L2xhbmcva2luZE9mXCIpLFxyXG4gICAgbm93ICAgICA9IHJlcXVpcmUoXCJtb3V0L3RpbWUvbm93XCIpLFxyXG4gICAgZm9yRWFjaCA9IHJlcXVpcmUoXCJtb3V0L2FycmF5L2ZvckVhY2hcIiksXHJcbiAgICBpbmRleE9mID0gcmVxdWlyZShcIm1vdXQvYXJyYXkvaW5kZXhPZlwiKVxyXG5cclxudmFyIGNhbGxiYWNrcyA9IHtcclxuICAgIHRpbWVvdXQ6IHt9LFxyXG4gICAgZnJhbWU6IFtdLFxyXG4gICAgaW1tZWRpYXRlOiBbXVxyXG59XHJcblxyXG52YXIgcHVzaCA9IGZ1bmN0aW9uKGNvbGxlY3Rpb24sIGNhbGxiYWNrLCBjb250ZXh0LCBkZWZlcil7XHJcblxyXG4gICAgdmFyIGl0ZXJhdG9yID0gZnVuY3Rpb24oKXtcclxuICAgICAgICBpdGVyYXRlKGNvbGxlY3Rpb24pXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFjb2xsZWN0aW9uLmxlbmd0aCkgZGVmZXIoaXRlcmF0b3IpXHJcblxyXG4gICAgdmFyIGVudHJ5ID0ge1xyXG4gICAgICAgIGNhbGxiYWNrOiBjYWxsYmFjayxcclxuICAgICAgICBjb250ZXh0OiBjb250ZXh0XHJcbiAgICB9XHJcblxyXG4gICAgY29sbGVjdGlvbi5wdXNoKGVudHJ5KVxyXG5cclxuICAgIHJldHVybiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHZhciBpbyA9IGluZGV4T2YoY29sbGVjdGlvbiwgZW50cnkpXHJcbiAgICAgICAgaWYgKGlvID4gLTEpIGNvbGxlY3Rpb24uc3BsaWNlKGlvLCAxKVxyXG4gICAgfVxyXG59XHJcblxyXG52YXIgaXRlcmF0ZSA9IGZ1bmN0aW9uKGNvbGxlY3Rpb24pe1xyXG4gICAgdmFyIHRpbWUgPSBub3coKVxyXG5cclxuICAgIGZvckVhY2goY29sbGVjdGlvbi5zcGxpY2UoMCksIGZ1bmN0aW9uKGVudHJ5KSB7XHJcbiAgICAgICAgZW50cnkuY2FsbGJhY2suY2FsbChlbnRyeS5jb250ZXh0LCB0aW1lKVxyXG4gICAgfSlcclxufVxyXG5cclxudmFyIGRlZmVyID0gZnVuY3Rpb24oY2FsbGJhY2ssIGFyZ3VtZW50LCBjb250ZXh0KXtcclxuICAgIHJldHVybiAoa2luZE9mKGFyZ3VtZW50KSA9PT0gXCJOdW1iZXJcIikgPyBkZWZlci50aW1lb3V0KGNhbGxiYWNrLCBhcmd1bWVudCwgY29udGV4dCkgOiBkZWZlci5pbW1lZGlhdGUoY2FsbGJhY2ssIGFyZ3VtZW50KVxyXG59XHJcblxyXG5pZiAoZ2xvYmFsLnByb2Nlc3MgJiYgcHJvY2Vzcy5uZXh0VGljayl7XHJcblxyXG4gICAgZGVmZXIuaW1tZWRpYXRlID0gZnVuY3Rpb24oY2FsbGJhY2ssIGNvbnRleHQpe1xyXG4gICAgICAgIHJldHVybiBwdXNoKGNhbGxiYWNrcy5pbW1lZGlhdGUsIGNhbGxiYWNrLCBjb250ZXh0LCBwcm9jZXNzLm5leHRUaWNrKVxyXG4gICAgfVxyXG5cclxufSBlbHNlIGlmIChnbG9iYWwuc2V0SW1tZWRpYXRlKXtcclxuXHJcbiAgICBkZWZlci5pbW1lZGlhdGUgPSBmdW5jdGlvbihjYWxsYmFjaywgY29udGV4dCl7XHJcbiAgICAgICAgcmV0dXJuIHB1c2goY2FsbGJhY2tzLmltbWVkaWF0ZSwgY2FsbGJhY2ssIGNvbnRleHQsIHNldEltbWVkaWF0ZSlcclxuICAgIH1cclxuXHJcbn0gZWxzZSBpZiAoZ2xvYmFsLnBvc3RNZXNzYWdlICYmIGdsb2JhbC5hZGRFdmVudExpc3RlbmVyKXtcclxuXHJcbiAgICBhZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbihldmVudCl7XHJcbiAgICAgICAgaWYgKGV2ZW50LnNvdXJjZSA9PT0gZ2xvYmFsICYmIGV2ZW50LmRhdGEgPT09IFwiQGRlZmVycmVkXCIpe1xyXG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgICAgICBpdGVyYXRlKGNhbGxiYWNrcy5pbW1lZGlhdGUpXHJcbiAgICAgICAgfVxyXG4gICAgfSwgdHJ1ZSlcclxuXHJcbiAgICBkZWZlci5pbW1lZGlhdGUgPSBmdW5jdGlvbihjYWxsYmFjaywgY29udGV4dCl7XHJcbiAgICAgICAgcmV0dXJuIHB1c2goY2FsbGJhY2tzLmltbWVkaWF0ZSwgY2FsbGJhY2ssIGNvbnRleHQsIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIHBvc3RNZXNzYWdlKFwiQGRlZmVycmVkXCIsIFwiKlwiKVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG59IGVsc2Uge1xyXG5cclxuICAgIGRlZmVyLmltbWVkaWF0ZSA9IGZ1bmN0aW9uKGNhbGxiYWNrLCBjb250ZXh0KXtcclxuICAgICAgICByZXR1cm4gcHVzaChjYWxsYmFja3MuaW1tZWRpYXRlLCBjYWxsYmFjaywgY29udGV4dCwgZnVuY3Rpb24oaXRlcmF0b3Ipe1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGl0ZXJhdG9yLCAwKVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG59XHJcblxyXG52YXIgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZ2xvYmFsLnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxyXG4gICAgZ2xvYmFsLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxyXG4gICAgZ2xvYmFsLm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxyXG4gICAgZ2xvYmFsLm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcclxuICAgIGdsb2JhbC5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxyXG4gICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuICAgICAgICBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxZTMgLyA2MClcclxuICAgIH1cclxuXHJcbmRlZmVyLmZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2ssIGNvbnRleHQpe1xyXG4gICAgcmV0dXJuIHB1c2goY2FsbGJhY2tzLmZyYW1lLCBjYWxsYmFjaywgY29udGV4dCwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKVxyXG59XHJcblxyXG52YXIgY2xlYXJcclxuXHJcbmRlZmVyLnRpbWVvdXQgPSBmdW5jdGlvbihjYWxsYmFjaywgbXMsIGNvbnRleHQpe1xyXG4gICAgdmFyIGN0ID0gY2FsbGJhY2tzLnRpbWVvdXRcclxuXHJcbiAgICBpZiAoIWNsZWFyKSBjbGVhciA9IGRlZmVyLmltbWVkaWF0ZShmdW5jdGlvbigpe1xyXG4gICAgICAgIGNsZWFyID0gbnVsbFxyXG4gICAgICAgIGNhbGxiYWNrcy50aW1lb3V0ID0ge31cclxuICAgIH0pXHJcblxyXG4gICAgcmV0dXJuIHB1c2goY3RbbXNdIHx8IChjdFttc10gPSBbXSksIGNhbGxiYWNrLCBjb250ZXh0LCBmdW5jdGlvbihpdGVyYXRvcil7XHJcbiAgICAgICAgc2V0VGltZW91dChpdGVyYXRvciwgbXMpXHJcbiAgICB9KVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRlZmVyXHJcbiIsIi8qXHJcbkVtaXR0ZXJcclxuKi9cInVzZSBzdHJpY3RcIlxyXG5cclxudmFyIGluZGV4T2YgPSByZXF1aXJlKFwibW91dC9hcnJheS9pbmRleE9mXCIpLFxyXG4gICAgZm9yRWFjaCA9IHJlcXVpcmUoXCJtb3V0L2FycmF5L2ZvckVhY2hcIilcclxuXHJcbnZhciBwcmltZSA9IHJlcXVpcmUoXCIuL2luZGV4XCIpLFxyXG4gICAgZGVmZXIgPSByZXF1aXJlKFwiLi9kZWZlclwiKVxyXG5cclxudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xyXG5cclxudmFyIEVtaXR0ZXIgPSBwcmltZSh7XHJcblxyXG4gICAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKHN0b3BwYWJsZSl7XHJcbiAgICAgICAgdGhpcy5fc3RvcHBhYmxlID0gc3RvcHBhYmxlXHJcbiAgICB9LFxyXG5cclxuICAgIG9uOiBmdW5jdGlvbihldmVudCwgZm4pe1xyXG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnMgfHwgKHRoaXMuX2xpc3RlbmVycyA9IHt9KSxcclxuICAgICAgICAgICAgZXZlbnRzID0gbGlzdGVuZXJzW2V2ZW50XSB8fCAobGlzdGVuZXJzW2V2ZW50XSA9IFtdKVxyXG5cclxuICAgICAgICBpZiAoaW5kZXhPZihldmVudHMsIGZuKSA9PT0gLTEpIGV2ZW50cy5wdXNoKGZuKVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfSxcclxuXHJcbiAgICBvZmY6IGZ1bmN0aW9uKGV2ZW50LCBmbil7XHJcbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycywgZXZlbnRzXHJcbiAgICAgICAgaWYgKGxpc3RlbmVycyAmJiAoZXZlbnRzID0gbGlzdGVuZXJzW2V2ZW50XSkpe1xyXG5cclxuICAgICAgICAgICAgdmFyIGlvID0gaW5kZXhPZihldmVudHMsIGZuKVxyXG4gICAgICAgICAgICBpZiAoaW8gPiAtMSkgZXZlbnRzLnNwbGljZShpbywgMSlcclxuICAgICAgICAgICAgaWYgKCFldmVudHMubGVuZ3RoKSBkZWxldGUgbGlzdGVuZXJzW2V2ZW50XTtcclxuICAgICAgICAgICAgZm9yICh2YXIgbCBpbiBsaXN0ZW5lcnMpIHJldHVybiB0aGlzXHJcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9saXN0ZW5lcnNcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH0sXHJcblxyXG4gICAgZW1pdDogZnVuY3Rpb24oZXZlbnQpe1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcclxuICAgICAgICAgICAgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxyXG5cclxuICAgICAgICB2YXIgZW1pdCA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lcnMgPSBzZWxmLl9saXN0ZW5lcnMsIGV2ZW50c1xyXG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzICYmIChldmVudHMgPSBsaXN0ZW5lcnNbZXZlbnRdKSl7XHJcbiAgICAgICAgICAgICAgICBmb3JFYWNoKGV2ZW50cy5zbGljZSgwKSwgZnVuY3Rpb24oZXZlbnQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBldmVudC5hcHBseShzZWxmLCBhcmdzKVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLl9zdG9wcGFibGUpIHJldHVybiByZXN1bHRcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gPT09IEVtaXR0ZXIuRU1JVF9TWU5DKXtcclxuICAgICAgICAgICAgYXJncy5wb3AoKVxyXG4gICAgICAgICAgICBlbWl0KClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkZWZlcihlbWl0KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbn0pXHJcblxyXG5FbWl0dGVyLkVNSVRfU1lOQyA9IHt9XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXJcclxuIiwiLypcclxucHJpbWVcclxuIC0gcHJvdG90eXBhbCBpbmhlcml0YW5jZVxyXG4qL1widXNlIHN0cmljdFwiXHJcblxyXG52YXIgaGFzT3duID0gcmVxdWlyZShcIm1vdXQvb2JqZWN0L2hhc093blwiKSxcclxuICAgIG1peEluICA9IHJlcXVpcmUoXCJtb3V0L29iamVjdC9taXhJblwiKSxcclxuICAgIGNyZWF0ZSA9IHJlcXVpcmUoXCJtb3V0L2xhbmcvY3JlYXRlT2JqZWN0XCIpLFxyXG4gICAga2luZE9mID0gcmVxdWlyZShcIm1vdXQvbGFuZy9raW5kT2ZcIilcclxuXHJcbnZhciBoYXNEZXNjcmlwdG9ycyA9IHRydWVcclxuXHJcbnRyeSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sIFwiflwiLCB7fSlcclxuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioe30sIFwiflwiKVxyXG59IGNhdGNoIChlKXtcclxuICAgIGhhc0Rlc2NyaXB0b3JzID0gZmFsc2VcclxufVxyXG5cclxuLy8gd2Ugb25seSBuZWVkIHRvIGJlIGFibGUgdG8gaW1wbGVtZW50IFwidG9TdHJpbmdcIiBhbmQgXCJ2YWx1ZU9mXCIgaW4gSUUgPCA5XHJcbnZhciBoYXNFbnVtQnVnID0gISh7dmFsdWVPZjogMH0pLnByb3BlcnR5SXNFbnVtZXJhYmxlKFwidmFsdWVPZlwiKSxcclxuICAgIGJ1Z2d5ICAgICAgPSBbXCJ0b1N0cmluZ1wiLCBcInZhbHVlT2ZcIl1cclxuXHJcbnZhciB2ZXJicyA9IC9eY29uc3RydWN0b3J8aW5oZXJpdHN8bWl4aW4kL1xyXG5cclxudmFyIGltcGxlbWVudCA9IGZ1bmN0aW9uKHByb3RvKXtcclxuICAgIHZhciBwcm90b3R5cGUgPSB0aGlzLnByb3RvdHlwZVxyXG5cclxuICAgIGZvciAodmFyIGtleSBpbiBwcm90byl7XHJcbiAgICAgICAgaWYgKGtleS5tYXRjaCh2ZXJicykpIGNvbnRpbnVlXHJcbiAgICAgICAgaWYgKGhhc0Rlc2NyaXB0b3JzKXtcclxuICAgICAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHByb3RvLCBrZXkpXHJcbiAgICAgICAgICAgIGlmIChkZXNjcmlwdG9yKXtcclxuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90b3R5cGUsIGtleSwgZGVzY3JpcHRvcilcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdG90eXBlW2tleV0gPSBwcm90b1trZXldXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGhhc0VudW1CdWcpIGZvciAodmFyIGkgPSAwOyAoa2V5ID0gYnVnZ3lbaV0pOyBpKyspe1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IHByb3RvW2tleV1cclxuICAgICAgICBpZiAodmFsdWUgIT09IE9iamVjdC5wcm90b3R5cGVba2V5XSkgcHJvdG90eXBlW2tleV0gPSB2YWx1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzXHJcbn1cclxuXHJcbnZhciBwcmltZSA9IGZ1bmN0aW9uKHByb3RvKXtcclxuXHJcbiAgICBpZiAoa2luZE9mKHByb3RvKSA9PT0gXCJGdW5jdGlvblwiKSBwcm90byA9IHtjb25zdHJ1Y3RvcjogcHJvdG99XHJcblxyXG4gICAgdmFyIHN1cGVycHJpbWUgPSBwcm90by5pbmhlcml0c1xyXG5cclxuICAgIC8vIGlmIG91ciBuaWNlIHByb3RvIG9iamVjdCBoYXMgbm8gb3duIGNvbnN0cnVjdG9yIHByb3BlcnR5XHJcbiAgICAvLyB0aGVuIHdlIHByb2NlZWQgdXNpbmcgYSBnaG9zdGluZyBjb25zdHJ1Y3RvciB0aGF0IGFsbCBpdCBkb2VzIGlzXHJcbiAgICAvLyBjYWxsIHRoZSBwYXJlbnQncyBjb25zdHJ1Y3RvciBpZiBpdCBoYXMgYSBzdXBlcnByaW1lLCBlbHNlIGFuIGVtcHR5IGNvbnN0cnVjdG9yXHJcbiAgICAvLyBwcm90by5jb25zdHJ1Y3RvciBiZWNvbWVzIHRoZSBlZmZlY3RpdmUgY29uc3RydWN0b3JcclxuICAgIHZhciBjb25zdHJ1Y3RvciA9IChoYXNPd24ocHJvdG8sIFwiY29uc3RydWN0b3JcIikpID8gcHJvdG8uY29uc3RydWN0b3IgOiAoc3VwZXJwcmltZSkgPyBmdW5jdGlvbigpe1xyXG4gICAgICAgIHJldHVybiBzdXBlcnByaW1lLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcclxuICAgIH0gOiBmdW5jdGlvbigpe31cclxuXHJcbiAgICBpZiAoc3VwZXJwcmltZSl7XHJcblxyXG4gICAgICAgIG1peEluKGNvbnN0cnVjdG9yLCBzdXBlcnByaW1lKVxyXG5cclxuICAgICAgICB2YXIgc3VwZXJwcm90byA9IHN1cGVycHJpbWUucHJvdG90eXBlXHJcbiAgICAgICAgLy8gaW5oZXJpdCBmcm9tIHN1cGVycHJpbWVcclxuICAgICAgICB2YXIgY3Byb3RvID0gY29uc3RydWN0b3IucHJvdG90eXBlID0gY3JlYXRlKHN1cGVycHJvdG8pXHJcblxyXG4gICAgICAgIC8vIHNldHRpbmcgY29uc3RydWN0b3IucGFyZW50IHRvIHN1cGVycHJpbWUucHJvdG90eXBlXHJcbiAgICAgICAgLy8gYmVjYXVzZSBpdCdzIHRoZSBzaG9ydGVzdCBwb3NzaWJsZSBhYnNvbHV0ZSByZWZlcmVuY2VcclxuICAgICAgICBjb25zdHJ1Y3Rvci5wYXJlbnQgPSBzdXBlcnByb3RvXHJcbiAgICAgICAgY3Byb3RvLmNvbnN0cnVjdG9yID0gY29uc3RydWN0b3JcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIWNvbnN0cnVjdG9yLmltcGxlbWVudCkgY29uc3RydWN0b3IuaW1wbGVtZW50ID0gaW1wbGVtZW50XHJcblxyXG4gICAgdmFyIG1peGlucyA9IHByb3RvLm1peGluXHJcbiAgICBpZiAobWl4aW5zKXtcclxuICAgICAgICBpZiAoa2luZE9mKG1peGlucykgIT09IFwiQXJyYXlcIikgbWl4aW5zID0gW21peGluc11cclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1peGlucy5sZW5ndGg7IGkrKykgY29uc3RydWN0b3IuaW1wbGVtZW50KGNyZWF0ZShtaXhpbnNbaV0ucHJvdG90eXBlKSlcclxuICAgIH1cclxuXHJcbiAgICAvLyBpbXBsZW1lbnQgcHJvdG8gYW5kIHJldHVybiBjb25zdHJ1Y3RvclxyXG4gICAgcmV0dXJuIGNvbnN0cnVjdG9yLmltcGxlbWVudChwcm90bylcclxuXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gcHJpbWVcclxuIiwiLypcclxuTWFwXHJcbiovXCJ1c2Ugc3RyaWN0XCJcclxuXHJcbnZhciBpbmRleE9mID0gcmVxdWlyZShcIm1vdXQvYXJyYXkvaW5kZXhPZlwiKVxyXG5cclxudmFyIHByaW1lID0gcmVxdWlyZShcIi4vaW5kZXhcIilcclxuXHJcbnZhciBNYXAgPSBwcmltZSh7XHJcblxyXG4gICAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIE1hcCgpe1xyXG4gICAgICAgIHRoaXMubGVuZ3RoID0gMFxyXG4gICAgICAgIHRoaXMuX3ZhbHVlcyA9IFtdXHJcbiAgICAgICAgdGhpcy5fa2V5cyA9IFtdXHJcbiAgICB9LFxyXG5cclxuICAgIHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSl7XHJcbiAgICAgICAgdmFyIGluZGV4ID0gaW5kZXhPZih0aGlzLl9rZXlzLCBrZXkpXHJcblxyXG4gICAgICAgIGlmIChpbmRleCA9PT0gLTEpe1xyXG4gICAgICAgICAgICB0aGlzLl9rZXlzLnB1c2goa2V5KVxyXG4gICAgICAgICAgICB0aGlzLl92YWx1ZXMucHVzaCh2YWx1ZSlcclxuICAgICAgICAgICAgdGhpcy5sZW5ndGgrK1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3ZhbHVlc1tpbmRleF0gPSB2YWx1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH0sXHJcblxyXG4gICAgZ2V0OiBmdW5jdGlvbihrZXkpe1xyXG4gICAgICAgIHZhciBpbmRleCA9IGluZGV4T2YodGhpcy5fa2V5cywga2V5KVxyXG4gICAgICAgIHJldHVybiAoaW5kZXggPT09IC0xKSA/IG51bGwgOiB0aGlzLl92YWx1ZXNbaW5kZXhdXHJcbiAgICB9LFxyXG5cclxuICAgIGNvdW50OiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aFxyXG4gICAgfSxcclxuXHJcbiAgICBmb3JFYWNoOiBmdW5jdGlvbihtZXRob2QsIGNvbnRleHQpe1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5sZW5ndGg7IGkgPCBsOyBpKyspe1xyXG4gICAgICAgICAgICBpZiAobWV0aG9kLmNhbGwoY29udGV4dCwgdGhpcy5fdmFsdWVzW2ldLCB0aGlzLl9rZXlzW2ldLCB0aGlzKSA9PT0gZmFsc2UpIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9LFxyXG5cclxuICAgIG1hcDogZnVuY3Rpb24obWV0aG9kLCBjb250ZXh0KXtcclxuICAgICAgICB2YXIgcmVzdWx0cyA9IG5ldyBNYXBcclxuICAgICAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIGtleSl7XHJcbiAgICAgICAgICAgIHJlc3VsdHMuc2V0KGtleSwgbWV0aG9kLmNhbGwoY29udGV4dCwgdmFsdWUsIGtleSwgdGhpcykpXHJcbiAgICAgICAgfSwgdGhpcylcclxuICAgICAgICByZXR1cm4gcmVzdWx0c1xyXG4gICAgfSxcclxuXHJcbiAgICBmaWx0ZXI6IGZ1bmN0aW9uKG1ldGhvZCwgY29udGV4dCl7XHJcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBuZXcgTWFwXHJcbiAgICAgICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBrZXkpe1xyXG4gICAgICAgICAgICBpZiAobWV0aG9kLmNhbGwoY29udGV4dCwgdmFsdWUsIGtleSwgdGhpcykpIHJlc3VsdHMuc2V0KGtleSwgdmFsdWUpXHJcbiAgICAgICAgfSwgdGhpcylcclxuICAgICAgICByZXR1cm4gcmVzdWx0c1xyXG4gICAgfSxcclxuXHJcbiAgICBldmVyeTogZnVuY3Rpb24obWV0aG9kLCBjb250ZXh0KXtcclxuICAgICAgICB2YXIgZXZlcnkgPSB0cnVlXHJcbiAgICAgICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBrZXkpe1xyXG4gICAgICAgICAgICBpZiAoIW1ldGhvZC5jYWxsKGNvbnRleHQsIHZhbHVlLCBrZXksIHRoaXMpKSByZXR1cm4gKGV2ZXJ5ID0gZmFsc2UpXHJcbiAgICAgICAgfSwgdGhpcylcclxuICAgICAgICByZXR1cm4gZXZlcnlcclxuICAgIH0sXHJcblxyXG4gICAgc29tZTogZnVuY3Rpb24obWV0aG9kLCBjb250ZXh0KXtcclxuICAgICAgICB2YXIgc29tZSA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBrZXkpe1xyXG4gICAgICAgICAgICBpZiAobWV0aG9kLmNhbGwoY29udGV4dCwgdmFsdWUsIGtleSwgdGhpcykpIHJldHVybiAhKHNvbWUgPSB0cnVlKVxyXG4gICAgICAgIH0sIHRoaXMpXHJcbiAgICAgICAgcmV0dXJuIHNvbWVcclxuICAgIH0sXHJcblxyXG4gICAgaW5kZXhPZjogZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgICAgIHZhciBpbmRleCA9IGluZGV4T2YodGhpcy5fdmFsdWVzLCB2YWx1ZSlcclxuICAgICAgICByZXR1cm4gKGluZGV4ID4gLTEpID8gdGhpcy5fa2V5c1tpbmRleF0gOiBudWxsXHJcbiAgICB9LFxyXG5cclxuICAgIHJlbW92ZTogZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgICAgIHZhciBpbmRleCA9IGluZGV4T2YodGhpcy5fdmFsdWVzLCB2YWx1ZSlcclxuXHJcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSl7XHJcbiAgICAgICAgICAgIHRoaXMuX3ZhbHVlcy5zcGxpY2UoaW5kZXgsIDEpXHJcbiAgICAgICAgICAgIHRoaXMubGVuZ3RoLS1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2tleXMuc3BsaWNlKGluZGV4LCAxKVswXVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGxcclxuICAgIH0sXHJcblxyXG4gICAgdW5zZXQ6IGZ1bmN0aW9uKGtleSl7XHJcbiAgICAgICAgdmFyIGluZGV4ID0gaW5kZXhPZih0aGlzLl9rZXlzLCBrZXkpXHJcblxyXG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpe1xyXG4gICAgICAgICAgICB0aGlzLl9rZXlzLnNwbGljZShpbmRleCwgMSlcclxuICAgICAgICAgICAgdGhpcy5sZW5ndGgtLVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVzLnNwbGljZShpbmRleCwgMSlbMF1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudWxsXHJcbiAgICB9LFxyXG5cclxuICAgIGtleXM6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2tleXMuc2xpY2UoKVxyXG4gICAgfSxcclxuXHJcbiAgICB2YWx1ZXM6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlcy5zbGljZSgpXHJcbiAgICB9XHJcblxyXG59KVxyXG5cclxudmFyIG1hcCA9IGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gbmV3IE1hcFxyXG59XHJcblxyXG5tYXAucHJvdG90eXBlID0gTWFwLnByb3RvdHlwZVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBtYXBcclxuIiwiXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCB0aW1lIGluIG1pbGlzZWNvbmRzXG4gICAgICovXG4gICAgZnVuY3Rpb24gbm93KCl7XG4gICAgICAgIC8vIHllcywgd2UgZGVmZXIgdGhlIHdvcmsgdG8gYW5vdGhlciBmdW5jdGlvbiB0byBhbGxvdyBtb2NraW5nIGl0XG4gICAgICAgIC8vIGR1cmluZyB0aGUgdGVzdHNcbiAgICAgICAgcmV0dXJuIG5vdy5nZXQoKTtcbiAgICB9XG5cbiAgICBub3cuZ2V0ID0gKHR5cGVvZiBEYXRlLm5vdyA9PT0gJ2Z1bmN0aW9uJyk/IERhdGUubm93IDogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICsobmV3IERhdGUoKSk7XG4gICAgfTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0gbm93O1xuXG5cbiIsIlxudmFyIHByaW1lID0gcmVxdWlyZSgncHJpbWUnKSxcblx0cmVhZHkgPSByZXF1aXJlKCdlbGVtZW50cy9kb21yZWFkeScpO1xuXG52YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vLi4vbGliL2NvbXBvbmVudC5qcycpO1xudmFyIENvbnRhaW5lciA9IHJlcXVpcmUoJy4uLy4uL2xpYi9jb250YWluZXIuanMnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuLi8uLi9saWIvbGF5b3V0L2xheW91dC5qcycpO1xudmFyIEJ1dHRvbiA9IHJlcXVpcmUoJy4uLy4uL2xpYi9jb250cm9sL2J1dHRvbi5qcycpO1xuXG5yZWFkeShmdW5jdGlvbigpIHtcblx0Y29uc29sZS5sb2coJ3JlYWR5JywgZG9jdW1lbnQuYm9keSk7XG5cblx0dmFyIGxheW91dCA9IG5ldyBMYXlvdXQoe1xuXHRcdGNvbnRhaW5lcjogZG9jdW1lbnQuYm9keVxuXHR9KTtcblxuXHR2YXIgY29tcG9uZW50ID0gbmV3IENvbXBvbmVudCgpLmluamVjdChkb2N1bWVudC5ib2R5KTtcblx0dmFyIGJ1dHRvbiA9IG5ldyBCdXR0b24oe1xuXHRcdHR5cGU6ICdhY3Rpb24nLFxuXHRcdGtsYXNzOiAnaXMtcHJpbWFyeSdcblx0fSkuaW5qZWN0KGRvY3VtZW50LmJvZHkpO1xuXG5cdHZhciBjb250YWluZXIgPSBuZXcgQ29udGFpbmVyKCkuaW5qZWN0KGRvY3VtZW50LmJvZHkpO1xufSk7XG4iXX0=
