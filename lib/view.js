'use strict';

import Container from './container';
import defaults from './view/options';

//import Dragging from './view/dragging';
//import Loader from './view/loader';
//import Limit from './view/limit';
//import Scroll from './view/scroll';
//import LayoutView from './view/layout';
//import Toolbar from './toolbar/toolbar';
//import Zoom from './view/zoom';

//import viewCtrl from './view/ctrl',

/**
 * View
 * class
 * @param {Object} Default options for view
 * @since 0.0.4
 */
class View extends Container {

	// mixin: [Emitter, Options, binding,
	// 	Toolbar,
	// 	ctrl,
	// 	Dragging,
	// 	Limit,
	// 	Loader,
	// 	Scroll,
	// 	LayoutView,
	// 	Scrolling,
	// 	Zoom
	// ],

	/**
	 * Initialize
	 *
	 * @param {Object} options The class options
	 * @return {Object} The class instance
	 * @private
	 */
	init(options) {
		super.init(options);

		this.name = 'view';

		this.options = [ defaults, options ].reduce(Object.assign, {});
		this.container = this.options.container;
		
		this.index = 0;
		this.views = [];

		this.emit('ready');

		return this;
	}

	/**
	 * Build
	 *
	 * @return {void}
	 * @private
	 * 
	 */
	build(){
		super.build();

		// if (opts.toolbar)
		// 	this._initToolbar(opts.toolbar);

		// if ( opts.resizable )
		// 	this._initResizer();

		this.emit('built');

		return this;
	}

	/**
	 * Clear the content of the view
	 * @return {Object} This class instance
	 */
	clear() {
		if (this.content && this.content.empty) {
			this.content.empty();
		}
	}

	/**
	 * Close
	 * @return {Object} This class instance
	 * @private
	 */
	close() {
		this.container.close();

		return this;
	}
}

module.exports = View;
