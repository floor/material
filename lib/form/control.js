
/**
 * 
 *
 * @implement Minimal.Form
 * @author Jerome Vial, Bruno Santos
 */

define([
	'UI/Control/Button',
	'UI/Control/Choice',
	'UI/Control/Steps',
	'UI/Control/Dropdown',
	'UI/Control/Multi',
	'UI/Control/Select',
	'UI/Control/Check',
], function(
	ButtonControl,
	ChoiceControl,
	StepsControl,
	DropdownControl,
	MultiControl,
	SelectControl,
	CheckControl
) {

	var _log = __debug('view:form-control');

    var exports = new Class({

		/**
		 * [_initButtons description]
		 * @param  {[type]} list    [description]
		 * @param  {[type]} doc     [description]
		 * @param  {[type]} element [description]
		 * @return {[type]}         [description]
		 */
		_initButtons: function(list, doc, element) {
			var self = this;
			var buttons = [];
			//_log.debug('_initButton', list, doc, element);
			if (typeOf(list) == 'object')
				buttons.push(list);
			else buttons = list;

			_log.debug(buttons);
			buttons.each(function(b) {
				var btn = new ButtonControl({
					'clss': b.klss,
					type: 'text',
					name: b.name,
					//text: b.text,
					icon: b.icon,
					emit: b.emit
				}).inject(element, 'top');

				//_log.debug('btn', b, btn);

				btn.addEvent(b.emit, function() {
					self.fireEvent(b.emit, doc._id);
				});
			});
		},

		/**
		 * [_initChoice description]
		 * @param  {[type]} field [description]
		 * @param  {[type]} doc   [description]
		 * @param  {[type]} group [description]
		 * @return {[type]}       [description]
		 */
		_initChoice: function(field, doc, group) {
			var self = this;
			//_log.debug('----------',field, doc);

			var value = this.getValueFromKey(field.name, doc);

			var input = new ChoiceControl({
				name: field.name,
				text: field.text,
				value: value,
				klss: field.klss,
				list: field.list,
				read: field.read || this.readonly
			}).inject(group);

			if (!field.read)
			input.addEvent('change', function(val) {

				self.updateDocKey(field.name, val);

				self.fireEvent('change', [field.name, val]);
				self.fireEvent('updated', {
					key: field.name,
					value: val
				});

				if (field.name == 'kind')
					self._setForm(self.doc);
			});

			this.field[field.name] = input;
		},

		/**
		 * [_initSteps description]
		 * @param  {[type]} field [description]
		 * @param  {[type]} doc   [description]
		 * @param  {[type]} group [description]
		 * @return {[type]}       [description]
		 */
		_initSteps: function(field, doc, group) {
			var self = this;
			//_log.debug('_initSteps',field, field.text);

			var value = this.getValueFromKey(field.name, doc);

			var input = new StepsControl({
				name: field.name,
				text: field.text,
				value: value,
				klss: field.klss,
				list: field.list,
				opts: field.opts,
				read: field.read || this.readonly
			}).inject(group);

			if (!field.read)
			input.addEvent('step', function(val) {

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
		 * @param  {[type]} field [description]
		 * @param  {[type]} doc   [description]
		 * @param  {[type]} group [description]
		 * @return {[type]}       [description]
		 */
		_initDropdown: function(field, doc, group) {
			var self = this;
			//_log.debug('_initDropdown', field);

			var value = this.getValueFromKey(field.name, doc);
			if (!value && field.default) {
				value = field.list[field.list.indexOf(field.default)];
				this.updateDocKey(field.name, value);
			}

			var read = this.isReadOnly(field);

			var input = new DropdownControl({
				name: field.name,
				text: field.text,
				value: value,
				klss: field.klss,
				list: field.list,
				read: read
			}).inject(group);

			this.field[field.name] = input;

			if (read) return;

			input.addEvents({
				change: function(val) {
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
				}
			});
		},

		/**
		 * [_initMulti description]
		 * @param  {[type]} field [description]
		 * @param  {[type]} doc   [description]
		 * @param  {[type]} group [description]
		 * @return {[type]}       [description]
		 */
		_initMulti: function(field, doc, group) {
			var self = this;
			//_log.debug('--_initMulti--------',field);

			var value = this.getValueFromKey(field.name, doc);

			var input = new MultiControl({
				name: field.name,
				text: field.text,
				value: value,
				klss: field.klss,
				list: field.list
			}).inject(group);

			input.addEvent('change', function(obj) {

				self.doc[field.name] = obj.value;
				self.fireEvent('change', [field.name, obj.value]);
				self.fireEvent('updated', obj);
				if (field.name == 'kind')
					self._setForm(self.doc);
			});
		},

		/**
		 * [_initSelect description]
		 * @param  {[type]} field [description]
		 * @param  {[type]} doc   [description]
		 * @param  {[type]} group [description]
		 * @return {[type]}       [description]
		 */
		_initSelect: function(field, doc, group) {
			var self = this;
			//_log.debug('----------',field);


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

			var input = new SelectControl(select)
				.inject(group);

			input.addEvent('change', function(value) {
				//_log.debug('value', doc[field.name], value);

				self.doc[field.name] = value;
				self.fireEvent('change', [field.name, value]);

				if (field.name == 'kind')
					self._setForm(self.doc);
			});
		},

		/**
		 * [_initCheck description]
		 * @param  {[type]} field [description]
		 * @param  {[type]} doc   [description]
		 * @param  {[type]} group [description]
		 * @return {[type]}       [description]
		 */
		_initCheck: function(field, doc, group) {
			var self = this;
			//_log.debug('-----_initCheck-----',doc[field.name]);

			var value = doc[field.name];
			if (value === undefined) {
				value = field.value;
				this.doc[field.name] = value;
			}

			field.value = value;

			var input = new CheckControl(field)
				.inject(group);

			input.addEvent('change', function(value) {
				// _log.debug('value', doc[field.name], value);
				self.doc[field.name] = value;
				self.fireEvent('change', [field.name, value]);

			});
		}

    });

    return exports;

});
