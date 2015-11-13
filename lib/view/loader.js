/**
* Minimalistic Implement for Minimal.View Class
*
* @implement Minimal.View
* @author Jerome Vial, Bruno Santos
*/

define(function() {

    var exports = new Class({

	_initLoader: function() {
		//_log.debug('_initLoader');
		var self = this;

		this.addEvents({
			getData: function() {
				self.showLoader();
			},
			noData: function() {
				self.hideLoader();
			},
			setList: function() {
				self.hideLoader();
			},
			progress: function(step, total) {
				if (self.loader)
				self.loaderText.set('html', 'Loading: ' + step);

			}
		});
	},

	/**
	 * Show Loader
	 *
	 * @method showLoader
	 */
	showLoader: function() {
		var self  = this;

		this.content.empty();
		this.element.scrollTop = 0;
		this.length = 0;
		this.list = [];
		this.docs = [];
		this.setStatus('Loading...');

		clearTimeout(this.loaderTimeout);
		this.loaderTimeout = setTimeout(function() {
			if (self.content && !self.content.childNodes.length) {
				var loader = self.loader = new Element('div', {
					'class': 'ui-loader'
				}).inject(self.content);

				var text = self.loaderText = new Element('span', {
					html: 'Loading...',
					'class': 'loader-text'
				}).inject(loader, 'top');

				// var icon = new Element('span', {
				// 	html: '<svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">'+
   	// 						'<circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>'+
				// 			'</svg>'
				// }).inject(loader, 'top');

				var bar = new Element('div', {
					'class': 'loader-bar'
				}).inject(loader, 'bottom');
			}
		}, 200);
	},

	/**
	 * Hide Loader
	 *
	 * @method _initScroll
	 */
	hideLoader: function() {
		clearTimeout(this.loaderTimeout);
		this.loader = null;
		this.content.empty();
		this.setStatus('0 Results');
		this.element.scrollTop = 0;
		this.length = 0;
		this.list = [];
		this.docs = [];
	}

    });

    return exports;

});
