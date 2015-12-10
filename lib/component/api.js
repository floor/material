'use strict';

/**
 * Component api
 * @type object
 */
module.exports = {

	/**
	 * [style description]
	 * @return {instance} The class instance
	 */
	style(){
		return this.element.style.apply(this.element, arguments);
	},

	/**
	 * [style description]
	 * @return {instance} The class instance
	 */
	text(){
		this.element.text.apply(this.element, arguments);

		return this;
	},

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
	 * [getSize description]
	 * @return {Object} This object
	 */
	getSize() {
		return this.element.getSize();
	},

	/**
	 * [addClass description]
	 * @param {string} className The name of the class to add
	 */
	addClass(className){
		this.element.addClass(className);
		
		return this;
	},

	/**
	 * remove class
	 * @param  {string} className The name of the class to remove
	 * @return {instance} Class instance
	 */
	removeClass(className){
		this.element.removeClass(className);

		return this;
	},

	/**
	 * remove class
	 * @param  {string} className The name of the class to remove
	 * @return {instance} Class instance
	 */
	hasClass(className){
		return this.element.hasClass(className);
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
			this.style('width', width);
		}

		if (height) {
			this.style('height', this.element.y);
		}

		this.emit('resized');
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

