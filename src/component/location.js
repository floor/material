'use strict';

/**
 * Element location related methods
 * @module component/location
 */
export default {

  /**
   * [_initLocation description]
   * @return {Object} The class instance
   */
  _initLocation() {
    var list = ['left', 'top', 'right', 'bottom'];
    var location = this.getInitialLocation();

    for (var i = 0; i < list.length; i++) {
      if (location[list[i]]) {
        this.options[list[i]] = location[list[i]];
      }
    }

    this.wrapper.styles(location);
  },

  /**
   * [setLocation description]
   * @param {Integer} left  [description]
   * @param {Integer} top   [description]
   * @param {Object} morph [description]
   */
  setLocation(left, top, morph) {
    var opts = this.options;
    var el = this.wrapper;

    this.wrapper.left = left || opts.left || el.getCoordinates().x;
    this.wrapper.top = top || opts.top || el.getCoordinates().y;

    this.wrapper[morph ? 'morph' : 'setStyles']({
      top: this.wrapper.top,
      left: this.wrapper.left
    });

    return this;
  },

  /**
   * [getCenterLocation description]
   * @return {Object} The class instance
   */
  getCenterLocation() {
    var location = {};
    var height = this.options.height;

    if (this.options.height !== 'auto')
      location.top = (window.getHeight() - height.toInt()) / 2;
    else location.top = 160;

    location.left = (window.getWidth() - this.options.width.toInt()) / 2;

    return location;
  },


  /**
   * [getInitialLocation description]
   * @return {Object} The class instance
   */
  getInitialLocation() {
    if (this.options.top || this.options.right || this.options.bottom || this.options.left) {
      /*//right || left
      var left = (this.options.right && !this.options.left) ?
        Window.getWidth() - this.options.right - this.options.width :
        this.options.left;

      //top || bottom
      var top = (this.options.bottom && !this.options.top) ?
        Window.getHeight() - this.options.bottom - this.options.height :
        this.options.top;*/

      return {
        top: this.options.top,
        bottom: this.options.bottom,
        left: this.options.left,
        right: this.options.right
      };
    } else if (this.options.location === 'center') {
      return this.getCenterLocation();
    } else {
      var c = ui.window.getCascadeLocation(this);
      return {
        top: c.top,
        left: c.left
      };
    }
  },

  /**
   * [adaptLocation description]
   * @return {Object} The class instance
   */
  adaptLocation() {
    var location = {};
    var needed = false;
    var coordinates = this.offset();

    if (coordinates.top.toInt() > window.getHeight()) {
      location.top = window.getHeight() - Number.random(25, 75);
      needed = true;
    }

    if (coordinates.top.toInt() < 0) {
      location.top = 50;
      needed = true;
    }

    if (coordinates.left.toInt() + this.wrapper.getStyle('width').toInt() < 0) {
      location.left = Number.random(25, 75) - this.wrapper.getStyle('width').toInt();
      needed = true;
    }

    if (this.wrapper.getStyle('left').toInt() > window.getWidth()) {
      location.left = window.getWidth() - Number.random(25, 75);
      needed = true;
    }

    if (needed) {
      this.style(location);
    }
  }
};