'use strict';

import View from 'material/lib/view';
import Emitter from "./module/emitter";

//import Surface from './view/surface';
//import Collection from './view/collection';
//import Filter from './view/filter';
//import Select from './view/select';
//import Search from './list/search';

import defaults from './list/options';

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
	 * [_initView description]
	 * @return  Class instance
	 */
	init(options) {
		super.init(options);

		Object.assign(this.options, [defaults, options].reduce(Object.assign, {}));

		this.name = this.options.name;

		this.filters = [];
		this.data = [];

		this.items = [];

		if (this.options.render) {
			this.render = this.options.render;
		}

		return this;
	}

	/**
	 * [_initList description]
	 * @param  {Object} options this class options
	 * @return {Object} The class instance	
	 */
	build(options) {
		super.build();

		options = options || this.options;

		this.items = [];

		//this.addClass('type-'+this.tmpl._type);
		this.addClass('view-'+this.options.name);

		//this.content = this.c.body;

		//this._initSearch();

		var self = this;

		// this.c.body.delegate('click', '.ui-button', function(event, item){
		//    	//console.log(event, item);
		//    	self.select(item, event);
		// });

		//this.container.emit('resize');
		return this;
	}

	/**
	 * select
	 * @param  {Element} item  [description]
	 * @param  {event} event The caller event
	 * @return        [description]
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
	 * @return {Object} The class instance
	 */
	setList(list) {

		for (var i = 0; i < list.length; i++) {
			var item = this.render(list[i]);

			item.store('info', list[i]);

			this.addItem(item, i);
		}

		return this;
	}

	/**
	 * Insert info
	 * @param  {Object} info Info object
	 * @param  {integer} x    [description]
	 * @param  {integer} y    [description]
	 * @return {Object} The class instance
	 */
	insert(info, x, y) {

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

		if (!item) {
			return;
		}

		var where = 'bottom';

		item.insert(this.c.body, where);
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
