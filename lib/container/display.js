
/**
 * display container class
 *
 * @class Container.display
 * @author [Jerome Vial]
 * @constructor
 */"use strict";

var prime = require("prime/index"),
	Emitter = require("prime/emitter");

var _log = __debug('material:container-display');
	_log.defineLevel('DEBUG');

var display = new prime({

	mixin: [Emitter],

	/**
	 * [_initDisplay description]
	 * @return {[type]} [description]
	 */
	_initDisplay: function() {
 		_log.debug('_initDisplay', this.options);

 		this._modifier = 'width';

 		var direction = '';

 		//var direction = this.container.element.style('flex-direction');

		if (direction === 'column')
			this._modifier = 'height';

		//_log.debug('direction', direction, this._modifier);

		var self = this,
			opts = this.options.display,
			modifier = this._modifier;

		if (!this[modifier])
			this[modifier] = 220;

		this.device = this.device || 'desktop';
		//this.underlay.hide();
		this.display = {};

		return this.display;
	},

	/**
	 * [getDisplay description]
	 * @return {[type]} [description]
	 */
	getDisplay: function() {

		return this._display;
	},

	/**
	 * [getDisplay description]
	 * @return {[type]} [description]
	 */
	setDisplay: function(display) {

		this._display = display;

		return this;
	},

	/**
	 * [toggle description]
	 * @return {[type]} [description]
	 */
	toggle: function() {
		//_log.debug('__toggle click, display', this._display);

		if (this._display === 'normalized'){
			this.minimize();
		} else {
			this.normalize();
		}

		return this._display;
	},

	/**
	 * [minimize description]
	 * @return {[type]} [description]
	 */
	minimize: function() {
		_log.debug('minimize', this.element, this.device);

		if (!this.display) {
			this._initDisplay();
		}
		
		var transition = {
			duration: '.2s',
		    equation: 'sine-out'
		};

		this.emit('minimize');

		var prop = {
			equation: transition.equation, 
			duration: transition.duration
		};

		prop[this._modifier] = '0px';

		this.element.animate(prop);

		this._display = 'minimized';

		this.emit('display', 'minimized');

		return this;
	},

	/**
	 * [normalize description]
	 * @return {[type]} [description]
	 */
	normalize: function() {
		 _log.debug('normalize');
		
		if (!this.display) {
			this._initDisplay();
		}
		
		var transition = {
			duration: '.2s',
		    equation: 'sine-out'
		};

		this.emit('normalize');

		var size = this[this._modifier];

		var prop = {
			equation: transition.equation, 
			duration: transition.duration
		};

		prop[this._modifier] = size+'px';

		this.element.animate(prop);

		this._display = 'normalized';

		this.emit('display', this._display);

		return this;
	},

	/**
	 * [normalize description]
	 * @return {[type]} [description]
	 */
	maximize: function() {
		_log.debug('maximize', size);

		this.element.style('display', null);
		this.element.addClass('state-focus');

		this.isOpen = true;

		this._display = 'normalized';

		this.emit('display', this._display);

		return this;
	}
});

module.exports = display;

