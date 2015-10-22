
var ui = ui || {};

/**
* Base class of all ui components.
*
* @class ui.component
* @requires primish
* @return {parent} Class
* @example (start code)	new ui.component(object); (end)
* @author [politan]
* @copyright © 1999-2014 - Jerome D. Vial. All Rights reserved.
*/
ui.component = primish({

	implement: [options, emitter],

	name: 'component',

	options: {
		library: 'ui',
		element: {
			attributes: ['accesskey', 'class', 'contenteditable', 'contextmenu',
			'dir', 'draggable', 'dropzone', 'hidden', 'id', 'lang',
			'spellcheck', 'style', 'tabindex', 'title', 'translate'],
			tag: 'span',
			type: null
		}
	},

	/**
	 * Constructor
	 * @param  {Object} options [description]
	 * @return {Object}         [description]
	 */
	constructor: function(options){
		this.setOptions(options);
		console.log('options', this.options);

		this.trigger('init');

		this._initElement();
		this._initEvents();

		return this;
	},

	/**
	 * [_initElement description]
	 * @return {[type]} [description]
	 */
	_initElement: function(){
		var self = this,
			opts = this.options;

		this.trigger('create');

		var tag = opts.tag || opts.element.tag;
		var name = opts.name || opts.element.name;

		var element = this.element = document.createElement(tag);

		// init attributes
		this._initAttributes();

		// set text or html if needed
		var text = opts.text || opts.html;
		if (text) this.setText(text);

		//element.store('_instance', this);

		if (opts.klass);
			this.addClass(opts.klass);

		this.trigger('created');

		if (opts.state)
			this.setState(opts.state);

		//return this.element;
	},

	/**
	 * [setText description]
	 * @param {[type]} text [description]
	 */
	setText: function(text) {
		var node = document.createTextNode(text);
		this.element.appendChild(node);
	},

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
		this.trigger('state', state);

		return this;
	},

	/**
	 * [_initClass description]
	 * @return {[type]} [description]
	 */
	addClass: function(klass) {
		console.log('addClass', klass);
		Dom.addClass(this.element, klass);

		return this;
	},

	/**
	 * [_initClass description]
	 * @return {[type]} [description]
	 */
	removeClass: function(klass) {
		Dom.removeClass(this.element, klass);

		return this;
	},

	/**
	 * [setAttribute description]
	 * @param {[type]} name  [description]
	 * @param {[type]} value [description]
	 */
	setAttribute: function(name, value) {

		this.element.setAttribute(name, value);

		return this;
	},

	/**
	 * [_initEvents description]
	 * @return {[type]} [description]
	 */
	_initEvents: function(){
		//console.log('_initEvents');
	},

	/**
	 * [_initProps description]
	 * @return {[type]} [description]
	 */
	_initAttributes: function() {
		//console.log('_initAttributes');
		var opts = this.options,
			attr = opts.element.attributes;

		for (var i = 0, len = attr.length; i < len; i++ ) {
			var name = attr[i],
				value = opts[name];

			if (name == 'klass')
				name = 'class';

			if (value)
				this.setAttribute(name, value);
		}
	},

	/**
	 * Inject method insert element to the domtree using Dom methods
	 * @param  {[type]} container [description]
	 * @param  {[type]} position  [description]
	 * @return {[type]}           [description]
	 */
	inject: function(element, context){
		//console.log('inject', this.element, element, context);
		//console.warn('inject', element, context);

		context = context || 'bottom';

		var contexts = ['top', 'bottom', 'after', 'before'];
		var methods = ['prepend', 'append', 'after', 'before'];

		var index = contexts.indexOf(context);
		if (index === -1)
			return;

		var method = methods[index];

		// if element is a ui.component use its element instead
		if (element instanceof ui.component)
			element = element.element;

		this.trigger('inject');

		// insert component element to the dom tree using Dom
		Dom[method](element, this.element);

		this.trigger('injected');

		return this;
	},

	/**
	 * [hide description]
	 * @return {[type]} [description]
	 */
	hide: function() {
		Dom.css(this.element, {
			display: 'none'
		});
	},

	/**
	 * [remove description]
	 * @return {[type]} [description]
	 */
	remove: function() {
		Dom.remove(this.element);
	}

});
