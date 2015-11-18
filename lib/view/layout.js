
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
	Layout = require('../layout');

var _log = __debug('material:view-container');
//	_log.defineLevel('DEBUG');

var layout = new prime({

	/**
	 * [_initLayout description]
	 * @return {[type]} [description]
	 */
	_initLayout: function(options) {
		_log.debug('_initLayout');

		var opts = options || this.options;
		var self = this;

		this.device = opts.device;
		//_log.debug('_initLayout', opts.layout, opts.container);
		if (!opts.layout) return;
		//_log.debug('--', opts.layout, opts.container);
		var settings = opts.settings.layout;

		var layout = this.layout = new Layout({
			theme: opts.theme,
			container: opts.container,
			node: opts.layout,
			settings: settings
		});

		this.on('resizer', function(name, prop, value) {
			self.setSettings('layout.' + name + '.' + prop, value);
		});

		this.on('display', function(name, state) {
			//_log.debug('display container ' + name + ' state ', state);

			self.setSettings('layout.' + name + '.display', state);
		});
	
		this.container = this.layout.container;
		this.container.addClass('app-' + this.options.name);
	}
});

module.exports = layout;
