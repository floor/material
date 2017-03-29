'use strict';

import dom from '../module/dom';

/**
 * Inject method insert element to the domtree using Dom methods
 * @param {HTMLElement} container [description]
 * @param  {string} context - Injection context
 * @return {Object} This class intance
 */
module.exports = {

  /**
   * [insert description]
   * @param  {[type]} container [description]
   * @param  {[type]} context   [description]
   * @param  {[type]} debug     [description]
   * @return {[type]}           [description]
   */
  insert(container, context) {
    this.insertElement(this.element, container, context);

    return this;
  },

  /**
   * [insertElement description]

   * @param  {[type]} element   [description]
   * @param  {[type]} container [description]
   * @param  {[type]} context   [description]
   * @param  {[type]} debug     [description]
   * @return {[type]}           [description]
   */
  insertElement(element, container, context) {
    if (container && container.element) {
      container = container.element;
    }

    this.container = container;

    // if (debug) {
    // console.log('insert', container);
    // }

    //this.emit('insert');

    if (container instanceof HTMLElement) {
      container = container;
    } else {
      throw new Error("Can't insert " + container + " is not a HTMLElement object");
    }

    context = context || 'bottom';

    var contexts = ['top', 'bottom', 'after', 'before'];
    var methods = ['prepend', 'append', 'after', 'before'];

    var index = contexts.indexOf(context);
    if (index === -1) {
      return;
    }

    var method = methods[index];

    //this.emit('insert');

    // insert component element to the dom tree using Dom
    dom[method](container, element);
    //this.emit('injected');
    //
    return element;
  }
};
