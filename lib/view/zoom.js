
/**
* Minimalistic Implement for Minimal.View Class
*
* @extends Minimal.View
* @class View.Zoom
* @author Jerome Vial, Bruno Santos
*/

define(function() {

    var exports = new Class({

	/**
	 * Initialize Zoom
	 *
	 * @method _initZoom
	 * @private
	 */
	_initZoom: function() {

	},

	/**
	 * Zoom In
	 *
	 * @method zoomIn
	 */
	zoomIn: function() {
		var self = this;
		if (!this.zf)  // zoom factor
			this.zf = 0.7;

		if (this.zf > 1.6)
			return;

		//_log.debug(typeOf(this.zf));

		this.zf = (self.zf).toFloat() + 0.1;

		var lh = this.zf + 0.1;
		lhem = lh.toString()+'em';
		var em = this.zf.toString()+'em';

		//_log.debug(em,lhem);
		this.element.setStyle('font-size', em);
		this.element.setStyle('line-height', lhem);

		this.fireEvent('resize');
	},

	/**
	 * Zoom Out
	 *
	 * @method zoomOut
	 */
	zoomOut: function() {
		var self = this;

		if (!this.zf)
			this.zf = 0.7;

		if (this.zf < 0.5)
			return;

		this.zf = (self.zf).toFloat() - 0.1;

		var lh = this.zf + 0.1;
		lhem = lh.toString()+'em';
		em = this.zf.toString()+'em';

		//_log.debug(em,lhem);
		this.element.setStyle('font-size', em);
		this.element.setStyle('line-height', lhem);

		this.fireEvent('resize');
	}

    });

    return exports;

});
