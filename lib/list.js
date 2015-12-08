'use strict';

var View = require('./view');
var Emitter = require("./module/emitter");
var binding = require('./module/bind');

var Element = require('./element');

//var Surface = require('./view/surface');
//var Collection = require('./view/collection');
//var Filter = require('./view/filter');
//var Select = require('./view/select');
//var Search = require('./list/search');

var defaults = require('./list/options');

var _log = __debug('material:view-list');
//	_log.defineLevel('DEBUG');


/**
 * List view class
 * @class
 * @param {Object} options Default options for view
 * @extends {View}
 * @since 0.0.4
 * @author Jerome Vial
 *
 * @type {prime}
 */
class List extends View {


	/**
	 * [constructor description]
	 * @constructs
	 * @param  {Object} options Object object
	 * @return {this} Class instance
	 */
	constructor(options) {
		super(options);

		this.init(options);
		this.build();

		return this;
	}

	/**
	 * [_initView description]
	 * @return {instance} Class instance
	 */
	init(options) {
		super.init(options);
		_log.debug('init', this.options);
		this.filters = [];
		this.data = [];

		this.name = 'list';

		this.items = [];

		if (this.options.render) {
			this.render = this.options.render;
		}

		return this;
	}

	/**
	 * [_initList description]
	 * @param  {Object} options this class options
	 * @return {instance} The class instance	
	 */
	build(options) {
		super.build();
		_log.debug('build', this.element);

		options = options || this.options;

		this.items = [];

		//this.element.addClass('type-'+this.tmpl._type);
		this.element.addClass('view-'+this.options.name);

		//this.content = this.c.body;

		//this._initSearch();

		var self = this;

		this.c.body.delegate('click', '.ui-button', function(event, item){
		   	//console.log(event, item);
		   	self.select(item, event);
		});

		//this.container.emit('resize');
		return this;
	}

	/**
	 * select
	 * @param  {Element} item  [description]
	 * @param  {event} event The caller event
	 * @return {instance}       [description]
	 */
	select(item, event) {

		this.item = item;

		this.emit('selected', item[0]);
	}
	
	/**
	 * Setter
	 * @param {string} prop
	 * @param {string} value
	 */
	set(prop, value, options) {

		switch(prop) {
			case 'list':
				this.setList(value, options);
				break;
			default:
				this.setList(value, options);
		}

		return this;
	}

	/**
	 * Set list
	 * @param {Array} list List of info object
	 * @return {instance} The class instance
	 */
	setList(list) {
		_log.debug('setList', list);

		for (var i = 0; i < list.length; i++) {
			var item = this.render(list[i]);

			item.element.store('info', list[i]);

			this.addItem(item, i);
		}

		return this;
	}

	/**
	 * Insert info
	 * @param  {Object} info Info object
	 * @param  {integer} x    [description]
	 * @param  {integer} y    [description]
	 * @return {instance} The class instance
	 */
	insert(info, x, y) {
		//_log.debug('insert', info, x, y);

		if (this.list.indexOf(info._id) > -1)
			return;

		this.list.push(info._id);

		var item = this.addItem(info);

		return this;
	}

	/**
	 * [add description]
	 * @param {Object} item [description]
	 */
	addItem(item, index) {
		_log.debug('addItem', item, index);

		if (!item) {
			_log.warn('info empty return');
			return;
		}

		var where = 'bottom';

		item.inject(this.c.body, where);
		this.items.push(item);

		//this._initDragItem(item);
		return item;
	}

   	/**
   	 * Reverse the list order
   	 * @return {Object} The class instance
   	 */
   	reverse() {
   		this.list.reverse();
   		this.update(this.list);

   		return this;
   	}
}

module.exports = List;
