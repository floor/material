
define([

], function (

) {

	__material = __material || {};
	__material.view = __material.view || {};

	var exports = __material.view.ctrl = {

		list: [],

		/**
		 * [register description]
		 * @param  {[type]} view [description]
		 * @param  {[type]} app  [description]
		 * @return {[type]}      [description]
		 */
		register: function(view, app) {
			//_log.debug('register', view, app);
			this.list.push(view);

			return;
		},

		/**
		 * [focus description]
		 * @param  {[type]} view [description]
		 * @param  {[type]} app  [description]
		 * @return {[type]}      [description]
		 */
		focus: function(view, app) {
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
		},

		/**
		 * [blur description]
		 * @param  {[type]} view [description]
		 * @return {[type]}      [description]
		 */
		blur: function(view) {
			//_log.debug('blur');
			view.emit('blur', view);

			return;
		}

	};

	return exports;

});


//OLD FILE IF NEEDED

/*mnml.view = mnml.view || {};

mnml.view.ctrl = {
	list: [],

	register: function(view, app) {
		//_log.debug('register', view, app);
		this.list.push(view);

		return;
	},

	focus: function(view, app) {
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
	},

	blur: function(view) {
		//_log.debug('blur');
		view.emit('blur', view);

		return;
	}
};*/
