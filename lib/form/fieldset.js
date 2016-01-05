'use strict';

var Component = require('../component');

/**
 * Module fieldset
 * @module form/fieldset
 */
var fieldset = {

	/**
	 * Initialize form fieldset
	 * @return {void}
	 */
	_initFieldset(fieldset, form) {
		var legend = null;

		var component = new Component({
			'class': 'form-fieldset',
		}).insert(form);

		if (fieldset.name)
			component.addClass('fieldset-'+ fieldset.name);

		if (fieldset.klss)
			component.addClass(fieldset.klss);

		if (fieldset.state === 'closed')
			component.addClass('closed');

		if (fieldset.text) {
			legend = new Component({
				'class': 'fieldset-legend',
				
			}).insert(component);

			legend.text(fieldset.text);
			legend.attribute('data-name', fieldset.text);

			var caret = new Component({
				'class': 'icon-font mdi_navigation_chevron_right'
			}).insert(legend, 'top');
		}

		if (fieldset.buttons) {
			this._initButtons(fieldset.buttons, this.doc, legend);
		}

		// if (legend)
		// 	element.store('legend', legend);

		// if (typeOf(fieldset.menu) == 'object') {
		// 	this._initFieldsetMenu(fieldset.menu, legend);
		// } else if (typeOf(fieldset.menu) == 'array') {
		// 	for (var i = 0; i < fieldset.menu.length; i++) {
		// 		var menu = fieldset.menu[i];
		// 		this._initFieldsetMenu(menu, legend);
		// 	}
		// }

		if (fieldset.field) {
			this._initObjectField(fieldset.field, component);
		} else if (fieldset.fields) {
			this._initFields(fieldset.fields, component);
		}
	}

	// /**
	//  * Initialize form fieldset menu if exists
	//  * @return {void}
	//  */
	// _initFieldsetMenu(menu, legend) {
	// 	var self = this;

	// 	var addBtn = new ButtonControl(menu)
	// 	.insert(legend);

	// 	addBtn.on(menu.emit, function(){
	// 		self.fireEvent(menu.emit, self);
	// 	});


	// }

};

module.exports = fieldset;


