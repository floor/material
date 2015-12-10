'use strict';

var Field = require('./field');
var Emitter = require("../module/emitter");
var bind = require('../module/bind');

var Button = require('./button');

var defaults = {
	name: 'search',
	error: false,
	label: false,
	timer: 100,
	bind: {

	}
};

/**
 * @class
 */
class Search extends Field{

	/**
	 * [constructor description]
	 * @param  {Object} options The class options
	 * @return {instance} The class instance
	 */
	constructor(options){

		this.emit('init');

		this.init(options);
		this.build();
		this._initEvents();

		return this;
	}

	init(options) {
		this.name = 'search';

		this.options = [ defaults, options ].reduce(Object.assign, {});
		// merge options

		// implement object
		Object.assign(this, bind);
	}

	/*
	Function: _initElement
		private function

		Create a div and a hidden input to receive the selected value

	Return:
		(void)
	*/
	build(){
		super.build();

		this.element.addClass('ui-search');

		this._initReset();
	}

	/**
	 * [_initInput description]
	 * @return {instance} This class instance
	 */
	_initInput() {
		this.parent();

		this.input.set('autocomplete', 'off');
	}

	/**
	 * [_initReset description]
	 * @return {instance} This class instance
	 */
	_initReset() {
		var self = this;
		var icon = mnml.icon.font.clear || 'mdi-action-help';
		this.reset = new Button({
			name: 'clear',
			icon: icon,
		}).inject(this.element).on('press', function() {
			self.empty();
		});
	}

	/**
	 * [_initEvents description]
	 * @return {instance} This class instance
	 */
	_initEvents() {

		this.input.on('mousedown', function(e) {
			e.stopPropagation();
		});
	}

	/**
	 * [trigger description]
	 * @return {instance} This class instance
	 */
	trigger() {
		var self = this;

		var timer;

		clearTimeout(timer);
		timer = setTimeout(function() {
			self.emit('search', self.input.get('value'));
		}, this.options.timer);
	}

	/**
	 * [focus description]
	 * @return {instance} This class instance
	 */
	focus() {
		this.input.focus();
		this.emit('focus');

		return this;
	}

	/**
	 * [empty description]
	 * @return {instance} This class instance
	 */
	empty() {
		this.input.set('value', '');
		this.emit('reset');

		return this;
	}
}

module.exports = Search;
