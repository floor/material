'use strict';

/**
 * Module fieldset
 * @module attribute
 */

export default {


  /**
   * Set atrributes
   * @return {Object} this
   */
  initAttributes() {
    var opts = this.options;

    if (!opts.attr) {
      return;
    }

    var attr = opts.attr;

    for (var i = 0, len = attr.length; i < len; i++) {
      var name = attr[i];
      var value = opts[name];

      if (value) {
        this.setAttribute(name, value);
      }
    }

    return this;
  },

  /**
   * Set element
   * @param  {string} name The  name
   * @param  {string} value The  value
   * @return {Object} This class instance
   */
  setAttribute(name, value) {
    if (value !== null) {
      this.wrapper.setAttribute(name, '' + value);
    } else {
      this.wrapper.removeAttribute(name);
    }
  },

  /**
   * Get element
   * @param  {string} name The  name
   * @param  {string} value The  value
   * @return {Object} This class instance
   */
  getAttribute(name) {
    return this.wraper.getAttribute(name) || null;
  },


  /**
   * Setter for the state of the component
   * @param {string} state active/disable etc...
   */
  setState(state) {
    if (this.state) {
      this.removeClass('state-' + this.state);
    }

    if (state) {
      this.addClass('state-' + state);
    }

    this.state = state;
    this.emit('state', state);

    return this;
  },

  /**
   * Get or set text value of the element
   * @param {string} value The text to set
   * @returns {*}
   */
  text(value) {
    //console.log('text', value);
    if (value) {
      if (this.wrapper.innerText) {
        this.wrapper.innerText = value;
      } else {
        this.wrapper.textContent = value;
      }

      return this;
    }

    return this.wrapper.textContent;
  }
};