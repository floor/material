'use strict';

var Emmitter = require('../module/emitter');
var Container = require('../container');

var container = {

	/**
	 * Instanciate the given object comp
	 * @param  {Object} comp list component
	 * @return {component}
	 */
	_initContainer(comp) {
		var options = comp.opts || {};

		// shortcuts
		options.flex = options.flex || comp.flex;
		options.hide = options.hide || comp.hide;
		options.theme = options.theme || comp.theme;

		var name = options.name || 'main';

		//options.container = comp.container;
		var component = this[name] = new Container(options);

		// register component
		this._componentRegister(name, component);

		//settings
		//this._initComponentSettings(component);

		// style, size and event
		this._setComponentStyles(component);
		this._setComponentDisplay(component);
		this._attachComponentEvents(component);

		return component;
	},

	/**
	 * [_componentRegister description]
	 * @param  {string} name      [description]
	 * @param  {component} component [description]
	 */
	_componentRegister(name, component) {

		this.components = this.components || [];
		this.components.push(component);
	},

	/**
	 * [_initComponentSettings description]
	 * @param  {component} component [description]
	 */
	// _initComponentSettings(component) {
	//
	// 	var name = component.getName();
	// 	var element = component.element;
	// },

	/**
	 * [_initComponentSettings description]
	 * @param  {component} component [description]
	 */
	_setComponentStyles(component) {

		if (component.options.flex) {
			component.addClass('flex-'+component.options.flex);
		}

		if (component.options.hide) {
			component.style('display', 'none');
		}

		if (component.options.theme) {
			component.addClass('theme' + '-' + component.options.theme);
		}
	},

	/**
	 * [_initSize description]
	 * @param  {component} component [description]
	 */
	_setComponentDisplay(component) {
		var display = 'normalized';

		// var name = component.getName();
		// if (this.settings[name] && this.settings[name].display) {
		// 	display = this.settings[name].display;
		// }

		component.setDisplay(display, 'width');

		if (component.options.flex) return;

		this._initResizer(component);
		this.emit('drag');
	},

	/**
	 * _setComponentSettings description
	 * @param {Object} component Component object
	 */
	// _setComponentSettings(component) {
	// 	var display = 'normalized';

	// 	var name = component.getName();
	// 	var element = component.element;

	// 	if (component.options.flex) {

	// 		if (this.settings[name] && this.settings[name].width) {
	// 			//style('flex', 'none');
	// 			element.addClass('flex-none');
	// 			if (display === 'minimized') {

	// 				style('width', 0);
	// 			} else {

	// 				if (this.settings[name].width < 32)
	// 					this.settings[name].width = 32;

	// 				element.style('width', this.settings[name].width || 160);
	// 			}

	// 			component.width = this.settings[name].width || 200;
	// 			component._modifier = 'width';
	// 		} else if (this.settings[name] && this.settings[name].height) {
	// 			element.style('flex', 'none');
	// 			element.style('height', this.settings[name].height);
	// 			component.height = this.settings[name].height || 160;
	// 			component._modifier = 'height';
	// 		}
	// 	}
	// },

	/**
	 * [_attachComponentEvents description]
	 * @param  {component} component [description]
	 */
	_attachComponentEvents(component) {
		var name = component.getName();

		/**
		 * 	toggled
		 */
		component.on('toggled', () => {
			this.emit('resize');
		}).on('resizing', () => {
			this.emit('resize');
		}).on('display', (state) => {
			this.emit('resize');
			this.emit('display', [name, state]);
		});

		this.on('resize', () => {
			component.emit('resize');
		}).on('drag:', () => {
			component.emit('resize');
		}).on('normalize', () => {
			component.emit('resize');
		}).on('maximize', () => {
			component.emit('resize');
		}).on('minimize', () => {
			component.emit('resize');
		});
	}
};

module.exports = container;
