'use strict';

import View from './view';
import defaults from './container/options';

import Component from './component';
import Field from './control/textfield';

import fieldset from './form/fieldset';

/**
 * Form class
 *
 * @class
 * @extends {Component}
 * @return {Class} This class instance
 */
class Form extends View {

	/**
	 * Initialize View
	 * @return {void}
	 */
	init(options) {
		//need to remove the options template to have a reference
		this.template = options.template;

		this.name = 'form';

		super.init(options);

		this.options = [ defaults, options ].reduce(Object.assign, {});

		if (this.options.template) {
			delete this.options.template;
		}

		// for backward compatibility
		this.info = this.info = {};

		Object.assign(this, fieldset);

		this.field = {};
	}

	/**
	 * [_initForm description]
	 * @return {Object} This class instance
	 */
	build() {
		super.build();

		this.form = new Component({
			tag: 'form'
			//method: 'post'
		}).insert(this.c.body.element);

		return this;
	}

	/**
	 * [_onSubmit description]
	 * @return {void}
	 */
	_onSubmit(e) {
		e.preventDefault();
	}

	/**
	 * Initialize Detail View
	 * @param  {Object} doc   Document
	 * @param  {Object} model
	 * @return {void}
	 */
	_setForm(doc, model, params) {
		params = params || {};

		var opts = this.options;

		if (this.control && this.control.what) {
			this.control.what.set('text', doc.type);
		}

		this.list = {};

		this.mask = opts.mask;
		this.type = this.options.type;

		// if (!params.top) {
		// 	this.form.styles(this.form.getSize());
		// }

		//this.form.empty();

		if (doc.status) {
			this.form.attribute('data-status', doc.status);
		}

		if (!doc) {
			return;
		}

		//this.readonly = this.readonly || opts.readOnly;

		this._initTemplate(doc, model);
	}

	/**
	 * Initialize form model
	 * @return {void}
	 */
	_initTemplate(doc, template) {

		var comps = {};
		var spec = {};
		var defs = {};

		template = template || this.template;

		if (!template && !template.components) {
			return false;
		}

		//clone the array
		comps = template.components.slice();
		defs = template;
		spec = template;

		this._processComponents(comps, spec, defs);

	}

	/**
	 * [_processComponents description]
	 * @param  {Array} comps [description]
	 * @param  {Object} spec  [description]
	 * @param  {Object} defs  [description]
	 */
	_processComponents(comps, spec, defs) {
		if (this.readonly === undefined && spec && spec._mode === 'readonly' || this.readonly || defs._mode === 'readonly') {
			this.readonly = true;
		} else {
			this.readonly = false;
		}

		for (var i = 0; i < comps.length; i++) {
			var component = comps[i];

			var group = spec[component] || defs[component];

			if (!group) {
				continue;
			}

			if (group.type === 'fieldset') {
				this._initFieldset(group, this.form);
			}
		}

		this.focuskey = defs.focus;
	}

	/**
	 * [_initFields description]
	 * @param  {Array} keys    [description]
	 * @param  {HTMLElement} element [description]
	 */
	_initFields(keys, element) {
		var info = this.info;

		var group = this._initGroup(element);

		for (var i = 0, len = keys.length; i < len; i++) {
			var key = keys[i];

			this._initField(key, info, group);

			// if (key.type === 'button' && key.name === 'deleteNode') {
			// 	this._initDeleteButton(key, doc, group);
			// }
		}
	}

	/**
	 * Process field object
	 * @param  {Object} object   [description]
	 * @param  {Element} element [description]
	 */
	_initObjectField(object, element) {
		var info = this.info;
		var list = object._list || [];

		var group = this._initGroup(element);

		for (var i = 0; i < list.length; i++) {
			var name = list[i];
			var key = object[name];

			this._initField(key, info, group);
		}
	}

	/**
	 * Instanciate group of field
	 * @param  {Element} element
	 * @return {Element} the group element
	 */
	_initGroup(element) {

		var group = new Component({
			tag: 'div',
			class: 'group'
		}).insert(element);

		group.text(element.legend);

		return group;
	}

	/**
	 * Initialize Field for the given key according the data and the model
	 * @param  {string} key   [description]
	 * @param  {Object} info  [description]
	 * @param  {string} group [description]
	 */
	_initField(key, info, group) {

		key = key || {};

		var type = key.type;
		var method;

		type = type || 'Input';

		// if (typeof type === 'string') {
		// 	method = pascalCase(type);
		// }

		if (this['_init' + method]) {
			this['_init' + method](key, info, group);
		} else {
			this._initInput(key, info, group);
		}
	}

