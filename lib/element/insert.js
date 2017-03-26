'use strict';

import dom from '../module/dom';

module.exports = {

  /**
   * [insertElement description]

   * @param  {[type]} element   [description]
   * @param  {[type]} container [description]
   * @param  {[type]} context   [description]
   * @param  {[type]} debug     [description]
   * @return {[type]}           [description]
   */
  insert(element, container, context) {
    // if (debug) {
    console.log('insert', container);
    // }

    //this.emit('insert');

    if (container && container.element) {
      container = container.element;
    } else if (container instanceof HTMLElement) {
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
