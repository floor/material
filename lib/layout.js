'use strict';

var Container = require('./container');

var container = require('./layout/container');
var resizer = require('./layout/resizer');

var defaults = require('./layout/options');

var	_log = __debug('material:layout');
//	_log.defineLevel('DEBUG');

/**
 * Creates an Layout
 * @class
 */
class Layout extends Container {

	/**
	 * [constructor description]
	 * @param  {[type]} options [description]
	 * @return {[type]}         [description]
	 */
	constructor(options){
		super(options);

		this.init(options);
		this.build();

		return this;
	}

	init(options) {
		super.init(options);
		this.name = 'layout',
		// merge options
		this.options = [ defaults, options ].reduce(Object.assign, {});

		// implement object
		Object.assign(this, container);
		Object.assign(this, resizer);

		return this;
	}

	/**
	 * [_initLayout description]
	 * @return {Object} [description]
	 */
	build(options) {
		//_log.debug('initialize', opts);
		super.build(options);

		var opts = this.options;

		this.addClass('ui-layout');
		this.addClass('layout-standard');
		this.addClass('ui-container');

		if (opts.node && opts.node._node)
			this.addClass('layout-' + opts.node._name);

		if (this.options.theme)
			this.addClass('theme-' + this.options.theme);

		var node = opts.node;
		this.settings = opts.settings || {};
		// this.component = {};
		// this.components = [];
		this.resizer = {};

		node.container = this.c.body;

		this.render(node);
		// 
		return this;
	}

	/**
	 * [_process description]
	 * @param  {[type]} mnml [description]
	 * @return {[type]}      [description]
	 */
	render(node, type, level) {
		_log.debug('render', node, type, level || 1);
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
				_log.debug('last--', name);
				comp.opts.last = true;
			}

			if (type !== 'tab') {
				comp.opts.container = node.container;
			}

			var component = this._initContainer(comp);

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
	}

	/**
	 * [_initFlexDirection description]
	 * @param  {[type]} container [description]
	 * @param  {[type]} axis      [description]
	 * @return {[type]}           [description]
	 */
	_initFlexDirection(container, axis) {
		//console.log('_initFlexDirection', container, axis);

		if (!container) return;

		axis = axis || 'x';

		if (axis === 'x') {
			container.addClass('flex-raw');
		} else if (axis === 'y') {
			container.addClass('flex-column');
		}
	}
}

module.exports = Layout;
