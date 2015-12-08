'use strict';

/**
 * Component api
 * @type object
 */
var api = {

	/**
	 * [show description]
	 * @return {Object} This object
	 */
	show: function(){
		this.emit('show');
		this.element.show();

		return this;
	},

	/**
	 * [hide description]
	 * @return {Object} This object
	 */
	hide: function(){
		this.emit('hide');
		this.element.hide();

		return this;
	},

	/**
	 * [show description]
	 * @return {Object} This object
	 */
	fade: function(value){
		this.emit('fade');
		this.element.fade(value);

		return this;
	},

	/**
	 * [getStyle description]
	 * @param  {string} name [description]
	 * @return {style}       [description]
	 */
	getStyle: function(name){
		return this.element.attribute(name);

	},

	/**
	 * [getSize description]
	 * @return {Object} This object
	 */
	getSize: function() {
		//_log.debug('------',typeOf(this.element));
		//if (typeOf(this.element) == 'object')

			//_log.debug(this.options.name);

		return this.element.getSize();
	},

	/**
	 * [getComputedSize description]
	 * @return {Object} This object
	 */
	getComputedSize: function() {
		return this.element.getComputedSized();
	},

	/**
	 * [getCoordinates description]
	 * @return {Object} This object
	 */
	getCoordinates: function(context) {
		return this.element.getCoordinates(context);
	},

	/**
	 * [addClass description]
	 * @param {string} className [description]
	 */
	addClass: function(className){
		this.element.addClass(className);
		
		return this;
	},

	/**
	 * remove class
	 * @param  {string} klass [description]
	 * @return {instance} Class instance
	 */
	removeClass: function(klass){
		this.element.removeClass(klass);

		return this;
	},

	/**
	 * [get description]
	 * @param  {string} property [description]
	 * @return {instance} Class instance
	 */
	get: function(property){

		return this.element.get(property);
	},

	/**
	 * [morph description]
	 * @param  {string} props [description]
	 * @return {instance} Class instance
	 */
	morph: function(props){
		return this.element.morph(props);
	},

	/**
	 * Get the name of the component
	 * @return {string} name - The name of the Class instance
	 */
	getName: function() {
		return this.options.name || this.name;
	},

	/**
	 * [delegate description]
	 * @param  {string}   type     eventName ie. click, dblclick
	 * @param  {string}   selector div.tab
	 * @param  {Function} fn       callback function
	 * @return {instance} The class instance
	 */
	delegate: function(type, selector, fn) {
		this.element.delegate(type, selector, fn);

		return this;
	},

	/**
	 * Set the size of the element
	 * @param {interger} width  [description]
	 * @param {interger} height [description]
	 */
	setSize: function(width, height){

		if (width) {
			this.element.setStyle('width', width);
		}

		if (height) {
			this.element.setStyle('height', this.element.y);
		}

		this.emit('resized');
		return this;
	},

	/**
	 * [setStyle description]
	 * @param {string} style [description]
	 * @param {instance} value [description]
	 */
	setStyle: function(style, value){
		this.element.style(style, value);

		return this;
	},

	/**
	 * [setStyles description]
	 * @param {Object} styles [description]
	 */
	setStyles: function(styles){
		this.element.setStyles(styles);

		return this;
	},

	/**
	 * [getElement description]
	 * @param  {string} selector [description]
	 * @return {instance} DOM Element
	 */
	getElement: function(selector){
		return this.element.getElement(selector);
	},

	/**
	 * [getElements description]
	 * @param  {string} selector selector
	 * @return {Array}        Of elements
	 */
	getElements: function(selector){
		return this.element.getElements(selector);
	},

	/**
	 * [setText description]
	 * @param {text} text [description]
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
	 * Setter for the state of the component
	 * @param {string} state active/disable etc...
	 */
	setState: function(state){
		if (this.state) {
			this.removeClass('state-'+this.state);
		}

		if (state) {
			this.addClass('state-'+state);
		}

		this.state = state;
		this.emit('state', state);

		return this;
	},

	/**
	 * Init component class
	 * @return {Object} this - This Class instance
	 *
	 */
	setClass: function() {
		var opts = this.options;

		var classes = ['type', 'state'];

		this.addClass(opts.prefix+'-'+this.name);

		for (var i = 0; i < classes.length; i++) {
			var name = classes[i];
			if (opts[name]) {
				this.addClass(name+'-'+opts[name]);
			}
		}

		if (opts.element && opts.element.klass) {
			this.addClass(opts.element.klass);
		}

		if (this.options.klass) {
			this.addClass(this.options.klass);
		}

		if (this.options.clss) {
			this.addClass(this.options.clss);
		}

		if (this.options.isPrimary) {
            this.element.addClass('is-primary');
        }
	},

	/**
	 * [dispose description]
	 * @return {Object} This object
	 */
	dispose: function(){
		return this.element.dispose();
	},

	/**
	 * [destroy description]
	 * @return {Object} This object
	 */
	destroy: function(){
		this.element.destroy();
		return;
	}
};

module.exports = api;
