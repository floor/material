'use strict';

import Layout from '../layout';

var layout = {

	/**
	 * [_initLayout description]
	 * @return {Object} Ooptions
	 */
	_initLayout(options) {

		var opts = options || this.options;
		var self = this;

		this.device = opts.device;

		if (!opts.layout) return;

		var settings = opts.settings.layout;

		this.layout = new Layout({
			theme: opts.theme,
			container: opts.container,
			node: opts.layout,
			settings: settings
		});

		this.on('resizer', function(name, prop, value) {
			self.setSettings('layout.' + name + '.' + prop, value);
		});

		this.on('display', function(name, state) {
			self.setSettings('layout.' + name + '.display', state);
		});
	
		this.container = this.layout.container;
		this.container.addClass('app-' + this.options.name);
	}
};

module.exports = layout;
