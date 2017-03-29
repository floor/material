'use strict';

import Component from './component';
import display from './container/display';
import insert from './component/insert';
import merge from './module/merge';
import css from './module/css';

import Emitter from './module/emitter';


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
class List {

  /**
   * init
   * @return {Object} The class options
   */
  constructor(options) {

    this.init(options);
    this.build();

    return this;
  }

  /**
   * [_initView description]
   * @return  Class instance
   */
  init(options) {

    this.options = merge(defaults, options);

    Object.assign(this, Emitter, display, insert);

    this._name = this.constructor.name.toLowerCase();
    this.name = this.options.name;

    this.filters = [];
    this.data = [];


    this.items = [];

    if (this.options.render) {
      this.render = this.options.render;
    }

    if (this.options.select) {
      console.log('select cb');
      this.select = this.options.select;
    }

    return this;
  }

  /**
   * [_initList description]
   * @param  {Object} options this class options
   * @return {Object} The class instance  
   */
  build(options) {
    options = options || this.options;

    // define main tag
    var tag = options.tag || 'div';

    this.element = document.createElement(tag);

    var self = this;

    options = options || this.options;


    //this.addClass('type-'+this.tmpl._type);
    css.add(this.element, 'material-' + this._name);

    if (this.options.container) {
      this.insert(this.options.container);
    }

    this.element.addEventListener("click", function(e) {
      //console.log("list", this, e);
      // e.target was the clicked element
      if (e.target && e.target.matches(".material-item")) {
        console.log("item clicked: ", e.target);
        self.click(e.target, e);
      }
    });


    //this.content = this.c.body;

    //this._initSearch();


    // this.c.body.delegate('click', '.ui-button', function(event, item){
    //      //console.log(event, item);
    //      self.select(item, event);
    // });

    //this.container.emit('resize');
    return this;
  }

  click(item, e) {

    css.remove(this.item, 'is-selected');

    this.item = item;
    css.add(item, 'is-selected');

    if (this.select) {
      this.select(item, e);
    }
  }

  /**
   * select
   * @param  {Element} item  [description]
   * @param  {event} event The caller event
   * @return        [description]
   */
  select(item, event) {
    console.log('select', item, event);
    this.item = item;

    this.emit('selected', item[0]);
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   */
  set(prop, value, options) {
    switch (prop) {
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

      //item.store('info', list[i]);

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
  insertInfo(info, x, y) {

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
  addItem(item /*, index*/ ) {

    if (!item) {
      return;
    }

    var where = 'bottom';
    this.insertElement(item.element, this.element, where);
    //item.insert(this.element, where);
    this.items.push(item);

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
