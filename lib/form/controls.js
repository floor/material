
/**
 * Form module control
 */
let UI = {};
	UI.ButtonControl = require('../control/button');
	UI.ChoiceControl = require('../control/choice');
	UI.StepsControl = require('../control/steps');
	UI.DropdownControl = require('../control/dropdown');
	UI.MultiControl = require('../control/multi');
	UI.SelectControl = require('../control/select');
	UI.CheckControl = require('../control/check');

module.exports = {

	/**
	 * [_initButtons description]
	 * @param  {Array} list    List of buttons
	 * @param  {Object} doc
	 * @param  {Element} element [description]
	 */
	_initButtons: function(list, doc, element) {
		var self = this;
		var buttons = [];

		if (typeOf(list) === 'object') {
			buttons.push(list);
		}
		else buttons = list;

		buttons.each(function(b) {
			var btn = new Material('button', {
				'clss': b.klss,
				type: 'text',
				name: b.name,
				//text: b.text,
				icon: b.icon,
				emit: b.emit
			}).insert(element, 'top');


			btn.addEvent(b.emit, function() {
				self.fireEvent(b.emit, doc._id);
			});
		});
	},

	/**
	 * [_initChoice description]
	 * @param  {Object} field [description]
	 * @param  {Object} doc   Object data info
	 * @param  {string} group Group of the field
	 */
	_initChoice: function(field, doc, group) {
		var self = this;

		var value = this.getValueFromKey(field.name, doc);

		var input = new UI.ChoiceControl({
			name: field.name,
			text: field.text,
			value: value,
			klss: field.klss,
			list: field.list,
			read: field.read || this.readonly
		}).insert(group);

		if (!field.read)
		input.on('change', function(val) {

			self.updateDocKey(field.name, val);

			self.fireEvent('change', [field.name, val]);
			self.fireEvent('updated', {
				key: field.name,
				value: val
			});

			if (field.name === 'kind') {
				self._setForm(self.doc);
			}
		});

		this.field[field.name] = input;
	},

	/**
	 * [_initSteps description]
	 * @param  {Object} field [description]
	 * @param  {Object} doc   Object data info
	 * @param  {string} group Group of the field
	 */
	_initSteps: function(field, doc, group) {
		var self = this;

		var value = this.getValueFromKey(field.name, doc);

		var input = new UI.StepsControl({
			name: field.name,
			text: field.text,
			value: value,
			klss: field.klss,
			list: field.list,
			opts: field.opts,
			read: field.read || this.readonly
		}).insert(group);

		if (!field.read)
		input.on('step', function(val) {

			/*var oldVal = self.getValueFromKey(field.name, doc);
			var idx = field.list.indexOf(oldVal);
			if (idx + 1 != val - 1) return;

			//val = field.list[val-1];

			var text = field.list[idx+1];

			if (text) {
				input.set(text);
			}*/

			//self.updateDocKey(field.name, val);

			self.fireEvent('change', [field.name, val]);
			/*self.fireEvent('updated', {
				key: field.name,
				value: val
			});*/
		});

		this.field[field.name] = input;
	},

	/**
	 * [_initDropdown description]
	 * @param  {Object} field Field definition
	 * @param  {Object} doc   Object data info
	 * @param  {string} group Group of the field
	 */
	_initDropdown: function(field, doc, group) {
		var self = this;

		var value = this.getValueFromKey(field.name, doc);
		if (!value && field.default) {
			value = field.list[field.list.indexOf(field.default)];
			this.updateDocKey(field.name, value);
		}

		var read = this.isReadOnly(field);

		var input = new UI.DropdownControl({
			name: field.name,
			text: field.text,
			value: value,
			klss: field.klss,
			list: field.list,
			read: read
		}).insert(group);

		this.field[field.name] = input;

		if (read) return;

		input.on('change', function(val) {
			input.setError(null);
			self.updateDocKey(field.name, val);

			self.fireEvent('change', [field.name, val]);
			self.fireEvent('updated', {
				key: field.name,
				value: val
			});

			if (field.name === 'kind') {
				self._setForm(self.doc);
			}
		});
	},

	/**
	 * [_initMulti description]
	 * @param  {Object} field [description]
	 * @param  {Object} doc   Object data info
	 * @param  {string} group Group of the field
	 */
	_initMulti: function(field, doc, group) {
		var self = this;

		var value = this.getValueFromKey(field.name, doc);

		var input = new UI.MultiControl({
			name: field.name,
			text: field.text,
			value: value,
			klss: field.klss,
			list: field.list
		}).insert(group);

		input.on('change', function(obj) {

			self.doc[field.name] = obj.value;
			self.fireEvent('change', [field.name, obj.value]);
			self.fireEvent('updated', obj);
			if (field.name === 'kind') {
				self._setForm(self.doc);
			}
		});
	},

	/**
	 * [_initSelect description]
	 * @param  {Object} field Field definition
	 * @param  {Object} doc   Data info
	 * @param  {string} group Group
	 */
	_initSelect: function(field, doc, group) {
		var self = this;

		var select = {
			text: field.text,
			type: field.type,
			name: field.text,
			klss: field.klss,
			opts: {
				name: 'kind',
				type: 'drop',
				head: {
					text: 'kind'
				},
				menu: []
			}
		};

		field.list.each(function(value) {
			select.opts.menu.push({
				name: value
			});
		});


		select.value = doc[field.name];

		var input = new UI.SelectControl(select)
			.insert(group);

		input.on('change', function(value) {

			self.doc[field.name] = value;
			self.fireEvent('change', [field.name, value]);

			if (field.name === 'kind') {
				self._setForm(self.doc);
			}
		});
	},

	/**
	 * [_initCheck description]
	 * @param  {Object} field [description]
	 * @param  {Object} doc Object data info
	 * @param  {string} group Group of the field
	 */
	_initCheck: function(field, doc, group) {
		var self = this;

		var value = doc[field.name];
		if (value === undefined) {
			value = field.value;
			this.doc[field.name] = value;
		}

		field.value = value;

		var input = new UI.CheckControl(field)
			.insert(group);

		input.on('change', function(value) {
			self.doc[field.name] = value;
			self.fireEvent('change', [field.name, value]);

		});
	}
};
