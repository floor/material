'use strict'

import dom from '../module/dom'

export default {

  insert (container, context) {
    var element = this.element

    this.insertElement(element, container, context)

    return this
  },

  insertElement (element, container, context) {
    if (container && container.element) {
      container = container.element
    }

    this.container = container

    // if (debug) {
    // console.log('insert', container);
    // }

    // this.emit('insert');

    context = context || 'bottom'

    var contexts = ['top', 'bottom', 'after', 'before']
    var methods = ['prepend', 'append', 'after', 'before']

    var index = contexts.indexOf(context)
    if (index === -1) {
      return
    }

    var method = methods[index]

    // this.emit('insert');

    // insert component element to the dom tree using Dom
    // console.log('dom', method, element);
    dom[method](container, element)
    // this.emit('injected');
    //
    return element
  }
}
