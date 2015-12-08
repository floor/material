'use strict';

let instance = null;

/**
 * 
 */
class Controller {

	/** 
	  * Setting up block level variable to store class state
	  * , set's to null by default.
	  * credits: http://amanvirk.me/singleton-classes-in-es6/
	*/
	constructor() {
        if(!instance){
			instance = this;
		}

		return instance;
    }
	/**
	 * [register description]
	 * @param  {component} component [description]
	 * @return {instance} The class instance
	 */
	register(component) {
		this.components.push(component);

		return this;
	}

	/**
	 * [focus description]
	 * @param  {component} component [description]
	 * @return {instance} The class instance
	 */
	focus(component) {
		if (component === null) {
			return;
		}

		if (this.active !== component) {
			if (this.active)
				this.blur(this.active);

			this.active = component;
			component.emit('focus');
		}

		return;
	}

	/**
	 * [blur description]
	 * @param  {component} component [description]
	 * @return {instance} The class instance
	 */
	blur(component) {
		component.emit('blur', component);

		return;
	}
}

module.exports = Controller;
