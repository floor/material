
/**
 * Search Control Class
 * @class UI.Control.Search
 * @extends {Field}
 * @type {Class}
 */

'use strict'

var prime = require("prime/index"),
	Field = require('./field'),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	binding = require('../module/binding'),
	merge = require("deepmerge"),

	Button = require('./button');

var	_log = __debug('material:button');
	_log.defineLevel('DEBUG');

var Search = new prime({

	inherits: Field,

	mixin: [Options, Emitter, binding],

	options: {
		name: 'search',
		error: false,
		label: false,
		timer: 100,
		binding: {

		}
	},

	/**
	 * [constructor description]
	 * @param  {[type]} options [description]
	 * @return {[type]}         [description]
	 */
	constructor: function(options){
		this.setOptions(options);

		this.emit('init');

		this.init(opts);
		this.build();
		this._initEvents();

		return this;
	},

	/*
	Function: _initElement
		private function

		Create a div and a hidden input to receive the selected value

	Return:
		(void)
	*/
	build: function(){
		//create a new div as input element
		Search.parent.build.call(this);
		var opts = this.options;

		this.element.addClass('ui-search');

		this._initReset();
	},

	/**
	 * [_initInput description]
	 * @return {[type]} [description]
	 */
	_initInput: function()  {
		//_log.debug('_initInput', this.options);
		this.parent();

		this.input.set('autocomplete', 'off');
	},

	/**
	 * [_initReset description]
	 * @return {[type]} [description]
	 */
	_initReset: function() {
		var self = this;
		var icon = mnml.icon.font.clear || 'mdi-action-help';
		this.reset = new Button({
			name: 'clear',
			icon: icon,
		}).inject(this.element).on('press', function() {
			self.empty();
		});
	},

	/**
	 * [_initEvents description]
	 * @return {[type]} [description]
	 */
	_initEvents: function() {
		this.parent();

		var self = this,
			opts = this.options,
			timer;

		this.input.on('mousedown', function(e) {
			e.stopPropagation();
		});
	},

	/**
	 * [trigger description]
	 * @return {[type]} [description]
	 */
	trigger: function() {
		var self = this;

		clearTimeout(timer);
		timer = setTimeout(function() {
			self.emit('search', self.input.get('value'));
		}, opts.timer);
	},

	/**
	 * [focus description]
	 * @return {[type]} [description]
	 */
	focus: function() {
		this.input.focus();
		this.emit('focus');

		return this;
	},

	/**
	 * [empty description]
	 * @return {[type]} [description]
	 */
	empty: function() {
		this.input.set('value', '');
		this.emit('reset');

		return this;
	}
});

module.exports = Search;
