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
