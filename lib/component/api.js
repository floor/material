'use strict';

/**
 * Component api
 * @type object
 */
module.exports = {

	/**
	 * [show description]
	 * @return {Object} This object
	 */
	show(){
		this.emit('show');
		this.element.show();

		return this;
	},

	/**
	 * [hide description]
	 * @return {Object} This object
	 */
	hide(){
		this.emit('hide');
		this.element.hide();

		return this;
	},

	/**
	 * [show description]
	 * @return {Object} This object
	 */
	fade(value){
		this.emit('fade');
		this.element.fade(value);

		return this;
	},

	/**
	 * [getStyle description]
	 * @param  {string} name [description]
	 * @return {style}       [description]
	 */
	getStyle(name){
		return this.element.attribute(name);

	},

	/**
	 * [getSize description]
	 * @return {Object} This object
	 */
	getSize() {
		return this.element.getSize();
	},

	/**
	 * [getComputedSize description]
	 * @return {Object} This object
	 */
	getComputedSize() {
		return this.element.getComputedSized();
	},

	/**
	 * [getCoordinates description]
	 * @return {Object} This object
	 */
	getCoordinates(context) {
		return this.element.getCoordinates(context);
	},

	/**
	 * [addClass description]
	 * @param {string} className [description]
	 */
	addClass(className){
		this.element.addClass(className);
		
		return this;
	},

	/**
	 * remove class
	 * @param  {string} klass [description]
	 * @return {instance} Class instance
	 */
	removeClass(klass){
		this.element.removeClass(klass);

		return this;
	},

	/**
	 * [get description]
	 * @param  {string} property [description]
	 * @return {instance} Class instance
	 */
	get(property){

		return this.element.get(property);
	},

	/**
	 * [morph description]
	 * @param  {string} props [description]
	 * @return {instance} Class instance
	 */
	morph(props){
		return this.element.morph(props);
	},

	/**
	 * Get the name of the component
	 * @return {string} name - The name of the Class instance
	 */
	getName() {
		return this.options.name || this.name;
	},

	/**
	 * [delegate description]
	 * @param  {string}   type     eventName ie. click, dblclick
	 * @param  {string}   selector div.tab
	 * @param  {Function} fn       callback function
	 * @return {instance} The class instance
	 */
	delegate(type, selector, fn) {
		this.element.delegate(type, selector, fn);

		return this;
	},

	/**
	 * Set the size of the element
	 * @param {interger} width  [description]
	 * @param {interger} height [description]
	 */
	setSize(width, height){

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
	setStyle(style, value){
		this.element.style(style, value);

		return this;
	},

	/**
	 * [setStyles description]
	 * @param {Object} styles [description]
	 */
	setStyles(styles){
		this.element.setStyles(styles);

		return this;
	},

	/**
	 * [getElement description]
	 * @param  {string} selector [description]
	 * @return {instance} DOM Element
	 */
	getElement(selector){
		return this.element.getElement(selector);
	},

	/**
	 * [getElements description]
	 * @param  {string} selector selector
	 * @return {Array}        Of elements
	 */
	getElements(selector){
		return this.element.getElements(selector);
	},

	/**
	 * [setText description]
	 * @param {text} text [description]
	 */
	setText(text) {
		this.element.text(text);

		return this;
	},

	/**
	 * set content of the element
	 * @param {string} content [description]
	 */
	setContent(content) {
		this.content.set('html', content);

		this.emit('resize');

		return this;
	},

	/**
	 * Setter for the state of the component
	 * @param {string} state active/disable etc...
	 */
	setState(state){
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
	setClass() {
		var opts = this.options;

		console.log('setClass', this.name, opts);

		var classes = ['type', 'state'];

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
	dispose(){
		return this.element.dispose();
	},

	/**
	 * [destroy description]
	 * @return {Object} This object
	 */
	destroy(){
		this.element.destroy();
		return;
	}
};

