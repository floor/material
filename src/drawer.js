'use strict';

import init from './component/init';
import classify from './component/classify';
import css from './module/css';
import events from './component/events';
import insert from './element/insert';
import create from './element/create';
import merge from './module/merge';
import emitter from './module/emitter';

const defaults = {
  prefix: 'material',
  class: 'drawer',
  modifier: 'width',
  state: 'closed',
  position: 'left',
  tag: 'div',
  modules: [emitter, events, insert]
};

/**
 * Class representing a UI Container. Can add components.
 *
 * @extends Component
 * @return {parent} The class instance
 * @example new Container({
 *   container: document.body
 * });
 */
class Drawer {

  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance 
   */
  constructor(options) {
    this.options = merge(defaults, options || {});

    init(this);
    this.build(this.options);

    this.emit('ready');

    return this;
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build(options) {
    console.log('type', options.type);

    this.wrapper = create('aside');
    this.underlay(options);

    classify(this.wrapper, options);

    if (options.container) {
      this.insert(options.container);
    }

    if (!this.options.display) {
      this.display = 'opened';
    }

    this.emit('built', this.wrapper);

    return this;
  }

  /**
   * [underlay description]
   * @param  {object} options [description]
   * @return {object} this        [description]
   */
  underlay(options) {
    this.underlay = create('div', 'drawer-underlay');
    this.underlay.addEventListener('click', () => {
      this.close();
    });

    this.on('open', () => {
      css.remove(this.underlay, 'underlay-hidden');
    });

    return this;
  }

  /**
   * [toggle description]
   * @return {Object} The class instance
   */
  toggle() {
    if (this.display === 'opened') {
      this.close();
    } else {
      this.open();
    }

    return this;
  }

  /**
   * [minimize description]
   * @return {Object} The class instance
   */
  close() {
    css.remove(this.wrapper, 'show');
    css.remove(this.underlay, 'show');
    this.display = 'closed';

    this.emit(this.display);

    return this;
  }

  /**
   * [normalize description]
   * @return {Object} The class instance
   */
  open() {
    this.emit('open');
    css.add(this.wrapper, 'show');
    css.add(this.underlay, 'show');
    this.display = 'opened';
    this.emit(this.display);

    return this;
  }

  /**
   * [insert description]
   * @param  {?} container [description]
   * @param  {?} context   [description]
   * @return {?}           [description]
   */
  insert(container, context) {
    console.log('insert');
    insert(this.wrapper, container, context);
    setTimeout(() => {
      insert(this.underlay, container);
    }, 1000);

    return this;
  }

}

export default Drawer;