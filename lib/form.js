
/**
 * Form class
 *
 * @class Form
 * @extends {Component}
 * @return {parent} prime object
 * @example (start code)	new Container(object); (end)
 * @author [moolego,r2d2]
 * @copyright © 1999-2015 - Jerome D. Vial. All Rights reserved.
 */'use strict'

var prime = require("prime/index");
var	View = require('./view');
var	Options = require('prime-util/prime/options');
var	Emitter = require("prime/emitter");
var  binding = require('./module/binding');

var	Component = require('./component');
var	Element = require('./element');
var	Field = require('./control/field');


var	merge = require("deepmerge"),
	pascalCase = require('mout/string/pascalCase');

var	fieldset = require('./form/fieldset');

var _log = __debug('material:view-form');
//	_log.defineLevel('DEBUG');

var Form = new prime({

	inherits: View,

	mixin: [Options, Emitter, fieldset],

	name: 'form',

	options: {
		name: 'form',
		lib: 'ui',
		base: 'view',
		prefix: 'ui-',


		binding: {
			'set': ['_focusPrimaryKey', '_hideToolbarDialog'],
			'mode': '_setClassMode',
			'trash': '_viewDidTrash',
			'infoview': '_viewDidInfoView',
			'infoedit': '_viewDidInfoEdit',
			'dataReady': '_set',
			'apply': 'apply',
			'cancel': 'cancel',
			'change': '_viewDidChange',
			'submit': ['_onSubmit']
		}
	},

	/**
	 * [constructor description]
	 * @param  {[type]} options [description]
	 * @return {[type]}         [description]
	 */
	constructor: function(options) {
		this.template = options.template;

		this.options = merge(Form.parent.options, this.options);	
		this.setOptions(options);

		_log.debug(this.options);

		this.init();
		this.build();

		return this;
	},

	/**
	 * Initialize View
	 * @return {void}
	 */
	init: function() {
		//_log.debug('_initView');
		//need to remove the options template to have a reference
		if (this.options.template) {
			delete this.options.template;
		}

		// for backward compatibility
		this.info = this.info = {};

		Form.parent.init.call(this);

		this.isFirst = 0;

		this.field = {};

		var opts = this.options;

	},

	/**
	 * [_initForm description]
	 * @return {[type]} [description]
	 */
	build: function() {
		Form.parent.build.call(this);
		_log.debug('build', this.element);

		this.form = new Element('form', {
			//method: 'post'
		}).inject(this.c.body.element);

		return this.form;
	},

	/**
	 * [_onSubmit description]
	 * @return {void}
	 */
	_onSubmit: function(e) {
		//_log.debug('onSubmit', e);
		e.preventDefault();
	},

	/**
	 * Initialize Detail View
	 * @param  {Object} doc   Document
	 * @param  {Object} model
	 * @return {void}
	 */
	_setForm: function(doc, model, params) {
		params = params || {};
		//_log.debug('_setForm', doc, model, opts);
		//_log.debug('_setForm', this.readonly);

		var opts = this.options;

		if (this.control && this.control.what) {
			this.control.what.set('text', doc.type);
		}

		this.list = {};

		this.mask = opts.mask;
		this.type = this.options.type;

		//_log.debug('_initform');

		// if (!params.top) {
		// 	this.form.styles(this.form.getSize());
		// }

		//this.form.empty();

		if (doc.status) {
			this.form.attribute('data-status', doc.status);
		}

		//_log.debug('doc', doc);

		if (!doc) {
			return;
		}

		//this.readonly = this.readonly || opts.readOnly;

		this._initTemplate(doc, model);
		// this._initLegends();
		// this._initStatus();
	},


	/**
	 * Initialize status to display creatiion and modification information
	 * @return {void}
	 */
	_initStatus: function() {
		var doc = this.info;

		var created = moment(doc.created_date).format('lll');
		var modified = moment(doc.modified_date).format('lll');

		var status = doc.created_by + ' ' + created;

		if (doc.modified_by) {
			status = modified + ' by ' + doc.modified_by;
		}

		this.setStatus(status);
	},

	/**
	 * Initialize form model
	 * @return {void}
	 */
	_initTemplate: function(doc, template) {
		_log.debug('_initTemplate', doc, template);

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

	},

	/**
	 * [_processComponents description]
	 * @param  {[type]} comps [description]
	 * @param  {[type]} spec  [description]
	 * @param  {[type]} defs  [description]
	 * @return {[type]}       [description]
	 */
	_processComponents: function(comps, spec, defs) {
		_log.debug('_processComponents', comps, spec, defs);
		if (this.readonly === undefined && spec && spec._mode === 'readonly' || this.readonly || defs._mode === 'readonly') {
			this.readonly = true;
		} else {
			this.readonly = false;
		}

		//_log.debug('readonly', this.readonly);

		for (var i = 0; i < comps.length; i++) {
			var component = comps[i];

			_log.debug('process', component);
			var group = spec[component] || defs[component];

			if (!group) {
				continue;
			}

			if (group.type === 'fieldset') {
				this._initFieldset(group, this.form);
			}

			if (group.type === 'client') {
				this._initClient(group, this.form);
			}
		}

		this.focuskey = defs.focus;
	},

	/**
	 * [_initFields description]
	 * @param  {[type]} keys    [description]
	 * @param  {[type]} element [description]
	 * @return {[type]}         [description]
	 */
	_initFields: function(keys, element) {
		_log.debug('_initFields', keys, element);
		var info = this.info;

		var group = this._initGroup(element);

		for (var i = 0, len = keys.length; i < len; i++) {
			var key = keys[i];

			this._initField(key, info, group);

			if (key.type === 'button' && key.name === 'deleteNode') {
				this._initDeleteButton(key, doc, group);
			}
		}
	},

	/**
	 * Process field object
	 * @param  {[type]} object   [description]
	 * @param  {[type]} element [description]
	 * @return {[type]}         [description]
	 */
	_initObjectField: function(object, element) {
		// _log.debug('_initObjectField', object, element);
		var info = this.info;
		var list = object._list || [];

		var group = this._initGroup(element);

		for (var i = 0; i < list.length; i++) {
			var name = list[i];
			var key = object[name];

			this._initField(key, info, group);
		}
	},

	/**
	 * Instanciate group of field
	 * @param  {Element} element
	 * @return {Element} the group element
	 */
	_initGroup: function(element) {
		_log.debug('_initGroup', element);

		var group = new Element('div', {
			'class': 'group'
		}).inject(element);

		group.text(element.legend);

		return group;
	},

	/**
	 * Initialize Field for the given key according the data and the model
	 * @param  {string} key   [description]
	 * @param  {[type]} info  [description]
	 * @param  {[type]} group [description]
	 * @return {[type]}       [description]
	 */
	_initField: function(key, info, group) {
		_log.debug('_initField', key, info, group);

		key = key || {};

		var type = key.type;
		var method;

		type = type || 'input';

		if (typeof type === 'string') {
			method = pascalCase(type);
		}

		//_log.debug('initField', method, this['_init'+method]);

		if (this['_init' + method]) {
			this['_init' + method](key, info, group);
		} else {
			this._initInput(key, info, group);
		}
	},

	/**
	 * [_processToolbar description]
	 * @param  {[type]} toolbar [description]
	 * @return {[type]}         [description]
	 */
	_processToolbar: function(toolbar) {
		//_log.debug('_processToolbar', toolbar);

		if (!toolbar || !toolbar.opts) {
			return;
		}

		var disableds = toolbar.opts.disabled;
		var enableds = toolbar.opts.enabled;

		//_log.debug('disableds', disableds);
		//_log.debug('enableds', enableds);

		for (var i = 0; i < disableds.length; i++) {
			var c = disableds[i];
			if (this.control[c]) {
				this.control[c].setState('disabled');
			}
		}

		for (var i = 0; i < enableds.length; i++) {
			var c = enableds[i];
			if (this.control[c]) {
				this.control[c].setState('enabled');
			}
		}
	},

	/**
	 * [enableControl description]
	 * @param  {[type]} str [description]
	 * @return {[type]}     [description]
	 */
	enableControl: function(str) {
		var control = this.control[str];

		//_log.debug('enableControl', str, this.control);

		if (control) {
			control.setState('enabled');
		}
	},

	/**
	 * Initialize input
	 * @param  {key} key [description]
	 * @param  {Object} info
	 * @param  {Element} group
	 * @return {void}
	 */
	_initInput: function(key, info, group) {
		var self = this;

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

		var read = this.isReadOnly(key);

		var input = new Field({
			'klass': 'field-' + _name,
			type: type,
			name: key.name,
			label: key.name,
			text: key.text,
			value: value,
			read: read,
			error: true,
			useTextAsLabel: this.options.useTextAsLabel
		}).inject(group);

		if (key.kind) {
			input.addClass('kind-' + key.kind);
		}


		this.field[key.name] = input;

		if (key.klss) {
			input.addClass(key.klss);
		}

		input.input.on('keyup', function(ev) {
			self._onInputKeyUp(input, ev);
		});

		input.input.on('blur', function() {
			self._onInputBlur(input);
		});
	},

	/**
	 * [_onInputKeyUp description]
	 * @param  {[type]} input [description]
	 * @param  {[type]} ev    [description]
	 * @return {[type]}       [description]
	 */
	_onInputKeyUp: function(input, ev) {
		_log.debug('_onInputKeyUp');

		input.setError(null);
		input = input.input;

		if (!input.get('readonly')) {
			var name = input.get('name');
			var value = input.get('value');
			//_log.debug('---'+this.get('value')+'/'+self.doc[this.get('name')]+'-');
			if (value !== this.info[name]) {
				this.updateDocKey(name, value);
				this.emit('change', [name, value]);

				//In test for real time editing
				var pos = input.selectionStart;
				this.emit('keyChange', [this.info._id, name, ev.key, pos]);

				this.emit('update', name);
			}
		}
	},

	/**
	 * [_onInputBlur description]
	 * @param  {[type]} input [description]
	 * @return {[type]}       [description]
	 */
	_onInputBlur: function(input) {
		//_log.debug('_onInputBlur');

		input = input.input;

		//var name = input.get('name');
		var value = input.attribute('value');

		var ev = 'blur:' + this.get('name');

		if (ev.indexOf('.') !== -1) {
			ev = ev.split('.').join('-');
		}

		this.emit(ev, value);
	},

	/**
	 * Update this.info for the given key name (three levels)
	 * @param  {string} name The name of the key in dot notation
	 * @param  {Mixin} value The related key value
	 * @return {Mixin} Value
	 */
	updateDocKey: function(name, value) {
		var keys = name.split(/\./);
		//_log.debug('updateDocKey', keys, name, value);

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
	},

	/**
	 * Get Value for the given key
	 * @param  {string} name defined in dot notation
	 * @param  {Object} info
	 * @return {Mixin} The Value of the given key
	 */
	getValueFromKey: function(name, info) {
		var keys = name.split(/\./);
		var value = null;

		if (!name || !info) {
			return;
		}

		//_log.debug('getValueFromKey', name, info);

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
	},

	/**
	 * Get Value for the given key
	 * @deprecated
	 *
	 * @param  {string} name defined in dot notation
	 * @param  {Object} info
	 * @return {Mixin} The Value of the given key
	 */
	/*get: function(key) {
		return this.getValueFromKey(key, this.info);
	},*/

	/**
	 * Getter
	 *
	 * @param {string} prop
	 * @param {string} value
	 * @return {Object|void}
	 */
	get: function(prop, value) {
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
	},

	/**
	 * [add description]
	 * @param {string} type
	 */
	addIndo: function(type) {
		_log.debug('add', type);

		this._setInfo({
			type: this.options.type
		});
	},

	/**
	 * [_setReadonly description]
	 * @description NOT USED
	 * @param {[type]} val [description]
	 */
	_setReadonly: function(val) {
		_log.debug('_setReadonly', val);

		if (val) {
			this.readonly = true;
		} else {
			this.readonly = false;
		}
	},

	/**
	 * Set Detail view with the given information and model
	 * @param {Object} doc   [description]
	 * @param {Object} opts [description]
	 */
	setInfo: function(doc, opts) {
		//_log.debug('setInfo', doc, opts);

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

		//_log.debug('set');

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
	},

	/**
	 * Set Detail view with the given information and model
	 * @param {Object} doc   [description]
	 * @param {Object} mask [description]
	 * @param {Object} opts [description]
	 */
	_setInfo: function(doc, mask, opts) {
		//_log.debug('_set', doc, mask);

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


		if (this.container) {
			this.container.emit('resize');
		}
	},

	/**
	 * [_setMode description]
	 * @param {[type]} mode [description]
	 */
	_setMode: function(mode) {
		//_log.debug('setMode', mode);

		if (mode === 'read') {
			this.readonly = true;
			this._setInfo(this.info, this.originalMask);
		} else if (mode === 'edit') {
			this.setMode(mode);
		} else {
			this.setMode(mode);
		}
	},

	/**
	 * Method used to focus the primary fields
	 *
	 * @return {void}
	 */
	_focusPrimaryKey: function() {
		//_log.debug('_focusPrimaryField', this.focuskey);
		if (!this.info._id) {
			var focus = this.focuskey;
			var field = this.form.getElement('input[name=' + focus + ']');
			if (!field) {
				field = this.form.getElement('input[name="name"]');
			}
			if (field) {
				field.focus();
			}
		}
	},

	/**
	 * [update description]
	 * @param  {Object} info [description]
	 * @return {void}
	 */
	update: function(info) {
		//_log.debug('update', info);

		if (!info || !this.info) {
			return;
		}

		if (info._id === this.info._id) {

			//remove edit mode when update the current info
			//because it's not possible to setInfo in edit mode
			if (info._rev === this.info._rev) {
				this.mode = undefined;
			}

			this.setInfo(info, {
				top: false
			});
		} else if (!this.info._rev && this.info.type === info.type) {
			this.setInfo(info, {
				top: false
			});
		}
	},

	/**
	 * Set a specific key.
	 * @param {string} key   Object key
	 * @param {string} value Value to be set
	 * @param {boolean} quiet Don't fireEvent if true
	 */
	setKey: function(key, value, quiet) {
		//_log.debug('setKey', key, value);

		//var currentVal = this.getValueFromKey(key, this.info);
		//_log.debug('--', currentVal, value);
		/*if (currentVal === value) {
			return;
		}*/

		this.updateDocKey(key, value);

		if (typeOf(value) === 'object') {
			this.setKeyObject(key, value);
		}
		if (typeOf(value) === 'array') {
			this.setKeyArray(key, value);
		} else if (this.field[key]) {
			this.field[key].set(value);
		}

		if (!quiet) {
			this.emit('change', [key, value]);
		}
	},

	/**
	 * set sub keys if exist
	 * @param {string} key   Object key
	 * @param {Object} obj Value to be set
	 */
	setKeyObject: function(key, obj) {
		//_log.debug('setKey', key, obj);

		for (var sub in obj) {
			var name = key + '.' + sub;
			if (this.field[name]) {
				this.field[name].set(obj[sub]);
			}
		}
	},

	/**
	 * set sub keys if exist
	 * NOT IN USE
	 * @param {string} key   Object key
	 * @param {Object} obj Value to be set
	 */
	setKeyArray: function(key, obj) {
		_log.debug('setKeyArray', key, obj);


	},



	/**
	 * Hide dialog toolbar
	 *
	 * @return {void}
	 */
	_hideToolbarDialog: function() {
		//_log.debug('_hideToolbarDialog');

		if (this.toolbar && this.toolbar.dialog) {
			this.toolbar.dialog.hide();
		}
	},

	/**
	 * Set the class mode
	 *
	 * @param  {Object} mode
	 * @return {void}
	 */
	_setClassMode: function(mode, m) {
		//_log.debug('_setClassMode', mode, m);
		if (typeof mode === 'object') {
			mode = m;
		}

		if (typeof mode !== 'object' && this.container.addClass) {
			this.container.addClass('mode-' + mode);
		}

		if (mode === null && this.toolbar.dialog) {
			this.toolbar.dialog.hide();
			this.container.removeClass('mode-edit');
		}
	},

	/**
	 * When the trash control is pressed
	 *
	 * @return {void}
	 */
	_viewDidTrash: function() {
		//_log.debug('_viewDidTrash');
		this.emit('deleteItem', this.info._id);
	},

	/**
	 * When the infoedit control is pressed
	 *
	 * @return {void}
	 */
	_viewDidInfoEdit: function() {
		//_log.debug('_viewDidInfoEdit', this.getInfo());
		var info = this.getInfo();

		_log.debug('info', info);

		if (info._id) {
			this.emit('editInfo', info);
		} else {
			_log.warn('can\'t display info when new');
		}
	},


	/**
	 * When the infoedit control is pressed
	 *
	 * @return {void}
	 */
	_viewDidInfoView: function() {
		_log.debug('_viewDidInfoView', this.getInfo());
		var info = this.getInfo();

		if (info) {
			this.emit('viewInfo', info);
		}
	},

	/**
	 * [_viewDidChange description]
	 * @param  {[type]} key [description]
	 * @param  {[type]} val [description]
	 * @return {[type]}     [description]
	 */
	_viewDidChange: function(key, val) {
		var ev = 'change:' + key;

		//If the ev contains '.' replace this chat by '-',
		//because our bindings will read all '.' as a property
		if (ev.indexOf('.') !== -1) {
			ev = ev.split('.').join('-');
		}

		//_log.debug('_viewDidChange', ev, val);

		this.setMode('edit');

		this.emit(ev, val);

		if (this.control.apply) {
			this.control.apply.setState('active');
		}

		if (this.control.cancel) {
			this.control.cancel.setState('active');
		}

		if (this.toolbar.dialog) {
			this.toolbar.dialog.show();
		}
	},

	/**
	 * Set view accorrding the given mode
	 * @param {string} mode edit or not
	 */
	setMode: function(mode) {
		this.emit('mode', [this, mode]);

		this.mode = mode;
	},



	/**
	 * Actually hide the form of the view
	 * @return {Object} The instance of the Class
	 */
	clear: function(doc) {
		//_log.debug('clear');

		if (typeof doc === 'object' && this.info && doc._id && doc._id !== this.info._id) {
			return;
		}

		if (this.mode === 'edit') {
			return;
		}

		if (this.form) {
			this.form.setStyle('display', 'none');
		}

		if (this.control && this.control.add) {
			this.control.add.setState(null);
		}

		if (this.control && this.control.title) {
			this.control.title.set('text', '');
		}

		this.info = null;

		this.emit('clean');
		this.emit('settings', ['infoId', null]);

		/*this.destroyCKEditor();
		if (this.form) this.form.empty();*/
		return this;
	},

	/**
	 * [getType description]
	 * @return {[type]} [description]
	 */
	getType: function() {
		return this.type;
	},

	/**
	 * [getInfo description]
	 * @return {[type]} [description]
	 */
	getInfo: function() {
		return this.info || null;
	},

	/**
	 * [apply description]
	 * @return {[type]} [description]
	 */
	apply: function(value) {
		//_log.debug('form apply', value);

		/*if (this.cke)
			this._updateHTMLField(this.cke);*/

		if (this.toolbar.dialog) {
			this.toolbar.dialog.hide();
		}

		this.emit('save', this.info);
		this.setMode(null);
	},

	/**
	 * [blur description]
	 * @return {[type]} [description]
	 */
	blur: function() {
		_log.debug('blur', this.ckeInstances);

		console.log('blur');
	},

	/**
	 * If do not receive a first param
	 * return if the view is read only
	 * if the first param is a object
	 * check if the view and the field are read only
	 * the field overwrite the view
	 *
	 * @param  {Object} field object with key read
	 * @return {boolean}
	 */
	isReadOnly: function(field) {
		//_log.debug('isReadOnly', field);
		if (field) {
			var read = false;

			if (this.readonly !== undefined) {
				read = this.readonly;
			}
			if (field.read !== undefined) {
				read = field.read;
			}
			return read;
		} else {
			return this.readonly;
		}
	}

});

module.exports = Form;
