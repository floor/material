'use strict';

import Container from './container';

import container from './layout/container';
import resizer from './layout/resizer';

import defaults from './layout/options';

/**
 * The Layout view
 * @class
 */
class Layout extends Container {

	/**
	 * initiate class
	 * @param  {Object} options The class options
	 * @return {Object} The class instance
	 */
	init(options) {
		super.init(options);
		this.name = 'layout',
		// merge options
		this.options = [ defaults, options ].reduce(Object.assign, {});
		this.window = window;

		Object.assign(this, container, resizer);

		window.addEventListener('resize', () => {
			console.log('---');
			this.emit('resize');
		});

		return this;
	}

	/**
	 * Build
	 * @return {Object} [description]
	 */
	build(options) {
		super.build(options);

		var opts = this.options;

		this.addClass('ui-layout');
		this.addClass('layout-standard');

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

		return this;
	}

	/**
	 * [_process description]
	 * @param  {Object} node Layout structure
	 * @return {string} type type of node e. tab
	 */
	render(node, type, level) {
		var list = node._list || [];
			level = level++ || 1;

		if (type !== 'tab') {
			this._initFlexDirection(node.container, node._axis);
		}

		for (var i = 0, len = list.length; i < len; i++) {
			var name = list[i];
			var comp = node[name] || {};

			comp.clss = comp.clss || this.options.clss;
			comp.opts = comp.opts || {};
			comp.opts.name = name;
			comp.opts.position = i + 1;
			comp.opts.nComp = list.length;

			if (i === list.length - 1) {
				comp.opts.last = true;
			}

			if (type !== 'tab') {
				comp.opts.container = node.container;
			}

			var component = this._initContainer(comp);

			if (type === 'tab') {
				component.options.noResizer = true;
				node.container.addTab(component);
			}

			component.addClass('container-'+name);

			if (comp.node) {
				comp.node.container = component;

				if (component.options.clss === 'tab') {
					this.render(comp.node, 'tab', level);
				} else {
					this.render(comp.node, null, level);
				}
			}
		}
	}

	_resize(){
		console.log('resize');
	}

	/**
	 * [_initFlexDirection description]
	 * @param  {Element} container Init direction for the given container
	 * @param  {string} axis (x,y)
	 */
	_initFlexDirection(container, axis) {
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
