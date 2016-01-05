'use strict';

import Field = from './field';
import Button = from './button';

var defaults = {
	name: 'search',
	error: false,
	label: false,
	timer: 100
};

/**
 * @class
 */
class Search extends Field{

	/**
	 * [constructor description]
	 * @param  {Object} options The class options
	 * @return {Object} The class instance
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

		this.addClass('ui-search');

		this._initReset();
	}

	/**
	 * [_initInput description]
	 * @return  This class instance
	 */
	_initInput() {
		this.parent();

		this.input.set('autocomplete', 'off');
	}

	/**
	 * [_initReset description]
	 * @return  This class instance
	 */
	_initReset() {
		var self = this;
		var icon = mnml.icon.font.clear || 'mdi-action-help';
		this.reset = new Button({
			name: 'clear',
			icon: icon,
		}).insert(this.element).on('press', function() {
			self.empty();
		});
	}

	/**
	 * [_initEvents description]
	 * @return  This class instance
	 */
	_initEvents() {

		this.input.on('mousedown', function(e) {
			e.stopPropagation();
		});
	}

	/**
	 * [trigger description]
	 * @return  This class instance
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
	 * @return  This class instance
	 */
	focus() {
		this.input.focus();
		this.emit('focus');

		return this;
	}

	/**
	 * [empty description]
	 * @return  This class instance
	 */
	empty() {
		this.input.set('value', '');
		this.emit('reset');

		return this;
	}
}

module.exports = Search;
