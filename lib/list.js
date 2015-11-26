
/**
 * List View Class
 * @class List View Class
 * @param {Object} options Default options for view
 * @extends {View}
 * @since 0.0.3
 * @author Jerome Vial
 *
 * @type {prime}
 */'use strict'


var prime = require('prime/index'),
	View = require('./view'),
	Options = require('prime-util/prime/options'),
	Emitter = require("prime/emitter"),
	binding = require('./module/binding'),
	merge = require("deepmerge"),

	Element = require('./element'),
	Surface = require('./view/surface');

	//Collection = require('./view/collection'),
	//Filter = require('./view/filter'),
	//Select = require('./view/select'),
	//Search = require('./list/search');

var _log = __debug('material:view-list');
//	_log.defineLevel('DEBUG');

var List = prime({

	inherits: View,

	mixin: [Options, Emitter],

	name: 'list',

	options: {
		name: 'list',
		lib: 'ui',
		base: 'view',
		prefix: 'ui-',

		comp:['body'],  

		binding: {
			'add': 'new',
			'infoedit': '_editInfo',
			'trash': '_viewDidTrash',
			"content.click:relay('div')": '_onClickElement',
			'content.dblclick:relay("div.ui-item")': '_onDblClickElement',
			'sort': 'reverse',
			'resize': '_updateSize',
			'search': 'toggleSearch',
		}
	},

	/**
	 * [constructor description]
	 * @param  {[type]} options [description]
	 * @return {[type]}         [description]
	 */
	constructor: function(options) {
		this.options = merge(List.parent.options, this.options);	
		this.setOptions(options);

		this.init();
		this.build();

		return this;
	},

	/**
	 * [_initView description]
	 * @return {[type]} [description]
	 */
	init: function() {
		_log.debug('init', this.options);
		this.filters = [];
		this.data = [];

		this.items = [];

		if (this.options.render) {
			this.render = this.options.render;
		}

		return this;
	},


	/**
	 * [_initList description]
	 * @param  {[type]} string [description]
	 * @return {[type]}        [description]
	 */
	build: function(string) {
		List.parent.build.call(this);
		_log.debug('build', this.element);

		this.items = [];

		//this.element.addClass('type-'+this.tmpl._type);
		this.element.addClass('view-'+this.options.name);

		//this.content = this.c.body;

		//this._initSearch();

		var self = this;

		this.c.body.delegate('click', '.ui-button', function(event, item){ // a is the matching element
		   	//console.log(event, item);
		   	self.select(item, event);
		})

		//this.container.emit('resize');
		return this;
	},

	select: function(item, event) {

		this.item = item;

		this.emit('selected', item[0]);
	},
	
	/**
	 * Setter
	 * @param {string} prop
	 * @param {string} value
	 */
	set: function(prop, value, options) {

		switch(prop) {
			case 'list':
				this.setList(value, options);
				break;
			default:
				this.setList(value, options);
		}

		return this;
	},

	/**
	 * [setList description]
	 * @param {[type]} list [description]
	 */
	setList: function(data) {
		_log.debug('setList', data);

		for (var i = 0; i < data.length; i++) {
			var item = this.render(data[i]);

			item.element.store('info', data[i]);

			this.addItem(item, i);
		};

		return this;
	},

	/**
	 * [update description]
	 * @param  {[type]} data [description]
	 * @return {[type]}      [description]
	 */
	update: function(data) {
		_log.debug('update(data)', data.length);

		if (!data) return;


		this.emit('setList', [data]);

		var self = this;
		this.list = data;
		
		// if (this.c.body)
		// 	this.c.body.destroy();

		var itemList = '';

		this._initSurface(data);

		//this.setStatus(data.length);

		//this.emit('resize');
	},


	/**
	 * [insert description]
	 * @param  {[type]} info [description]
	 * @param  {[type]} x    [description]
	 * @param  {[type]} y    [description]
	 * @return {[type]}      [description]
	 */
	insert: function(info, x, y) {
		//_log.debug('insert', info, x, y);

		if (this.list.indexOf(info._id) > -1)
			return;

		this.list.push(info._id);

		var item = this.addItem(info);

		//this.scrolling.appendItems(item);

		//this.emit('resize');
	},

	/**
	 * [add description]
	 * @param {[type]} info [description]
	 */
	addItem: function(item, idx) {
		_log.debug('add', item, this.id);

		if (!item) {
			_log.warn('info empty return');
			return;
		}

		var where = 'bottom';

		item.inject(this.c.body, where);
		this.items.push(item);

		//this._initDragItem(item);
		return item;
	},

	/**
	 * [renderItem description]
	 * @param  {[type]} item [description]
	 * @param  {[type]} info [description]
	 * @return {[type]}      [description]
	 */
	renderItem: function(info) {
		_log.debug('renderItem', info);

		//info = this._processInfo(info);

		tmpl = opts.tmpl;

		var body = Mustache.render(tmpl, info);

		return body;
	},

	/**
	 * [getList description]
	 * @return {[type]} [description]
	 */
	getList: function() {

		return this.list;

	},

	/**
	 * [_initSurface description]
	 * @param  {[type]} data [description]
	 * @return {[type]}      [description]
	 */
	_initSurface: function(data) {
		_log.debug('_initSurface', data.length, this.c.body);

		if (!data) return;

		var self = this;

		//this.container.show();

		var coord = this.element.getCoordinates();

		// if (this.surface)
		//  	this.surface = null;

		if (this.surface) {
			this.c.body.empty();
			this.surface = null;
		}

		var first = couch.doc[data[0]];
		var size = this._getItemSize(first);

		//_log.debug('initSurface', this.c.body);

		var surface = this.surface = new Surface({
			container: this.c.body,
			h: coord.height,
			w: coord.width,
			itemHeight: size,
			totalRows: data.length,
			generatorFn: function(idx) {
				//_log.debug('---', idx);
				var id = data[idx];

				var info = couch.doc[id];
				var item = self.addItem(info, idx);

				return item;
			}
		});

		//this.container.hide();

		//_log.debug('gen', list.generatorFn);

		//surface.container.classList.add("list-content");
		//this.c.body = surface.container;
		//this.c.body.inject(this.element);
	},

	/**
	 * [_getItemSize description]
	 * @return {[type]} [description]
	 */
	_getItemSize: function(info) {
		//_log.debug('_getItemSize', this.container);

		if (!info) return;

		var item = this.addItem(info).inject(this.c.body);

		var size = item.getSize().y;
		item.destroy();

		//_log.debug('--', size);
		
		return size;
	},

   	/**
   	 * [reverse description]
   	 * @return {[type]} [description]
   	 */
   	reverse: function() {
   		this.list.reverse();
   		this.update(this.list);
   	},

   	/**
   	 * [_updateSize description]
   	 * @return {[type]} [description]
   	 */
   	_updateSize: function() {
   		//this.size = this.c.body.getSize();
   	},

   	/**
   	 * [remove description]
   	 * @return {[type]} [description]
   	 */
   	remove: function() {

   	}
});

module.exports = List;
