
/**
 * element Component class
 *
 * @class component
 */"use strict"

var prime = require("prime/index");

var method = prime({
	/**
	 * [toElement description]
	 * @return {[type]} [description]
	 */
	toElement: function() {
		return this.element;
	},

	/**
	 * [show description]
	 * @return {[type]} [description]
	 */
	show: function(){
		this.emit('show');
		this.element.show();

		return this;
	},

	/**
	 * [hide description]
	 * @return {[type]} [description]
	 */
	hide: function(){
		this.emit('hide');
		this.element.hide();

		return this;
	},

	/**
	 * [show description]
	 * @return {[type]} [description]
	 */
	fade: function(value){
		this.emit('fade');
		this.element.fade(value);

		return this;
	},

	/**
	 * [getStyle description]
	 * @param  {[type]} style [description]
	 * @return {[type]}       [description]
	 */
	getStyle: function(name){
		return this.element.attribute(name);

	},

	/**
	 * [getSize description]
	 * @return {[type]} [description]
	 */
	getSize: function() {
		//_log.debug('------',typeOf(this.element));
		//if (typeOf(this.element) == 'object')

			//_log.debug(this.options.name);

		return this.element.getSize();
	},

	/**
	 * [getComputedSize description]
	 * @return {[type]} [description]
	 */
	getComputedSize: function() {
		return this.element.getComputedSized();
	},

	/**
	 * [getCoordinates description]
	 * @return {[type]} [description]
	 */
	getCoordinates: function(context) {
		return this.element.getCoordinates(context);
	},

	/**
	 * [addClass description]
	 * @param {[type]} klass [description]
	 */
	addClass: function(klass){
		this.element.addClass(klass);
		return this;
	},

	/**
	 * [removeClass description]
	 * @param  {[type]} klass [description]
	 * @return {[type]}       [description]
	 */
	removeClass: function(klass){
		return this.element.removeClass(klass);
	},

	/**
	 * [get description]
	 * @param  {[type]} property [description]
	 * @return {[type]}          [description]
	 */
	get: function(property){
		return this.element.get(property);
	},

	/**
	 * [morph description]
	 * @param  {[type]} props [description]
	 * @return {[type]}       [description]
	 */
	morph: function(props){
		return this.element.morph(props);
	},

	/**
	 * [setSize description]
	 * @param {[type]} width  [description]
	 * @param {[type]} height [description]
	 */
	setSize: function(width, height){
		this.element.x = width || this.options.width;
		this.element.y = height || this.options.height;

		if (this.element.x)
			this.element.setStyle('width', this.element.x);

		if (this.element.y)
			this.element.setStyle('height', this.element.y);

		this.emit('resize');
		return this;
	},

	/**
	 * [setStyle description]
	 * @param {[type]} style [description]
	 * @param {[type]} value [description]
	 */
	setStyle: function(style, value){
		this.element.style(style, value);

		return this;
	},

	/**
	 * [setStyles description]
	 * @param {[type]} styles [description]
	 */
	setStyles: function(styles){
		this.element.setStyles(styles);

		return this;
	},

	/**
	 * [getElement description]
	 * @param  {[type]} string [description]
	 * @return {[type]}        [description]
	 */
	getElement: function(string){
		return this.element.getElement(string);
	},

	/**
	 * [getElements description]
	 * @param  {[type]} string [description]
	 * @return {[type]}        [description]
	 */
	getElements: function(string){
		return this.element.getElements(string);
	},

	/**
	 * [setText description]
	 * @param {[type]} text [description]
	 */
	setText: function(text) {
		this.element.text(text);

		return this;
	},

	/**
	 * set content of the element
	 * @param {string} content [description]
	 */
	setContent: function(content) {
		this.content.set('html', content);

		this.emit('resize');

		return this;
	},

	/**
	 * [submit description]
	 * @param  {[type]} string [description]
	 * @return {[type]}        [description]
	 */
	submit:  function(string){
		return this.element.submit(string);
	},

	/**
	 * [dispose description]
	 * @return {[type]} [description]
	 */
	dispose: function(){
		return this.element.dispose();
	},

	/**
	 * [destroy description]
	 * @return {[type]} [description]
	 */
	destroy: function(){
		this.element.destroy();
		return;
	}
});

module.exports = method;