	/**
	 * Initialize input
	 * @param  {key} key [description]
	 * @param  {Object} info
	 * @param  {Element} group
	 * @return {void}
	 */
	_initInput(key, info, group) {
		key = key || {};
		key.name = key.name || '';

		//var n = key.name.split(/\./);

		var value = this.getValueFromKey(key.name, info);

		if (!value && key.default) {
			value = key.default;
			this.updateDocKey(key.name, key.default);
		}

		if (typeof value === 'object') {
			value = JSON.stringify(value);
			value = value.replace(/[&\/\\"{}\[\]]/g, '');
			value = value.replace(/[,]/g, ', ');
			value = value.replace(/[:]/g, ': ');
		}

		var _name = key.name.replace('.', '-');

		var type = key.type || 'text';

		var input = new Field({
			css: 'field-' + _name,
			type: type,
			name: key.name,
			label: key.name,
			text: key.text,
			value: value,
			error: true
		}).insert(group);

		if (key.kind) {
			input.addClass('kind-' + key.kind);
		}


		this.field[key.name] = input;

		if (key.klss) {
			input.addClass(key.klss);
		}

		input.input.on('keyup', function() {
			//self._onInputKeyUp(input, ev);
		});

		input.input.on('blur', function() {
			//self._onInputBlur(input);
		});
	}

	/**
	 * Update this.info for the given key name (three levels)
	 * @param  {string} name The name of the key in dot notation
	 * @param  {Mixin} value The related key value
	 * @return {Mixin} Value
	 */
	updateDocKey(name, value) {
		var keys = name.split(/\./);

		if (keys.length === 1) {
			this.info[keys[0]] = value;
		}

		if (keys.length === 2) {
			if (!this.info[keys[0]]) {
				this.info[keys[0]] = {};
			}

			this.info[keys[0]][keys[1]] = value;
		}
		if (keys.length === 3) {
			if (!this.info[keys[0]]) {
				this.info[keys[0]] = {};
			}
			if (!this.info[keys[0]][keys[1]]) {
				this.info[keys[0]][keys[1]] = {};
			}

			this.info[keys[0]][keys[1]][keys[2]] = value;
		}

		if (keys.length === 4) {
			if (!this.info[keys[0]]) {
				this.info[keys[0]] = {};
			}
			if (!this.info[keys[0]][keys[1]]) {
				this.info[keys[0]][keys[1]] = {};
			}
			if (!this.info[keys[0]][keys[1]][keys[2]]) {
				this.info[keys[0]][keys[1]][keys[2]] = {};
			}

			this.info[keys[0]][keys[1]][keys[2]][keys[3]] = value;
		}

		return value;
	}

	/**
	 * Get Value for the given key
	 * @param  {string} name defined in dot notation
	 * @param  {Object} info
	 * @return {Mixin} The Value of the given key
	 */
	getValueFromKey(name, info) {
		var keys = name.split(/\./);
		var value = null;

		if (!name || !info) {
			return;
		}

		if (keys.length === 1) {
			value = info[keys[0]];
		}
		if (keys.length === 2 && info[keys[0]]) {
			if (info[keys[0]]) {
				value = info[keys[0]][keys[1]];
			}
		}
		if (keys.length === 3) {
			if (info[keys[0]]) {
				if (info[keys[0]][keys[1]]) {
					value = info[keys[0]][keys[1]][keys[2]];
				}
			}
		}

		return value;
	}

	/**
	 * Getter
	 *
	 * @param {string} prop
	 * @param {string} value
	 * @return {Object|void}
	 */
	get(prop, value) {
		switch (prop) {
			case 'key':
				return this.getValueFromKey(value, this.info);
			case 'info':
				return this.getInfo();
			case 'unsaved':
				return this.original;
			case 'type':
				return this.type;
			case 'options':
				return this.options;
			default: //default will replace the old method see up
				return this.getValueFromKey(prop, this.info);
				/*case 'model':
					return this.getSelectedModel();*/
		}
	}

	/**
	 * [add description]
	 * @param {string} type
	 */
	addIndo() {

		this._setInfo({
			type: this.options.type
		});
	}

	/**
	 * Set Detail view with the given information and model
	 * @param {Object} doc   [description]
	 * @param {Object} opts [description]
	 */
	setInfo(doc, opts) {

		opts = opts || {};

		if (this.mode === 'edit') {
			return;
		}

		if (!doc && !opts.mask) {
			this.clear();
			return;
		}

		this.original = doc;
		this.originalMask = opts.mask;

		//this.destroyCkeInstance();

		//In test for real time editing
		if (this.info) {
			this.emit('unset', [this.info._id, this]);
		}

		if (this.control && this.control.add && doc && doc._id) {
			this.control.add.setState(null);
		}

		this.readonly = undefined;

		if (opts.readonly !== undefined) {
			this.readonly = opts.readonly;
		}

		this._setInfo(doc, opts.mask);

		var id = null;
		if (doc) {
			id = doc._id;
		}
		this.emit('set', [id, this]);
		this.emit('settings', ['infoId', id]);

		//mnml.view.ctrl.focus(this);
	}

	/**
	 * Set Detail view with the given information and model
	 * @param {Object} doc   [description]
	 * @param {Object} mask [description]
	 * @param {Object} opts [description]
	 */
	_setInfo(doc, mask, opts) {

		if (this.form) {
			this.form.style('display', 'block');
		}

		var name = doc.name || doc.title;

		if (this.control && this.control.title) {
			this.control.title.text(name);
		}

		/*if (this.options.container)
			this.options.container.focus();*/

		this.info = null;
		this.info = doc; // Object.clone(doc);
		this.relatedListEvents = false;

		this._setForm(this.info, mask, opts);


		// if (this.container) {
		// 	this.container.emit('resize');
		// }
	}

	/**
	 * Set view accorrding the given mode
	 * @param {string} mode edit or not
	 */
	setMode(mode) {
		this.emit('mode', [this, mode]);

		this.mode = mode;
	}

	/**
	 * [getType description]
	 * @return {string} [description]
	 */
	getType() {
		return this.type;
	}

	/**
	 * [getInfo description]
	 * @return {Object} [description]
	 */
	getInfo() {
		return this.info || null;
	}
}

module.exports = Form;
