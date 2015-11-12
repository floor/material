/*
material
 - oo ui toolkit
*/"use strict"

var prime = require("prime/index"),
	$ = require("elements"),
	zen = require('elements/zen'),
	fx = require("moofx");

var state = prime({
	
	/**
	 * Setter for the state of the component
	 * @param {String} state active/disable etc...
	 */
	setState: function(state){
		if (this.state)
			this.removeClass('state-'+this.state);

		if (state)
			this.addClass('state-'+state);

		this.state = state;
		this.emit('state', state);

		return this;
	}
});

module.exports = state;