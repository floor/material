
/**
 * container view class
 * @class view.container
 * @param {Object} options Default options for view
 * @since 0.0.3
 * @author Jerome Vial
 *
 * @type {Class}
 */'use strict';

var prime = require('prime/index'),
	Container = require('./container');

var _log = __debug('material:view-container');
	_log.defineLevel('DEBUG');

var Container = new prime({

	options: {
		containers: {
			dispose: true
		}
	},

	/**
	 * Initialize Container
	 *
	 * @method _initContainer
	 * @private
	 */
	_initContainer: function() {
		_log.debug('_initContainer', this.container);
		var opts = this.options;
		var self = this;

		var type = typeof opts.container;

		console.log('typeof container', type);

		if (type === 'object') {
			this.container.on('resize', function() {
				self.emit('resize');
			});
		} else if (type === 'element') {
			this.container = new Container({
				container: opts.container
			});
		} else {
			console.log('no container define');
			// if (opts.window) {
			// 	var win = new Window(opts.window);

			// 	this.content = win.body;
			// 	this.element = win.body;
			// 	this.element.addClass('view-' + opts.clss);
			// 	this.container = win;

			// 	this.container.on('resize', function() {
			// 		self.emit('resize');
			// 	});
			// }
		}

		if (!this.content){
			this._initContent();
		}

		this.on('focus', function() {
			self.container.setState('focus');
		});
		
		this.on('blur', function() {
			self.container.setState();
		});

		/*this.container.on('resize', function(){
			self.emit('resize');
		});*/
	},

	/**
	 * Add Slide(subview), intect it in the container, resize container and return it
	 *
	 * @method addContainer
	 * @param {idx}
	 * @param {where}
	 */
	addContainer: function(idx, where){
		var self = this,
			opts = this.options.view,
			index = idx || this.index;
			size = this.size;

		var container = new Container(opts).inject(this);

		this.on('resize', function() {
			container.emit('resize');
		});

		if (this.views.length === 0)
			this.index = 0;

		container.addClass('view'+index);
		this.views[index] = container;

		this.emit('added', container);

		if (!idx)
			this.view = container;

		return container;
	},

	/**
	 * Set the given view as active and move to it
	 *
	 * @method moveTo
	 * @param {index}
	 */
	moveTo: function(index, from){
		//_log.debug('moveTo', index, from);
		var self = this,
			opts = this.options;
		this.index = index;
		self.last = this.view;

		if (!this.views[index]) {
			this.view = this.addContainer(index);
		} else {
			this.view = this.views[index];
			if (opts.containers.dispose) {
				this.view.element.inject(this.element);
				this.emit('updateWeekCell');
			} else
				this.view.element.show();
		}

		//

		if (opts.containers.dispose)
			this.last.element.dispose();
		else
			this.last.element.hide();


		return this.view;
	},

	/**
	 * Find the next view from the list and move to it if exist
	 *
	 * @method next
	 * @param {unit}
	 */
	next: function(unit){
		unit = unit || 1;

		var index = this.index + unit;

		this.moveTo(index, 1);
	},

	/**
	 * Find the previous view from the list and move to it if exist
	 *
	 * @method back
	 * @param {unit}
	 */
	back: function(unit){
		unit = unit || 1;

		var index = this.index - unit;

		this.moveTo(index, -1);
	}

	/**
	 * Go to
	 *
	 * @method goto
	 * @param {unit}
	 */
	/*goto: function(unit){
		unit = unit || 1;

		var index = this.index + unit;

		this.moveTo(index, 1);
	}*/

});

module.exports = Container;
