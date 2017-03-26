'use strict';

import element from './component/element';
import dom from './component/element';
// element related modules
import element from './component/element';

// dependencies
import attribute from './component/attribute';
import classify from './component/classify';
import events from './component/events';

import style from './component/style';
import dom from './module/dom';
import storage from './component/storage';

// options

/**
 * Base class for all ui components
 * @class
 * @namespace Material
 * @param {Object} options - The component options
 * @return {Object} The class Instance
 */
module.exports = {
  build() {
    var opts = this.options;

    this.emit('create');

    var tag = opts.tag || 'div';
    this.element = element.createElement(tag);

    this.initAttributes();
    this.setState(this.options.state);
    this.classify(this._name, this.options);

    this.emit('created');

    if (this.options.layout) {
      console.log('layout', this.options.layout);
      this.options.layout.container = this.element;

      this.layout = new Layout(this.options.layout);
    }

    this.content = element;

    // insert if container options is given
    if (opts.container) {
      //console.log(this.name, opts.container);
      this.insert(opts.container);
    }

    this.controller.register(this);

    return this;
  }
};
