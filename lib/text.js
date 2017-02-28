'use strict';

import Component from './component';

var defaults = {
  name: 'item',

  node: null,
  component: ['name'],
  element: {
    tag: 'span'
  }
};

/**
 * The item class is used for example as item list
 *
 * @class
 * @extends {Component}
 * @return {Object} The class instance
 * @example new Item(object);
 */
module.exports = class Text extends Component {

  /**
   * init
   * @return {Object} The class options
   */
  init(options) {
    super.init(options);

    options = options || this.options;

    var text = options.text || options.label;

    if (text) {
      this.set(text);
    }

    return this;
  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */
  build(options) {
    super.build();

    return this;
  }

  /**
   * [focus description]
   * @return {void}
   */
  set(value) {
    this.element.innerHTML(value);

    return this;
  }
};
