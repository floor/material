
/**
 * 
 */
'use strict';

let instance = null;

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
	 * @param  {[type]} view [description]
	 * @param  {[type]} app  [description]
	 * @return {[type]}      [description]
	 */
	register(component) {
		//_log.debug('register', view, app);
		this.components.push(view);

		return;
	}

	/**
	 * [focus description]
	 * @param  {[type]} view [description]
	 * @param  {[type]} app  [description]
	 * @return {[type]}      [description]
	 */
	focus(view, app) {
		//_log.debug('focus', view, app);
		if (view === null)
			return;

		if (this.active !== view) {
			if (this.active)
				this.blur(this.active);

			this.active = view;
			view.emit('focus');
		}

		return;
	}

	/**
	 * [blur description]
	 * @param  {[type]} view [description]
	 * @return {[type]}      [description]
	 */
	blur(view) {
		//_log.debug('blur');
		view.emit('blur', view);

		return;
	}
}

module.exports = Controller;