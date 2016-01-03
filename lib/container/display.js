
/**
 * display container class
 */
module.exports = {

	/**
	 * [_initDisplay description]
	 * @return {Object} The class instance
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
	 * @return {Object} The class instance
	 */
	getDisplay() {

		return this._display;
	},

	/**
	 * [getDisplay description]
	 * @return {Object} The class instance
	 */
	setDisplay(display) {

		this._display = display;

		return this;
	},

	/**
	 * [toggle description]
	 * @return {Object} The class instance
	 */
	toggle() {
		console.log('toggle');
		if (this._display === 'normalized'){
			this.minimize();
		} else {
			this.normalize();
		}

		return this._display;
	},

	/**
	 * [minimize description]
	 * @return {Object} The class instance
	 */
	minimize() {
		console.log('minimize');
		if (!this.display) {
			this._initDisplay();
		}

		var transition = {
			
		};

		this.emit('minimize');

		var prop = {
			//stop: () => {},
			duration: 200,
		    easing: 'ease-out',
		    complete: () => {
				this.emit('display', 'minimized');
			}
		};

		prop[this._modifier] = 0;

		if (this.animation) this.animation.stop();

		this.animation = this.animate(prop);

		this._display = 'minimized';

		this.emit('display', 'minimized');

		return this;
	},

	/**
	 * [normalize description]
	 * @return {Object} The class instance
	 */
	normalize() {

		if (!this.display) {
			this._initDisplay();
		}

		this.emit('normalize');

		var size = this[this._modifier];

		var option = {
			//stop: () => {},
			duration: 200,
		    easing: 'ease-out',
			complete: () => {
				this.emit('display', 'normalized');
			}
		};

		var property = {};
		property[this._modifier] = size;

		if (this.animation) this.animation.stop();

		this.animation = this.animate(property, option);
		this._display = 'normalized';
		this.emit('display', this._display);

		return this;
	},

	/**
	 * [normalize description]
	 * @return {Object} The class instance
	 */
	maximize() {

		this.style('display', null);
		this.addClass('state-focus');

		this._display = 'normalized';

		this.emit('display', this._display);

		return this;
	}
};
