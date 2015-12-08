

module.exports = {

	/**
	 * Zoom In
	 */
	zoomIn() {
		var self = this;
		if (!this.zf) {
			this.zf = 0.7;
		}

		if (this.zf > 1.6) {
			return;
		}

		this.zf = (self.zf).toFloat() + 0.1;

		var lh = this.zf + 0.1;
		var lhem = lh.toString()+'em';
		var em = this.zf.toString()+'em';

		this.style('font-size', em);
		this.style('line-height', lhem);

		this.emit('resize');
	},

	/**
	 * Zoom Out
	 */
	zoomOut() {
		var self = this;

		if (!this.zf)
			this.zf = 0.7;

		if (this.zf < 0.5)
			return;

		this.zf = (self.zf).toFloat() - 0.1;

		var lh = this.zf + 0.1;
		var lhem = lh.toString()+'em';
		var em = this.zf.toString()+'em';

		this.style('font-size', em);
		this.style('line-height', lhem);

		this.emit('resize');
	}

};
