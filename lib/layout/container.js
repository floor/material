'use strict';

var Container = require('../container');

var container = {

	/**
	 * Instanciate the given object comp
	 * @param  {Object} comp list component
	 * @return {component} 
	 */
	_initContainer(comp) {

		comp.opts = comp.opts || {};

		// shortcuts
		comp.opts.flex = comp.opts.flex || comp.flex;
		comp.opts.hide = comp.opts.hide || comp.hide;
		comp.opts.theme = comp.opts.theme || comp.theme;

		var name = comp.opts.name || 'main';
		//var clss = api.strToClss(comp.clss);

		//comp.opts.container = comp.container;
		var component = this[name] = new Container(comp.opts);

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
	_initComponentSettings(component) {

		//var name = component.getName();
		//var element = component.element;
	},

	/**
	 * [_initComponentSettings description]
	 * @param  {component} component [description]
	 */
	_setComponentStyles(component) {

		if (component.options.flex) {
			//component.style('flex', component.options.flex);
			component.element.addClass('flex-'+component.options.flex);
		}

		if (component.options.hide) {
			component.style('display', 'none');

		}

		if (component.options.theme) {
			component.element.addClass('theme' + '-' + component.options.theme);
		}
	},

	/**
	 * [_initSize description]
	 * @param  {component} component [description]
	 */
	_setComponentDisplay(component) {

		var display = 'normalized';

		var name = component.getName();
		var element = component.element;

		// if (this.settings[name] && this.settings[name].display) {
		// 	display = this.settings[name].display;
		// }

		component.setDisplay(display, 'width');

		if (!component.options.flex) return; 
			
		if (this.settings[name] && this.settings[name].width) {
			//style('flex', 'none');
			element.addClass('flex-none');
			if (display === 'minimized') {
			
				style('width', 0);
			} else {
				
				if (this.settings[name].width < 32)
					this.settings[name].width = 32;

				element.style('width', this.settings[name].width || 160);
			}

			component.width = this.settings[name].width || 200;
			component._modifier = 'width';
		} else if (this.settings[name] && this.settings[name].height) {
			element.style('flex', 'none');
			element.style('height', this.settings[name].height);
			component.height = this.settings[name].height || 160;
			component._modifier = 'height';
		}

		this._initResizer(component);
	},

	/**
	 * [_attachComponentEvents description]
	 * @param  {component} component [description]
	 */
	_attachComponentEvents(component) {
		var self = this;
		var name = component.getName();

		component.on('toggled', function() {
			self.emit('resize');
		}).on('resizing', function() {
			self.emit('resize');
		}).on('display', function(state) {
			self.emit('display', [name, state]);
		});

		this.on('resize', function() {
			component.emit('resize');
		}).on('drag:', function() {
			component.emit('resize');
		}).on('normalize', function() {
			component.emit('resize');
		}).on('maximize', function() {
			component.emit('resize');
		}).on('minimize', function() {
			component.emit('resize');
		});
	}
};

module.exports = container;
