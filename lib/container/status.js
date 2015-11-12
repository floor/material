
/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	Element = require('../element'),
	$ = require("elements");

var display = new prime({

	/**
	 * [_initStatus description]
	 * @param  {string} component
	 * @param  {string} context
	 * @return {void}
	 */
	_initStatus: function(component /*, context*/ ) {

		component = component || 'foot';

		if (!this[component]) {
			this['_init' + component.capitalize()]();
		}

		this.status = new Element('div.container-status').inject(this[component]);
	},
});
