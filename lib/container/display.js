
/**
 * display container class
 */
module.exports = {

	/**
	 * [_initDisplay description]
	 * @return {instance} The class instance 
	 */
	_initDisplay() {
 		this._modifier = 'width';

 		var direction = '';

 		//var direction = this.container.element.style('flex-direction');

		if (direction === 'column')
			this._modifier = 'height';

		var modifier = this._modifier;

		if (!this[modifier])
			this[modifier] = 220;

		this.device = this.device || 'desktop';
		//this.underlay.hide();
		this.display = {};

		return this.display;
	},

	/**
	 * [getDisplay description]
	 * @return {instance} The class instance 
	 */
	getDisplay() {

		return this._display;
	},

	/**
	 * [getDisplay description]
	 * @return {instance} The class instance 
	 */
	setDisplay(display) {

		this._display = display;

		return this;
	},

	/**
	 * [toggle description]
	 * @return {instance} The class instance 
	 */
	toggle() {

		if (this._display === 'normalized'){
			this.minimize();
		} else {
			this.normalize();
		}

		return this._display;
	},

	/**
	 * [minimize description]
	 * @return {instance} The class instance 
	 */
	minimize() {

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
	 * @return {instance} The class instance 
	 */
	normalize() {
		
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
	 * @return {instance} The class instance
	 */
	maximize() {

		this.element.style('display', null);
		this.element.addClass('state-focus');

		this._display = 'normalized';

		this.emit('display', this._display);

		return this;
	}
};
