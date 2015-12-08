'use strict';

module.exports = {

	/**
	 * Calculate the limits
	 *
	 * @return {Array}
	 * @private
	 */
	getLimit(){
		var limit = [[0, 0], [0, 0]];
		var element = this.element;

		limit[0][0] = 0;
		limit[0][1] = limit[0][0] - element.clientWidth;
		limit[1][0] = 0;
		limit[1][1] = limit[1][0] - element.clientHeight;

		return limit;
	},

	/**
	 * Apply the limits to the x and y values
	 * @private
	 */
	limit(x, y){
		var limit = this.getLimit();
		return [
			x.limit(limit[0][0], limit[0][1]),
			y.limit(limit[1][0], limit[1][1])
		];
	}

};
