'use strict';

import element from './component/element';
import dom from './component/element';
import Layout from './layout';
// element related modules

// dependencies
// import attribute from './component/attribute';
// import classify from './component/classify';
// import events from './component/events';

// import style from './component/style';
// import dom from './module/dom';
// import storage from './component/storage';

// options

/**
 * Base class for all ui components
 * @class
 * @namespace Material
 * @param {Object} options - The component options
 * @return {Object} The class Instance
 */
function build() {
  var tag = this.options.tag || 'div';

  this.wrapper = document.createElement(tag);
  css.add(this.wrapper, this.options.prefix + '-' + this.options.class);

  if (this.options.name) {
    css.add(this.wrapper, this.options.class + '-' + this.name);
  }

  if (this.options.css) {
    css.add(this.wrapper, this.options.css);
  }

  this.options.layout.wrapper = this.wrapper;
  this.layout = new Layout(this.options.layout);
}


// function oldbuild() {
//   var opts = this.options;

//   this.emit('create');

//   var tag = opts.tag || 'div';
//   this.wrapper = element.createElement(tag);

//   this.initAttributes();
//   this.setState(this.options.state);
//   this.options.classify(this.options.class, this.options);

//   this.emit('created');

//   if (this.options.layout) {
//     console.log('layout', this.options.layout);
//     this.options.layout.container = this.wrapper;

//     this.layout = new Layout(this.options.layout);
//   }

//   this.content = element;

//   // insert if container options is given
//   if (opts.container) {
//     //console.log(this.name, opts.container);
//     this.insert(opts.container);
//   }

//   this.controller.register(this);

//   return this;
// }

export default build;