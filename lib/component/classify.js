module.exports = {

  /**
   * Init component class
   * @return {Object} This Class instance
   *
   */
  classify(name, options) {

    var classes = ['type', 'state'];

    if (name !== 'component') {
      this.addClass(options.prefix + '-' + this._name);
    }

    if (options.base) {
      this.addClass(options.prefix + '-' + options.base);
    }

    if (this.options.class) {
      this.addClass(this.options.class);
    }

    for (var i = 0; i < classes.length; i++) {
      var name = classes[i];
      if (options[name]) {
        this.addClass(name + '-' + options[name]);
      }
    }

    if (this.options.primary) {
      this.addClass('is-primary');
    }
  },


  /**
   * Check if the element className passed in parameters
   * @param  {string}  className
   * @return {boolean} The result
   */
  hasClass(className) {
    return !!this.element.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
  },

  /**
   * [addClass description]
   * @param {string} className [description]
   */
  addClass(className) {

    if (!this.hasClass(className)) this.element.className += ' ' + className;

    return this;
  },

  /**
   * [removeClass description]
   * @param  {string} className [description]
   * @return {void}           [description]
   */
  removeClass(className) {
    if (this.hasClass(className)) {
      var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
      this.element.className = this.element.className.replace(reg, ' ');
    }
  }
}
